import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface DocumentIssuance {
  id: string;
  company_id: string;
  document_id: string;
  document_name: string;
  document_code: string | null;
  template_id: string | null;
  issued_to: string | null;
  issued_by: string | null;
  quantity: number;
  purpose: string | null;
  issued_at: string;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
  document?: {
    id: string;
    title: string;
    number: string;
    doc_code?: string | null;
    status: string;
    versionNo: number;
  } | null;
}

export interface CreateDocumentIssuancePayload {
  document_id: string;
  document_name?: string;
  document_code?: string;
  template_id?: string;
  issued_to?: string;
  issued_by?: string;
  quantity?: number;
  purpose?: string;
  issued_at?: string;
  notes?: string;
}

// =========================================================================
// API functions
// =========================================================================

const documentIssuanceApi = {
  getList() {
    return request.get<DocumentIssuance[]>('/document-issuances');
  },

  create(payload: CreateDocumentIssuancePayload) {
    return request.post<DocumentIssuance>('/document-issuances', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/document-issuances/${id}`);
  },
};

export default documentIssuanceApi;
