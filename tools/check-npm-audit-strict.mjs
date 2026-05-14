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
    const output = error.stdout || '{}';
    auditJson = JSON.parse(output);
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
