export const DOCUMENT_TYPES = [
  'MANUAL',
  'PROCEDURE',
  'WORK_INSTRUCTION',
  'RECORD_FORM_INDEX',
  'COMPANY_FILE',
  'EXTERNAL_FILE',
  'AUDIT_REPORT',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SOURCE_FOLDERS = ['01', '02', '03', '04', '05', '06'] as const;
export type SourceFolder = (typeof SOURCE_FOLDERS)[number];

export const DOCUMENT_CONTROL_STATUSES = [
  'draft',
  'pending_review',
  'pending',
  'approved',
  'effective',
  'under_review',
  'archived',
  'obsolete',
  'rejected',
  'inactive',
] as const;

export const CANONICAL_DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  REJECTED: 'rejected',
  EFFECTIVE: 'effective',
  ARCHIVED: 'archived',
  OBSOLETE: 'obsolete',
} as const;

export type CanonicalDocumentStatus =
  typeof CANONICAL_DOCUMENT_STATUS[keyof typeof CANONICAL_DOCUMENT_STATUS];

export const EFFECTIVE_COMPAT_STATUSES = ['effective', 'approved'] as const;

export function isEffectiveCompatible(status: string | null | undefined): boolean {
  return status ? (EFFECTIVE_COMPAT_STATUSES as readonly string[]).includes(status) : false;
}

export function toDisplayStatus(status: string | null | undefined): string {
  return status === 'approved' ? 'effective' : (status || '');
}

export const REFERENCE_TARGET_TYPES = [
  'document',
  'unresolved_document',
  'conflict_document',
  'business_module',
  'business_object',
] as const;

export type ReferenceTargetType = (typeof REFERENCE_TARGET_TYPES)[number];

export const NUMBER_RULE_SCOPES = ['document'] as const;
export type NumberRuleScope = typeof NUMBER_RULE_SCOPES[number];

/**
 * 默认编号生成规则（内部常量，不再开放 NumberRule 用户配置）。
 * 与 `DocumentNumberCounter` 配合使用：counter 提供序号，规则提供格式。
 */
export const DEFAULT_DOCUMENT_NUMBER_RULE = {
  format: '{level}-{departmentCode}-{categoryCode}-{sequence}',
  sequencePadding: 3,
  separator: '-',
} as const;

export const LANDING_STRATEGIES = [
  'business_module',
  'dynamic_form',
  'partial',
  'unimplemented',
  'not_suitable',
] as const;

export const LANDING_STATUSES = [
  'business_module',
  'dynamic_form',
  'partial',
  'unimplemented',
  'not_suitable',
  'conflict',
] as const;

export const LANDING_CONFIRMATION_STATUSES = [
  'unconfirmed',
  'suggested',
  'confirmed',
  'rejected',
] as const;

export const FIELD_COVERAGE_STATUSES = [
  'unknown',
  'covered',
  'partial',
  'missing',
  'not_required',
] as const;

export type LandingStrategy = typeof LANDING_STRATEGIES[number];
export type LandingStatus = typeof LANDING_STATUSES[number];
export type LandingConfirmationStatus = typeof LANDING_CONFIRMATION_STATUSES[number];
export type FieldCoverageStatus = typeof FIELD_COVERAGE_STATUSES[number];

export const DOCUMENT_RELATION_TYPES = [
  'IMPLEMENTS',
  'REQUIRES_RECORD',
  'EVIDENCE_FOR',
  'BASED_ON',
  'REPLACES',
  'RELATED_TO',
  'CONTROLLED_BY',
] as const;

export type DocumentRelationType = (typeof DOCUMENT_RELATION_TYPES)[number];

export const REQUIRED_METADATA_BY_TYPE: Record<DocumentType, string[]> = {
  MANUAL: ['systemScope'],
  PROCEDURE: ['processArea'],
  WORK_INSTRUCTION: ['department'],
  RECORD_FORM_INDEX: ['sourceCode', 'landingStrategy'],
  COMPANY_FILE: ['organizationScope'],
  EXTERNAL_FILE: ['externalSource', 'applicableScope'],
  AUDIT_REPORT: [],
};
