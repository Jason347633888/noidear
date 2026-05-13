import request from './request';

export interface ProcessInstance {
  id: string;
  templateId: string;
  productName: string;
  productId?: string;
  currentStep: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
  stepData?: ProcessStepData[];
}

export interface ProcessStepData {
  id: string;
  instanceId: string;
  stepNumber: number;
  data: Record<string, unknown>;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedById?: string;
  submittedAt?: string;
  submittedBy?: { id: string; name: string };
  approvedById?: string;
  approvedAt?: string;
  approvedBy?: { id: string; name: string };
  approvalComment?: string;
  approvalInstanceId?: string;
}

export interface ProcessStepApproval {
  id: string;
  instanceId: string;
  stepNumber: number;
  approverId?: string;
  approver?: { id: string; name: string };
  department: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  signedAt?: string;
}

export interface RawMaterial {
  id: string;
  materialCode: string;
  name: string;
  ingredientInfo?: string;
  qtyPerBatch?: number;
  unit?: string;
}

export interface RecipeLine {
  materialId: string;
  materialCode: string;
  materialName: string;
  qtyPerBatch: number;
  unit: string;
  isCritical?: boolean;
  notes?: string;
}

export const processApi = {
  getDefaultTemplate: () =>
    request.get<{ id: string; name: string; steps: unknown[] }>('/process/templates/default'),

  listInstances: () =>
    request.get<ProcessInstance[]>('/process/instances'),

  getInstance: (id: string) =>
    request.get<ProcessInstance & { stepDataList?: ProcessStepData[] }>(`/process/instances/${id}`),

  createInstance: (templateId: string, productName?: string, productId?: string) =>
    request.post<ProcessInstance>('/process/instances', { templateId, productName, productId }),

  deleteInstance: (id: string) =>
    request.delete(`/process/instances/${id}`),

  submitStep: (instanceId: string, payload: { stepNumber: number; data: Record<string, unknown>; saveAsDraft?: boolean }) =>
    request.post(`/process/instances/${instanceId}/steps`, payload),

};
