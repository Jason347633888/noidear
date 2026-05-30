import request from './request';

// =========================================================================
// Types
// =========================================================================

export type RetainedSampleType = 'product' | 'material' | 'packaging';
export type RetainedSampleStatus = 'retained' | 'inspecting' | 'disposed';

export interface RetainedSampleInspection {
  id: string;
  retained_sample_id: string;
  inspection_type: string;
  inspection_record_id: string;
  processed_disposition: string | null;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface RetainedSample {
  id: string;
  company_id: string;
  sample_type: RetainedSampleType;
  product_id: string | null;
  material_batch_id: string | null;
  production_batch_id: string | null;
  sample_code: string;
  sample_qty: number;
  unit: string;
  retained_at: string;
  retention_period: string | null;
  expires_at: string | null;
  storage_condition: string | null;
  storage_area_id: string | null;
  status: RetainedSampleStatus;
  disposal_action: string | null;
  disposed_at: string | null;
  appeared_in_source_forms: string[];
  source_form_version: string | null;
  source_form_field_group: string | null;
  created_at: string;
  updated_at: string;
  inspections: RetainedSampleInspection[];
}

export interface CreateRetainedSamplePayload {
  sample_type: RetainedSampleType;
  product_id?: string;
  material_batch_id?: string;
  production_batch_id?: string;
  sample_code: string;
  sample_qty: number;
  unit: string;
  retained_at: string;
  retention_period?: string;
  expires_at?: string;
  storage_condition?: string;
  storage_area_id?: string;
}

export interface DisposeRetainedSamplePayload {
  disposal_action: string;
  disposed_at: string;
}

export interface CreateRetainedSampleInspectionPayload {
  inspection_type: string;
  inspection_record_id: string;
}

export interface ListRetainedSamplesParams {
  page?: number;
  limit?: number;
  sample_type?: RetainedSampleType;
  status?: RetainedSampleStatus;
  production_batch_id?: string;
  material_batch_id?: string;
}

export interface PaginatedRetainedSamples {
  list: RetainedSample[];
  total: number;
  page: number;
  limit: number;
}

// =========================================================================
// API
// =========================================================================

export const retainedSampleApi = {
  getList(params: ListRetainedSamplesParams = {}) {
    return request.get<PaginatedRetainedSamples>('/retained-samples', { params });
  },

  getById(id: string) {
    return request.get<RetainedSample>(`/retained-samples/${id}`);
  },

  create(payload: CreateRetainedSamplePayload) {
    return request.post<RetainedSample>('/retained-samples', payload);
  },

  dispose(id: string, payload: DisposeRetainedSamplePayload) {
    return request.patch<RetainedSample>(`/retained-samples/${id}/dispose`, payload);
  },

  createInspection(id: string, payload: CreateRetainedSampleInspectionPayload) {
    return request.post<{
      sample: RetainedSample;
      sampleInspection: RetainedSampleInspection;
      inspectionRecord: unknown;
    }>(`/retained-samples/${id}/inspections`, payload);
  },
};

export default retainedSampleApi;
