#!/usr/bin/env node
import { loadRegister, printJsonLine, validateRegister } from './lib/audit-register.mjs';

const registerPath = process.argv[2] || 'docs/superpowers/specs/2026-05-14-audit-risk-register.yaml';

try {
  const register = loadRegister(registerPath);
  validateRegister(register);
  printJsonLine(0, []);
  process.exit(0);
} catch (error) {
  if (error.code === 'REGISTER_NOT_FOUND') {
    printJsonLine(3, [{ status: 'registerMissing', message: error.message }]);
    process.exit(3);
  }
  printJsonLine(2, [{ status: 'schemaInvalid', message: error.message }]);
  process.exit(2);
}
