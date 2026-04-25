import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface CcpPoint {
  id: string;
  company_id: string;
  process_step_id: string;
  ccp_no: string;
  hazard_type: string;
  control_measure: string;
  critical_limit: string;
  cl_min: number | null;
  cl_max: number | null;
  cl_unit: string | null;
  monitoring_method: string | null;
  monitoring_frequency: string | null;
  corrective_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface CcpRecord {
  id: string;
  company_id: string;
  production_batch_id: string;
  ccp_point_id: string;
  ccp_point: CcpPoint;
  measured_value: number | null;
  measured_text: string | null;
  unit: string | null;
  is_within_cl: boolean;
  deviation_action: string | null;
  operator_id: string;
  monitored_at: string;
  created_at: string;
}

export interface CreateCcpRecordPayload {
  production_batch_id: string;
  ccp_point_id: string;
  measured_value?: number;
  measured_text?: string;
  unit?: string;
  is_within_cl: boolean;
  deviation_action?: string;
}

// =========================================================================
// API functions
// =========================================================================

const ccpApi = {
  createRecord(payload: CreateCcpRecordPayload) {
    return request.post<CcpRecord>('/ccp/records', payload);
  },

  getRecordsByBatch(batchId: string) {
    return request.get<{ data: CcpRecord[]; total?: number }>(`/ccp/records/batch/${batchId}`);
  },

  getMissingCCPs(batchId: string) {
    return request.get<{ data: CcpPoint[]; total?: number }>(`/ccp/records/missing/${batchId}`);
  },
};

export default ccpApi;
