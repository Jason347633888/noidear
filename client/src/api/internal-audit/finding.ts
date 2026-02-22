import request from '../request';

export type FindingIssueType = 'needs_modification' | 'missing_record' | 'missing_document';
export type FindingStatus =
  | 'pending'
  | 'rectifying'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export interface AuditFinding {
  id: string;
  planId: string;
  documentId: string;
  document?: {
    id: string;
    title: string;
  };
  result: 'compliant' | 'non_compliant';
  issueType?: FindingIssueType;
  description?: string;
  responsibleDepartment?: string;
  responsiblePersonId?: string;
  responsiblePerson?: {
    id: string;
    name: string;
  };
  rectificationDeadline?: string;
  status: FindingStatus;
  rectifiedDocumentId?: string;
  rectificationComment?: string;
  rectifiedAt?: string;
  verifiedAt?: string;
  verifiedById?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFindingDto {
  planId: string;
  documentId: string;
  result: 'compliant' | 'non_compliant';
  issueType?: FindingIssueType;
  description?: string;
  responsibleDepartment?: string;
  responsiblePersonId?: string;
  rectificationDeadline?: string;
}

export interface UpdateFindingDto {
  result?: 'compliant' | 'non_compliant';
  issueType?: FindingIssueType;
  description?: string;
  responsibleDepartment?: string;
  responsiblePersonId?: string;
  rectificationDeadline?: string;
}

export interface SubmitRectificationDto {
  rectifiedDocumentId: string;
  rectificationComment?: string;
}

export interface VerifyFindingDto {
  comment?: string;
}

export interface RejectFindingDto {
  reason: string;
}

// 创建审核发现
export const createFinding = (data: CreateFindingDto) => {
  return request.post<AuditFinding>('/api/v1/audit/findings', data);
};

// 更新审核发现
export const updateFinding = (id: string, data: UpdateFindingDto) => {
  return request.put<AuditFinding>(`/api/v1/audit/findings/${id}`, data);
};

// 提交审核报告
export const submitAuditReport = (planId: string) => {
  return request.post(`/api/v1/audit/plans/${planId}/submit`);
};

// 撤回审核报告
export const withdrawAuditReport = (planId: string) => {
  return request.post(`/api/v1/audit/plans/${planId}/withdraw`);
};

// 获取我的整改任务
export const getMyRectifications = (params?: { page?: number; limit?: number }) => {
  return request.get<{ items: AuditFinding[]; total: number }>('/api/v1/audit/findings/my-rectifications', { params });
};

// 提交整改
export const submitRectification = (id: string, data: SubmitRectificationDto) => {
  return request.post<AuditFinding>(`/api/v1/audit/findings/${id}/submit-rectification`, data);
};

// 获取待复审任务
export const getPendingVerifications = (params?: { page?: number; limit?: number }) => {
  return request.get<{ items: AuditFinding[]; total: number }>('/api/v1/audit/findings/pending-verification', { params });
};

// 验证整改（通过）
export const verifyFinding = (id: string, data?: VerifyFindingDto) => {
  return request.post<AuditFinding>(`/api/v1/audit/findings/${id}/verify`, data);
};

// 驳回整改
export const rejectFinding = (id: string, data: RejectFindingDto) => {
  return request.post<AuditFinding>(`/api/v1/audit/findings/${id}/reject`, data);
};
