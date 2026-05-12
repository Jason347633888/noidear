type DateInput = Date | string | null | undefined;

function toValidDate(input: DateInput): Date | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(input: DateInput, pattern = 'YYYY-MM-DD'): string {
  const date = toValidDate(input);
  if (!date) return '';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return pattern
    .replace('YYYY', String(yyyy))
    .replace('MM', mm)
    .replace('DD', dd)
    .replace('HH', hh)
    .replace('mm', mi)
    .replace('ss', ss);
}

export function formatStatus(status: string | null | undefined, map: Record<string, string>): string {
  if (!status) return '';
  return map[status] ?? status;
}

export function formatDateRange(start: DateInput, end: DateInput): string {
  const startText = formatDate(start);
  const endText = formatDate(end);
  if (startText && endText) return `${startText} ~ ${endText}`;
  if (startText) return `${startText} 起`;
  if (endText) return `至 ${endText}`;
  return '';
}
