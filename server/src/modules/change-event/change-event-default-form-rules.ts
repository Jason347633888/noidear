export const RETIRED_CHANGE_FORM_CODES = new Set([
  'GRSS-KF-JL-03', // 产品更改申请表：由 ChangeEvent + ChangeApproval 承载
]);

export const PRODUCT_RND_ONLY_FORM_CODES = new Set([
  'GRSS-KF-JL-01', // 产品开发评审记录：固定挂产品研发流程 Step 4
]);

export type ChangeType = 'document' | 'record_form' | 'recipe' | 'process' | 'equipment' | 'supplier' | 'haccp' | 'product' | 'other';

export const CHANGE_EVENT_DEFAULT_FORM_CODES: Record<ChangeType, string[]> = {
  document: [],
  record_form: [],
  recipe: [
    'GRSS-KF-JL-07',
    'GRSS-KF-JL-08',
  ],
  process: [
    'GRSS-KF-JL-08',
    'GRSS-PZ-JL-22',
  ],
  equipment: [
    'GRSS-PZ-JL-45',
  ],
  supplier: [],
  haccp: [
    'GRSS-PZ-JL-22',
  ],
  product: [
    'GRSS-KF-JL-07',
  ],
  other: [],
};

export function getDefaultFormCodesForChangeType(changeType: string): string[] {
  const codes = CHANGE_EVENT_DEFAULT_FORM_CODES[changeType as ChangeType] ?? [];
  return codes.filter(
    (code) => !RETIRED_CHANGE_FORM_CODES.has(code) && !PRODUCT_RND_ONLY_FORM_CODES.has(code),
  );
}

const CHANGE_SCOPE_ALIASES: Record<string, ChangeType> = {
  process_step: 'process',
  oven_temperature: 'process',
  fan_parameter: 'process',
  other_process_parameter: 'process',
};

/** Merge per-scope default form codes into a deduplicated list (preserves first-seen order). Accepts alias scopes via CHANGE_SCOPE_ALIASES. */
export function getDefaultFormCodesForChangeScopes(scopes: string[]): string[] {
  const normalized = scopes.map((scope) => CHANGE_SCOPE_ALIASES[scope] ?? scope);
  return Array.from(
    new Set(normalized.flatMap((scope) => getDefaultFormCodesForChangeType(scope))),
  );
}
