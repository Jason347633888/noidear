#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  extractAuditItems,
  joinAuditWithRegister,
  loadRegister,
  printJsonLine,
  validateRegister,
} from './lib/audit-register.mjs';

const registerPath = 'docs/superpowers/specs/2026-05-14-audit-risk-register.yaml';

try {
  const register = validateRegister(loadRegister(registerPath));
  let auditJson;
  try {
    const output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    auditJson = JSON.parse(output);
  } catch (error) {
    // npm audit exits non-zero both for found vulnerabilities (exit 1, valid JSON)
    // and for network/registry/auth errors (exit non-zero, may be error JSON or empty).
    // We must distinguish valid audit output from tool errors to avoid false negatives.
    const rawOutput = error.stdout || '';
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      printJsonLine(2, [{ status: 'auditToolError', message: `npm audit produced non-JSON output: ${rawOutput.slice(0, 200)}` }]);
      process.exit(2);
    }
    // A top-level "error" field indicates a registry/auth/network failure, not an audit result.
    if (parsed && typeof parsed === 'object' && parsed.error) {
      printJsonLine(2, [{ status: 'auditToolError', message: `npm audit reported an error: ${JSON.stringify(parsed.error).slice(0, 200)}` }]);
      process.exit(2);
    }
    // A valid audit JSON must contain either "vulnerabilities" or "auditReportVersion".
    if (!parsed || typeof parsed !== 'object' || (!parsed.vulnerabilities && !parsed.auditReportVersion)) {
      printJsonLine(2, [{ status: 'auditToolError', message: `npm audit output is not a valid audit report (missing vulnerabilities/auditReportVersion): ${rawOutput.slice(0, 200)}` }]);
      process.exit(2);
    }
    auditJson = parsed;
  }

  const auditItems = extractAuditItems(auditJson, 'root');
  const joined = joinAuditWithRegister(auditItems, register);
  const failures = joined.filter((item) => ['unregistered', 'expired', 'highCriticalNotRegisterable'].includes(item.status));
  const warnings = joined.filter((item) => item.status === 'staleRegistered');
  if (failures.length > 0) {
    printJsonLine(1, failures);
    process.exit(1);
  }
  printJsonLine(0, warnings);
  process.exit(0);
} catch (error) {
  if (error.code === 'REGISTER_NOT_FOUND') {
    printJsonLine(3, [{ status: 'registerMissing', message: error.message }]);
    process.exit(3);
  }
  printJsonLine(2, [{ status: 'invalidAuditOrRegister', message: error.message }]);
  process.exit(2);
}
