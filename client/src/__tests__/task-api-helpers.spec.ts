/**
 * Unit tests for task API helper functions.
 *
 * These tests verify the lock-state detection, overdue detection,
 * and status display helpers exported from @/api/task.
 */
import { describe, it, expect } from 'vitest';
import {
  isTaskLocked,
  isTaskOverdue,
  getTaskStatusText,
  getTaskStatusType,
  getRecordStatusText,
  getRecordStatusType,
} from '@/api/task';

// ---------------------------------------------------------------------------
// isTaskLocked
// ---------------------------------------------------------------------------
describe('isTaskLocked', () => {
  it('returns true for approved status', () => {
    expect(isTaskLocked('approved')).toBe(true);
  });

  it('returns true for rejected status', () => {
    expect(isTaskLocked('rejected')).toBe(true);
  });

  it('returns true for cancelled status', () => {
    expect(isTaskLocked('cancelled')).toBe(true);
  });

  it('returns false for pending status', () => {
    expect(isTaskLocked('pending')).toBe(false);
  });

  it('returns false for submitted status', () => {
    expect(isTaskLocked('submitted')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTaskLocked('')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(isTaskLocked('unknown')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isTaskOverdue
// ---------------------------------------------------------------------------
describe('isTaskOverdue', () => {
  it('returns true when deadline is in the past and status is pending', () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
    expect(isTaskOverdue(pastDate, 'pending')).toBe(true);
  });

  it('returns false when deadline is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
    expect(isTaskOverdue(futureDate, 'pending')).toBe(false);
  });

  it('returns false for approved status even if past deadline', () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
    expect(isTaskOverdue(pastDate, 'approved')).toBe(false);
  });

  it('returns false for cancelled status even if past deadline', () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
    expect(isTaskOverdue(pastDate, 'cancelled')).toBe(false);
  });

  it('returns false for completed status even if past deadline', () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();
    expect(isTaskOverdue(pastDate, 'completed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getTaskStatusText / getTaskStatusType
// ---------------------------------------------------------------------------
describe('getTaskStatusText', () => {
  it('returns correct text for pending', () => {
    expect(getTaskStatusText('pending')).toBe('待填报');
  });

  it('returns correct text for submitted', () => {
    expect(getTaskStatusText('submitted')).toBe('已提交');
  });

  it('returns correct text for approved', () => {
    expect(getTaskStatusText('approved')).toBe('已通过');
  });

  it('returns correct text for rejected', () => {
    expect(getTaskStatusText('rejected')).toBe('已驳回');
  });

  it('returns correct text for cancelled', () => {
    expect(getTaskStatusText('cancelled')).toBe('已取消');
  });

  it('returns raw status for unknown status', () => {
    expect(getTaskStatusText('xyz')).toBe('xyz');
  });
});

describe('getTaskStatusType', () => {
  it('returns warning for pending', () => {
    expect(getTaskStatusType('pending')).toBe('warning');
  });

  it('returns success for approved', () => {
    expect(getTaskStatusType('approved')).toBe('success');
  });

  it('returns danger for rejected', () => {
    expect(getTaskStatusType('rejected')).toBe('danger');
  });

  it('returns info for unknown status', () => {
    expect(getTaskStatusType('xyz')).toBe('info');
  });
});

// ---------------------------------------------------------------------------
// getRecordStatusText / getRecordStatusType
// ---------------------------------------------------------------------------
describe('getRecordStatusText', () => {
  it('returns correct text for pending', () => {
    expect(getRecordStatusText('pending')).toBe('草稿');
  });

  it('returns correct text for submitted', () => {
    expect(getRecordStatusText('submitted')).toBe('待审批');
  });

  it('returns correct text for approved', () => {
    expect(getRecordStatusText('approved')).toBe('已通过');
  });

  it('returns correct text for rejected', () => {
    expect(getRecordStatusText('rejected')).toBe('已驳回');
  });

  it('returns raw status for unknown', () => {
    expect(getRecordStatusText('xyz')).toBe('xyz');
  });
});

describe('getRecordStatusType', () => {
  it('returns info for pending', () => {
    expect(getRecordStatusType('pending')).toBe('info');
  });

  it('returns warning for submitted', () => {
    expect(getRecordStatusType('submitted')).toBe('warning');
  });

  it('returns success for approved', () => {
    expect(getRecordStatusType('approved')).toBe('success');
  });

  it('returns danger for rejected', () => {
    expect(getRecordStatusType('rejected')).toBe('danger');
  });

  it('returns info for unknown', () => {
    expect(getRecordStatusType('xyz')).toBe('info');
  });
});
