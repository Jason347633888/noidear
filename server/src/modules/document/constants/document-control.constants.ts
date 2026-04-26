export const DOCUMENT_TYPES = [
  'MANUAL',
  'PROCEDURE',
  'WORK_INSTRUCTION',
  'RECORD_FORM_INDEX',
  'COMPANY_FILE',
  'EXTERNAL_FILE',
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

export const REFERENCE_TARGET_TYPES = [
  'document',
  'record_template',
  'record_list',
  'business_module',
  'business_object',
  'external_file',
  'company_file',
] as const;

export type ReferenceTargetType = (typeof REFERENCE_TARGET_TYPES)[number];

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
};
