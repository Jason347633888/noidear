import request from './request';

export interface ProcessInstance {
  id: string;
  templateId: string;
  productName: string;
  currentStep: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
}

export interface ProcessStepData {
  id: string;
  instanceId: string;
  stepNumber: number;
  data: Record<string, unknown>;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedById?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  approvalComment?: string;
  submittedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
}

export interface SubmitStepPayload {
  stepNumber: number;
  data: Record<string, unknown>;
  saveAsDraft?: boolean;
}

export interface ApproveStepPayload {
  stepNumber: number;
  action: 'approve' | 'reject';
  comment?: string;
}

export const processApi = {
  getDefaultTemplate: () =>
    request.get<{ id: string; name: string; steps: unknown[] }>('/process/templates/default'),

  listInstances: (params?: { page?: number; limit?: number; status?: string }) =>
    request.get<{ list: ProcessInstance[]; total: number }>('/process/instances', { params }),

  getInstance: (id: string) =>
    request.get<ProcessInstance & { stepDataList: ProcessStepData[] }>(`/process/instances/${id}`),

  createInstance: (templateId: string, productName?: string) =>
    request.post<ProcessInstance>('/process/instances', { templateId, productName }),

  deleteInstance: (id: string) =>
    request.delete(`/process/instances/${id}`),

  getStepData: (instanceId: string, stepNumber: number) =>
    request.get<ProcessStepData>(`/process/instances/${instanceId}/steps/${stepNumber}`),

  submitStep: (instanceId: string, payload: SubmitStepPayload) =>
    request.post<ProcessStepData>(`/process/instances/${instanceId}/steps`, payload),

  approveStep: (instanceId: string, payload: ApproveStepPayload) =>
    request.post<ProcessStepData>(`/process/instances/${instanceId}/approve`, payload),
};
