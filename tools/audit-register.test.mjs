import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advisoryIdFromVia,
  validateRegister,
  joinAuditWithRegister,
} from './lib/audit-register.mjs';

test('extracts GHSA advisory id from npm audit via URL', () => {
  assert.equal(
    advisoryIdFromVia({ source: 123, name: 'vite', url: 'https://github.com/advisories/GHSA-abcd-efgh-ijkl' }),
    'GHSA-abcd-efgh-ijkl',
  );
});

test('falls back to npm source and name when GHSA URL is absent', () => {
  assert.equal(advisoryIdFromVia({ source: 123, name: 'vite' }), 'npm:123:vite');
  assert.equal(advisoryIdFromVia({ name: 'vite' }), 'npm:vite');
});

test('rejects high severity register entries', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'high',
      occurrences: [],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /severity/);
});

test('flags unknown code path after renewal', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{
        workspace: 'client',
        packageName: 'vite',
        packageChain: ['vite'],
        reachedProjectCodePath: 'unknown',
      }],
      currentBlocker: 'No stable fix',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 1,
      owner: '@owner',
      notes: '需 code-path 调查 + 下次复核完成 for client/vite',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /unknown/);
});

test('treats audit item as unregistered when advisoryId matches but workspace differs', () => {
  // Register has the advisory for "server" workspace only.
  // Audit reports the same advisoryId appearing in "client" workspace.
  // Expected: the client occurrence is NOT covered by the server registration.
  const joined = joinAuditWithRegister(
    [{ advisoryId: 'GHSA-abcd-efgh-ijkl', severity: 'moderate', packageName: 'some-pkg', workspace: 'client' }],
    {
      entries: [{
        advisoryId: 'GHSA-abcd-efgh-ijkl',
        severity: 'moderate',
        occurrences: [{
          workspace: 'server',
          packageName: 'some-pkg',
          packageChain: ['some-pkg'],
          reachedProjectCodePath: 'no',
        }],
        currentBlocker: 'none',
        decision: 'wait_upstream',
        discoveredAt: '2026-05-14',
        nextReviewAt: '2026-05-21',
        renewalCount: 0,
        owner: '@owner',
        notes: 'registered only for server workspace',
      }],
    },
    new Date('2026-05-14T00:00:00Z'),
  );
  assert.equal(joined[0].status, 'unregistered');
});

test('joins audit items against register states', () => {
  const joined = joinAuditWithRegister(
    [{ advisoryId: 'GHSA-abcd-efgh-ijkl', severity: 'moderate', packageName: 'vite', workspace: 'client' }],
    {
      entries: [{
        advisoryId: 'GHSA-abcd-efgh-ijkl',
        severity: 'moderate',
        occurrences: [{
          workspace: 'client',
          packageName: 'vite',
          packageChain: ['vite'],
          reachedProjectCodePath: 'no',
        }],
        currentBlocker: 'No stable fix',
        decision: 'wait_upstream',
        discoveredAt: '2026-05-14',
        nextReviewAt: '2026-05-21',
        renewalCount: 0,
        owner: '@owner',
        notes: 'No project path reached',
      }],
    },
    new Date('2026-05-14T00:00:00Z'),
  );
  assert.equal(joined[0].status, 'registered');
});

// N3: non-existent calendar dates must be rejected
test('rejects non-existent calendar date for discoveredAt (2026-02-30)', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-02-30',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /non-existent calendar date.*discoveredAt|discoveredAt.*non-existent/);
});

test('accepts valid existent date for discoveredAt (2026-05-15)', () => {
  assert.doesNotThrow(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-15',
      nextReviewAt: '2026-05-22',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')));
});

// SLA rule 1: discoveredAt and nextReviewAt must be valid YYYY-MM-DD dates
test('accepts valid YYYY-MM-DD dates for discoveredAt and nextReviewAt', () => {
  assert.doesNotThrow(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')));
});

test('rejects invalid discoveredAt date', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: 'not-a-date',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /discoveredAt/);
});

test('rejects invalid nextReviewAt date', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: 'not-a-date',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /nextReviewAt/);
});

// SLA rule 2: renewalCount === 0 → nextReviewAt <= discoveredAt + 7 days
test('accepts nextReviewAt exactly 7 days after discoveredAt when renewalCount is 0', () => {
  assert.doesNotThrow(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')));
});

test('rejects nextReviewAt more than 7 days after discoveredAt when renewalCount is 0', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-22',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /nextReviewAt.*7/);
});

// SLA rule 3: renewalCount > 0 → nextReviewAt <= now + 7 days
test('accepts nextReviewAt within 7 days of now when renewalCount > 0', () => {
  assert.doesNotThrow(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-07',
      nextReviewAt: '2026-05-21',
      renewalCount: 1,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')));
});

test('rejects nextReviewAt more than 7 days from now when renewalCount > 0', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-07',
      nextReviewAt: '2026-05-22',
      renewalCount: 1,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /nextReviewAt.*7/);
});

// SLA rule 4: renewalCount > 4 must be rejected
test('rejects renewalCount of 5 or more', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 5,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /renewalCount/);
});

// N1: same advisoryId, one package registered, another not
test('marks occurrence as unregistered when same advisoryId but different packageName is not in register', () => {
  // Register only covers 'vite' for 'client' workspace.
  // Audit reports both 'vite' and 'new-pkg' sharing the same GHSA advisory.
  // Expected: 'vite' → registered, 'new-pkg' → unregistered.
  const auditItems = [
    { advisoryId: 'GHSA-abcd-efgh-ijkl', severity: 'moderate', packageName: 'vite', workspace: 'client' },
    { advisoryId: 'GHSA-abcd-efgh-ijkl', severity: 'moderate', packageName: 'new-pkg', workspace: 'client' },
  ];
  const register = {
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{
        workspace: 'client',
        packageName: 'vite',
        packageChain: ['vite'],
        reachedProjectCodePath: 'no',
      }],
      currentBlocker: 'No stable fix',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'registered for vite only',
    }],
  };
  const joined = joinAuditWithRegister(auditItems, register, new Date('2026-05-14T00:00:00Z'));
  const viteResult = joined.find((r) => r.packageName === 'vite');
  const newPkgResult = joined.find((r) => r.packageName === 'new-pkg');
  assert.equal(viteResult.status, 'registered', 'vite should be registered');
  assert.equal(newPkgResult.status, 'unregistered', 'new-pkg should be unregistered');
});

test('accepts renewalCount of 4 (maximum allowed)', () => {
  assert.doesNotThrow(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{ workspace: 'root', packageName: 'pkg', packageChain: ['pkg'], reachedProjectCodePath: 'no' }],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-04-09',
      nextReviewAt: '2026-05-21',
      renewalCount: 4,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')));
});
