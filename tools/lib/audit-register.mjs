import fs from 'node:fs';
import YAML from 'yaml';

const WORKSPACES = new Set(['root', 'client', 'server', 'mobile', 'packages/types', 'tools/noidear-mcp']);
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
  const items = new Map();
  for (const [packageName, vuln] of Object.entries(auditJson.vulnerabilities || {})) {
    for (const via of vuln.via || []) {
      const advisoryId = advisoryIdFromVia(via);
      if (!advisoryId) continue;
      const current = items.get(advisoryId) || {
        advisoryId,
        severity: via.severity || vuln.severity,
        packageName,
        workspace,
        occurrences: [],
      };
      current.occurrences.push({
        workspace,
        packageName,
        // packageChain stores npm audit's via package list. It is not a full npm ls dependency-tree path.
        packageChain: [packageName, ...((vuln.via || []).filter((entry) => typeof entry === 'string'))],
      });
      items.set(advisoryId, current);
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
    const review = new Date(`${entry.nextReviewAt}T23:59:59Z`);
    if (review < now) throw new Error(`expired nextReviewAt for ${entry.advisoryId}`);
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
