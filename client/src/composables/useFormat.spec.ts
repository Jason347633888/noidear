import { describe, expect, it } from 'vitest';
import { useFormat } from './useFormat';

describe('useFormat', () => {
  it('formats date string and handles empty input', () => {
    const { formatDate } = useFormat();
    expect(formatDate('2026-05-12T08:10:00.000Z')).toBe('2026-05-12');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('bad-date')).toBe('');
  });

  it('formats status with caller map and falls back to original value', () => {
    const { formatStatus } = useFormat();
    expect(formatStatus('open', { open: '待整改' })).toBe('待整改');
    expect(formatStatus('unknown', { open: '待整改' })).toBe('unknown');
  });
});
