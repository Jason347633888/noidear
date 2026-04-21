import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProcessRecord {
  id: string;
  company_id: string;
  production_batch_id: string;
  param_name: string;
  param_value: number | null;
  param_text: string | null;
  unit: string | null;
  is_within_spec: boolean;
  abnormal_action: string | null;
  measured_at: string;
  operator_id: string | null;
  created_at: string;
}

export interface CreateProcessRecordPayload {
  production_batch_id: string;
  param_name: string;
  param_value?: number;
  param_text?: string;
  unit?: string;
  is_within_spec: boolean;
  abnormal_action?: string;
}

// =========================================================================
// API functions
// =========================================================================

const processRecordApi = {
  create(payload: CreateProcessRecordPayload) {
    return request.post<ProcessRecord>('/process-records', payload);
  },

  getByBatch(batchId: string) {
    return request.get<ProcessRecord[]>(`/process-records/batch/${batchId}`);
  },
};

export default processRecordApi;
