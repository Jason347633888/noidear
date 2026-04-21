import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface MetalDetectionLog {
  id: string;
  company_id: string;
  production_batch_id: string;
  fe_ball_spec: string | null;
  sus_ball_spec: string | null;
  al_ball_spec: string | null;
  fe_test_pass: boolean;
  sus_test_pass: boolean;
  al_test_pass: boolean;
  overall_pass: boolean;
  rejection_action: string | null;
  tested_at: string;
  operator_id: string | null;
  created_at: string;
}

export interface CreateMetalDetectionPayload {
  production_batch_id: string;
  fe_ball_spec?: string;
  sus_ball_spec?: string;
  al_ball_spec?: string;
  fe_test_pass: boolean;
  sus_test_pass: boolean;
  al_test_pass: boolean;
  overall_pass: boolean;
  rejection_action?: string;
}

// =========================================================================
// API functions
// =========================================================================

const metalDetectionApi = {
  create(payload: CreateMetalDetectionPayload) {
    return request.post<MetalDetectionLog>('/metal-detections', payload);
  },

  getByBatch(batchId: string) {
    return request.get<MetalDetectionLog[]>(`/metal-detections/batch/${batchId}`);
  },
};

export default metalDetectionApi;
