import request from './request';

export type DocumentType =
  | 'MANUAL'
  | 'PROCEDURE'
  | 'WORK_INSTRUCTION'
  | 'RECORD_FORM_INDEX'
  | 'COMPANY_FILE'
  | 'EXTERNAL_FILE';

export interface DocumentControlDocument {
  id: string;
  number: string;
  title: string;
  level: number;
  status: string;
  doc_code?: string | null;
  version?: number | string;
  versionNo?: number;
  versionLabel?: string;
  document_type?: DocumentType;
  source_folder?: string;
  owner_department?: string;
  ownerDepartmentId?: string | null;
  ownerUserId?: string | null;
  ownerDepartment?: { id: string; name: string; code?: string } | null;
  ownerUser?: { id: string; name: string; username?: string } | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  content_md?: string;
  review_due_date?: string;
  external_expires_at?: string;
  sourceReferences?: DocumentReference[];
  targetReferences?: DocumentReference[];
}

export interface DocumentReference {
  id: string;
  sourceDocId: string;
  targetDocId?: string | null;
  targetType: string;
  targetId?: string | null;
  targetRoute?: string | null;
  targetLabel?: string | null;
  relationType: string;
  sectionId?: string | null;
  wikilinkTarget?: string | null;
  targetDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
  sourceDoc?: { id: string; title: string; status: string; number?: string | null; doc_code?: string | null } | null;
}

export type ReferenceHealthStatus = 'healthy' | 'dangling' | 'unimplemented' | 'invalid' | 'conflict' | 'superseded';

export interface DocumentReferenceHealthIssue {
  sourceDocId: string;
  sourceNumber?: string | null;
  sourceTitle: string;
  referenceId: string;
  label: string;
  status: ReferenceHealthStatus;
  reason: string;
  targetDocId?: string;
  targetTitle?: string;
  supersededById?: string;
  supersededByTitle?: string;
  candidates?: Array<{ id: string; number?: string | null; title: string }>;
}

export interface DocumentReferenceHealthResult {
  totals: Record<ReferenceHealthStatus | 'total', number>;
  issues: DocumentReferenceHealthIssue[];
}

export interface DocumentListResponse {
  list: DocumentControlDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface RecordFormLandingEntry {
  code: string;
  formName: string;
  department: string;
  templateGroupId: string;
  groupName?: string;
  entities: string[];
  chain: string;
  basis: string;
  landingEntry?: {
    targetModule?: string;
    targetModel?: string;
    targetRoute?: string;
    targetTemplateId?: string;
    landingStrategy?: string;
    relatedDocIds?: string[];
    notes?: string;
  } | null;
}

export interface WorkbenchResponse {
  pendingReview: DocumentControlDocument[];
  dueForReview: DocumentControlDocument[];
  expiringExternalFiles: DocumentControlDocument[];
  obsoleteReferences: DocumentReference[];
  brokenReferences: DocumentReference[];
  missingLandingTargets: unknown[];
  missingMetadata: DocumentControlDocument[];
  counts: Record<string, number>;
}

export type WorkbenchIssueType =
  | 'pendingReview'
  | 'dueForReview'
  | 'expiringExternalFiles'
  | 'obsoleteReferences'
  | 'brokenReferences'
  | 'missingLandingTargets'
  | 'unconfirmedLandingTargets'
  | 'partialFieldCoverage'
  | 'unimplementedRecordReferences'
  | 'missingMetadata'
  | 'trainingNeeds'
  | 'openImpactItems';

export interface WorkbenchIssueItem {
  id: string;
  issueType: WorkbenchIssueType;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  sourceRoute: string;
  actionLabel: string;
  actionRoute: string;
  detectedAt: string | null;
}

export interface WorkbenchIssueListResponse {
  type: WorkbenchIssueType;
  items: WorkbenchIssueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const documentControlApi = {
  listDocuments(params?: Record<string, unknown>) {
    return request.get<DocumentListResponse>('/documents', { params });
  },

  getDocument(id: string) {
    return request.get<DocumentControlDocument>(`/documents/${id}`);
  },

  createReference(documentId: string, payload: Partial<DocumentReference>) {
    return request.post(`/documents/${documentId}/references`, payload);
  },

  getReferences(documentId: string) {
    return request.get(`/documents/${documentId}/references`);
  },

  listRecordFormIndex(params?: { keyword?: string; department?: string; templateGroupId?: string }) {
    return request.get<RecordFormLandingEntry[]>('/documents/record-form-index', { params });
  },

  updateRecordFormIndex(code: string, payload: Record<string, unknown>) {
    return request.patch(`/documents/record-form-index/${code}`, payload);
  },

  getRecordFormLandingSuggestion(code: string) {
    return request.get(`/documents/record-form-index/${code}/suggestion`);
  },

  confirmRecordFormLanding(code: string, payload: Record<string, unknown>) {
    return request.post(`/documents/record-form-index/${code}/confirm`, payload);
  },

  batchConfirmRecordFormLanding(codes: string[]) {
    return request.post('/documents/record-form-index/batch-confirm-suggested', { codes });
  },

  getRecordFormFieldCoverage(code: string) {
    return request.get(`/documents/record-form-index/${code}/field-coverage`);
  },

  updateMarkdown(documentId: string, payload: { contentMd: string }) {
    return request.patch(`/documents/${documentId}/markdown`, payload);
  },

  getReferenceHealth(documentId: string) {
    return request.get<DocumentReferenceHealthResult>(`/documents/${documentId}/reference-health`);
  },

  listReferenceHealthIssues() {
    return request.get<DocumentReferenceHealthResult>('/documents/reference-health/issues');
  },

  createRevision(documentId: string) {
    return request.post<DocumentControlDocument>(`/documents/${documentId}/revisions`);
  },
};
