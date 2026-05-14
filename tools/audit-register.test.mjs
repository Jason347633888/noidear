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
