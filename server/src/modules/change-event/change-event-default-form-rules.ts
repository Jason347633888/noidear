export const RETIRED_CHANGE_FORM_CODES = new Set([
  'GRSS-KF-JL-03', // 产品更改申请表：由 ChangeEvent + ChangeApproval 承载
]);

export const PRODUCT_RND_ONLY_FORM_CODES = new Set([
  'GRSS-KF-JL-01', // 产品开发评审记录：固定挂产品研发流程 Step 4
]);

export const CHANGE_EVENT_DEFAULT_FORM_CODES: Record<string, string[]> = {
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
  const codes = CHANGE_EVENT_DEFAULT_FORM_CODES[changeType] ?? [];
  return codes.filter(
    (code) => !RETIRED_CHANGE_FORM_CODES.has(code) && !PRODUCT_RND_ONLY_FORM_CODES.has(code),
  );
}
