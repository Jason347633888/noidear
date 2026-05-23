import fs from 'node:fs';
import YAML from 'yaml';

const WORKSPACES = new Set(['root', 'client', 'server', 'mobile', 'packages/types']);
const SEVERITIES = new Set(['low', 'moderate']);
const DECISIONS = new Set(['override', 'wait_upstream', 'replace_dependency', 'remove_capability']);
const CODE_PATH = new Set(['yes', 'no', 'unknown']);

export function advisoryIdFromVia(via) {
  if (!via || typeof via !== 'object') return null;
  const match = String(via.url || '').match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i);
  if (match) return match[0];
  if (via.source && via.name) return `npm:${via.source}:${via.name}`;
  if (via.name) return `npm:${via.name}`;
  return null;
}

export function extractAuditItems(auditJson, workspace = 'root') {
  // Emit one item per (advisoryId, workspace, packageName) triple so that
  // joinAuditWithRegister can match each occurrence independently.
  // Using a composite key prevents multiple packages sharing the same advisoryId
  // from being silently collapsed into a single item whose top-level packageName
  // only reflects the first package encountered.
  const items = new Map();
  for (const [packageName, vuln] of Object.entries(auditJson.vulnerabilities || {})) {
    for (const via of vuln.via || []) {
      const advisoryId = advisoryIdFromVia(via);
      if (!advisoryId) continue;
      const tripleKey = `${advisoryId}\0${workspace}\0${packageName}`;
      if (items.has(tripleKey)) continue;
      items.set(tripleKey, {
        advisoryId,
        severity: via.severity || vuln.severity,
        packageName,
        workspace,
        occurrences: [
          {
            workspace,
            packageName,
            // packageChain stores npm audit's via package list. It is not a full npm ls dependency-tree path.
            packageChain: [packageName, ...((vuln.via || []).filter((entry) => typeof entry === 'string'))],
          },
        ],
      });
    }
  }
  return [...items.values()];
}

export function loadRegister(path) {
  if (!fs.existsSync(path)) {
    const err = new Error(`register file not found: ${path}`);
    err.code = 'REGISTER_NOT_FOUND';
    throw err;
  }
  const parsed = YAML.parse(fs.readFileSync(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error('register root must be an object');
  return parsed;
}

function parseDate(str, fieldName, advisoryId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error(`invalid date format for ${fieldName} in ${advisoryId}: must be YYYY-MM-DD`);
  }
  const date = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid ${fieldName} for ${advisoryId}: must be YYYY-MM-DD`);
  }
  // 回检：格式合法但日期不存在（如 2026-02-30 被 JS 自动规范化）
  if (date.toISOString().slice(0, 10) !== str) {
    throw new Error(`non-existent calendar date for ${fieldName} in ${advisoryId}: ${str}`);
  }
  return date;
}

export function validateRegister(register, now = new Date()) {
  const entries = register.entries || [];
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.advisoryId)) throw new Error(`duplicate advisoryId: ${entry.advisoryId}`);
    ids.add(entry.advisoryId);
    if (!SEVERITIES.has(entry.severity)) throw new Error(`invalid severity for ${entry.advisoryId}`);
    if (!DECISIONS.has(entry.decision)) throw new Error(`invalid decision for ${entry.advisoryId}`);
    if (!entry.owner || entry.owner === 'implementation-agent') throw new Error(`invalid owner for ${entry.advisoryId}`);
    if (!Number.isInteger(entry.renewalCount) || entry.renewalCount < 0 || entry.renewalCount > 4) throw new Error(`invalid renewalCount for ${entry.advisoryId}`);
    // SLA rule 1: discoveredAt and nextReviewAt must be valid, existent YYYY-MM-DD dates
    const discovered = parseDate(entry.discoveredAt, 'discoveredAt', entry.advisoryId);
    const review = new Date(`${entry.nextReviewAt}T23:59:59Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.nextReviewAt)) throw new Error(`invalid date format for nextReviewAt in ${entry.advisoryId}: must be YYYY-MM-DD`);
    if (Number.isNaN(review.getTime())) throw new Error(`invalid nextReviewAt for ${entry.advisoryId}: must be YYYY-MM-DD`);
    // 回检：nextReviewAt 非法历法日期（如 2026-02-30）
    if (new Date(`${entry.nextReviewAt}T00:00:00Z`).toISOString().slice(0, 10) !== entry.nextReviewAt) {
      throw new Error(`non-existent calendar date for nextReviewAt in ${entry.advisoryId}: ${entry.nextReviewAt}`);
    }
    if (review < now) throw new Error(`expired nextReviewAt for ${entry.advisoryId}`);
    // SLA rule 2: first registration (renewalCount === 0) → nextReviewAt <= discoveredAt + 7 days
    if (entry.renewalCount === 0) {
      const maxReview = new Date(discovered.getTime() + 7 * 24 * 60 * 60 * 1000);
      maxReview.setUTCHours(23, 59, 59, 999);
      if (review > maxReview) throw new Error(`nextReviewAt exceeds 7-day SLA window from discoveredAt for ${entry.advisoryId}`);
    }
    // SLA rule 3: renewals (renewalCount > 0) → nextReviewAt <= now + 7 days
    if (entry.renewalCount > 0) {
      const maxRenewal = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      maxRenewal.setUTCHours(23, 59, 59, 999);
      if (review > maxRenewal) throw new Error(`nextReviewAt exceeds 7-day SLA renewal window from now for ${entry.advisoryId}`);
    }
    for (const occurrence of entry.occurrences || []) {
      if (!WORKSPACES.has(occurrence.workspace)) throw new Error(`invalid workspace for ${entry.advisoryId}`);
      if (!CODE_PATH.has(occurrence.reachedProjectCodePath)) throw new Error(`invalid reachedProjectCodePath for ${entry.advisoryId}`);
      if (occurrence.reachedProjectCodePath === 'unknown' && entry.renewalCount > 0) throw new Error(`unknown code path past first review for ${entry.advisoryId}`);
    }
  }
  return register;
}

export function joinAuditWithRegister(auditItems, register, now = new Date()) {
  const byId = new Map((register.entries || []).map((entry) => [entry.advisoryId, entry]));
  const results = auditItems.map((item) => {
    const entry = byId.get(item.advisoryId);
    if (!entry) return { ...item, status: 'unregistered' };
    if (['high', 'critical'].includes(item.severity)) return { ...item, status: 'highCriticalNotRegisterable' };
    if (new Date(`${entry.nextReviewAt}T23:59:59Z`) < now) return { ...item, status: 'expired' };
    // Require the specific (advisoryId, workspace, packageName) triple to appear in register occurrences.
    // A new workspace/packageName occurrence is treated as unregistered even if the advisoryId exists.
    const occurrenceMatch = (entry.occurrences || []).some(
      (occ) => occ.workspace === item.workspace && occ.packageName === item.packageName,
    );
    if (!occurrenceMatch) return { ...item, status: 'unregistered' };
    return { ...item, status: 'registered' };
  });
  for (const entry of register.entries || []) {
    if (!auditItems.some((item) => item.advisoryId === entry.advisoryId)) {
      results.push({ advisoryId: entry.advisoryId, severity: entry.severity, status: 'staleRegistered' });
    }
  }
  return results;
}

export function printJsonLine(code, items) {
  process.stderr.write(`${JSON.stringify({ code, items })}\n`);
}
