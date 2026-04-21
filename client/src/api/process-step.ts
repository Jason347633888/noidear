import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProcessStep {
  id: string;
  company_id: string;
  product_id?: string;
  recipe_id?: string;
  step_no: number;
  step_name: string;
  description?: string;
  is_ccp: boolean;
  control_measures?: string;
  critical_limit?: string;
  monitoring_method?: string;
  monitoring_frequency?: string;
  corrective_action?: string;
  responsible_person?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProcessStepPayload {
  product_id?: string;
  recipe_id?: string;
  step_no: number;
  step_name: string;
  description?: string;
  is_ccp: boolean;
  control_measures?: string;
  critical_limit?: string;
  monitoring_method?: string;
  monitoring_frequency?: string;
  corrective_action?: string;
  responsible_person?: string;
}

export type UpdateProcessStepPayload = Partial<CreateProcessStepPayload>;

// =========================================================================
// API functions
// =========================================================================

export const processStepApi = {
  getList() {
    return request.get<ProcessStep[]>('/process-steps');
  },

  getByProduct(productId: string) {
    return request.get<ProcessStep[]>(`/process-steps/product/${productId}`);
  },

  getOne(id: string) {
    return request.get<ProcessStep>(`/process-steps/${id}`);
  },

  create(data: CreateProcessStepPayload) {
    return request.post<ProcessStep>('/process-steps', data);
  },

  update(id: string, data: UpdateProcessStepPayload) {
    return request.patch<ProcessStep>(`/process-steps/${id}`, data);
  },

  remove(id: string) {
    return request.delete(`/process-steps/${id}`);
  },
};
