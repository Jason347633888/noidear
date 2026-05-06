import request from './request';

export interface ManagementReviewInput {
  id: string;
  sourceType: 'audit_report' | 'training_archive';
  sourceId: string;
  department?: string;
  title: string;
  summary: Record<string, unknown>;
  included: boolean;
}

export interface ManagementReviewAction {
  id: string;
  action: string;
  responsibleDepartment: string;
  ownerId?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  verificationNote?: string;
}

export interface ManagementReview {
  id: string;
  companyId: string;
  year: number;
  title: string;
  status: 'draft' | 'input_collection' | 'ready_for_meeting' | 'completed' | 'archived';
  reviewDate?: string;
  location?: string;
  materialDueDate?: string;
  purpose: string;
  scope: string[];
  participants: Record<string, unknown>[];
  inputs: ManagementReviewInput[];
  actions: ManagementReviewAction[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateManagementReviewPayload {
  year: number;
  title: string;
  reviewDate?: string;
  location?: string;
  materialDueDate?: string;
}

export const managementReviewApi = {
  list(params?: { year?: number; status?: string }) {
    return request.get<ManagementReview[]>('/management-reviews', { params });
  },
  create(payload: CreateManagementReviewPayload) {
    return request.post<ManagementReview>('/management-reviews', payload);
  },
  get(id: string) {
    return request.get<ManagementReview>(`/management-reviews/${id}`);
  },
  collectSources(id: string) {
    return request.post<{ auditReports: number; trainingArchives: number }>(`/management-reviews/${id}/collect-sources`);
  },
  createAction(id: string, payload: { action: string; responsibleDepartment: string; ownerId?: string; dueDate?: string }) {
    return request.post<ManagementReviewAction>(`/management-reviews/${id}/actions`, payload);
  },
  updateAction(id: string, actionId: string, payload: { status?: string; verificationNote?: string }) {
    return request.patch<ManagementReviewAction>(`/management-reviews/${id}/actions/${actionId}`, payload);
  },
};
