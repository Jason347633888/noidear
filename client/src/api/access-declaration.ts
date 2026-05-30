import request from './request';

// =========================================================================
// Types
// =========================================================================

export type DeclarationType =
  | 'visitor_health'
  | 'visitor_confidentiality'
  | 'visitor_hygiene'
  | 'employee_exit'
  | 'goods_release'
  | 'package_inspection'
  | 'mail_inspection';

export type AccessDeclarationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface AccessDeclaration {
  id: string;
  company_id: string;
  declaration_type: DeclarationType;
  subject_type: string;
  subject_id: string | null;
  subject_snapshot: Record<string, unknown> | null;
  declaration_content: Record<string, unknown>;
  declared_by: string | null;
  declared_at: string;
  evidence_file_id: string | null;
  status: AccessDeclarationStatus;
  approver_id: string | null;
  approved_at: string | null;
  conclusion: string | null;
  opinion: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessDeclarationPayload {
  company_id: string;
  declaration_type: DeclarationType;
  subject_type: string;
  subject_id?: string;
  subject_snapshot?: Record<string, unknown>;
  declaration_content: Record<string, unknown>;
  declared_by?: string;
  declared_at: string;
  evidence_file_id?: string;
}

export interface ApproveAccessDeclarationPayload {
  approver_id: string;
  conclusion: string;
  opinion?: string;
}

// =========================================================================
// API functions
// =========================================================================

const accessDeclarationApi = {
  getList(declarationType?: string, status?: string) {
    return request.get<AccessDeclaration[]>('/access-declarations', {
      params: { declaration_type: declarationType, status },
    });
  },

  getOne(id: string) {
    return request.get<AccessDeclaration>(`/access-declarations/${id}`);
  },

  create(payload: CreateAccessDeclarationPayload) {
    return request.post<AccessDeclaration>('/access-declarations', payload);
  },

  approve(id: string, payload: ApproveAccessDeclarationPayload) {
    return request.patch<AccessDeclaration>(`/access-declarations/${id}/approve`, payload);
  },

  expire(id: string) {
    return request.patch<AccessDeclaration>(`/access-declarations/${id}/expire`, {});
  },

  linkToVisitor(id: string, visitorRecordId: string) {
    return request.post<void>(`/access-declarations/${id}/visitor-links`, {
      visitor_record_id: visitorRecordId,
    });
  },
};

export default accessDeclarationApi;
