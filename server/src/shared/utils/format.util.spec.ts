import { formatDate, formatDateRange, formatStatus } from './format.util';

describe('format.util', () => {
  it('formats Date and ISO string as YYYY-MM-DD by default', () => {
    expect(formatDate(new Date('2026-05-12T08:10:00.000Z'))).toBe('2026-05-12');
    expect(formatDate('2026-05-12T08:10:00.000Z')).toBe('2026-05-12');
  });

  it('returns empty string for nullish or invalid date input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });

  it('formats date range and tolerates missing boundaries', () => {
    expect(formatDateRange(new Date('2026-05-01'), new Date('2026-05-12'))).toBe('2026-05-01 ~ 2026-05-12');
    expect(formatDateRange(null, new Date('2026-05-12'))).toBe('至 2026-05-12');
    expect(formatDateRange(new Date('2026-05-01'), null)).toBe('2026-05-01 起');
    expect(formatDateRange(null, null)).toBe('');
  });

  it('formats status through caller-owned map and falls back to original status', () => {
    expect(formatStatus('approved', { approved: '已批准' })).toBe('已批准');
    expect(formatStatus('unknown', { approved: '已批准' })).toBe('unknown');
    expect(formatStatus('', { approved: '已批准' })).toBe('');
  });
});
