export const isEmptyValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getObjectText = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') return '';

  const text = (value as Record<string, unknown>)[key];
  return typeof text === 'string' ? text.trim() : '';
};

export const getObjectBoolean = (value: unknown, key: string): boolean => {
  if (!value || typeof value !== 'object') return false;
  return Boolean((value as Record<string, unknown>)[key]);
};
