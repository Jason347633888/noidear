import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface WorkflowStep {
  id?: string;
  name: string;
  type: 'approval' | 'review' | 'countersign';
  assigneeType: 'user' | 'role' | 'department';
  assigneeId: string;
  order: number;
  config?: Record<string, unknown>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  stepsJson: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string };
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  businessType: string;
  businessId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  currentStep: number;
  initiatorId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  template?: WorkflowTemplate;
  initiator?: { id: string; name: string };
  tasks?: WorkflowTask[];
}

export interface WorkflowTask {
  id: string;
  instanceId: string;
  stepIndex: number;
  assigneeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  comment?: string;
  completedAt?: string;
  createdAt: string;
  assignee?: { id: string; name: string };
}

export interface WorkflowTemplateListParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
}

export interface WorkflowInstanceListParams {
  page?: number;
  limit?: number;
  status?: string;
  businessType?: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateWorkflowTemplatePayload {
  name: string;
  description?: string;
  category: string;
  stepsJson: WorkflowStep[];
}

// =========================================================================
// API
// =========================================================================

export default {
  // Template APIs
  getTemplates(params: WorkflowTemplateListParams = {}) {
    return request.get<PaginatedResponse<WorkflowTemplate>>('/workflow-templates', { params });
  },

  getTemplateById(id: string) {
    return request.get<WorkflowTemplate>(`/workflow-templates/${id}`);
  },

  createTemplate(payload: CreateWorkflowTemplatePayload) {
    return request.post<WorkflowTemplate>('/workflow-templates', payload);
  },

  updateTemplate(id: string, payload: Partial<CreateWorkflowTemplatePayload>) {
    return request.put<WorkflowTemplate>(`/workflow-templates/${id}`, payload);
  },

  deleteTemplate(id: string) {
    return request.delete(`/workflow-templates/${id}`);
  },

  publishTemplate(id: string) {
    return request.post(`/workflow-templates/${id}/publish`);
  },

  archiveTemplate(id: string) {
    return request.post(`/workflow-templates/${id}/archive`);
  },

  // Instance APIs
  getInstances(params: WorkflowInstanceListParams = {}) {
    return request.get<PaginatedResponse<WorkflowInstance>>('/workflow-instances', { params });
  },

  getInstanceById(id: string) {
    return request.get<WorkflowInstance>(`/workflow-instances/${id}`);
  },

  startInstance(templateId: string, businessType: string, businessId: string) {
    return request.post<WorkflowInstance>('/workflow-instances', {
      templateId,
      businessType,
      businessId,
    });
  },

  cancelInstance(id: string) {
    return request.post(`/workflow-instances/${id}/cancel`);
  },

  // Task APIs
  getMyTasks(params: { page?: number; limit?: number; status?: string } = {}) {
    return request.get<PaginatedResponse<WorkflowTask>>('/workflow-tasks/my', { params });
  },

  approveTask(taskId: string, comment?: string) {
    return request.post(`/workflow-tasks/${taskId}/approve`, { comment });
  },

  rejectTask(taskId: string, comment: string) {
    return request.post(`/workflow-tasks/${taskId}/reject`, { comment });
  },
};
