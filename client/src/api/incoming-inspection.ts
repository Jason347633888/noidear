import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface InspectionResult {
  item_name: string;
  actual_value?: string;
  is_pass: boolean;
}

export interface IncomingInspection {
  id: string;
  material_batch_id: string;
  overall_result: string;
  sample_qty: number | null;
  sample_unit: string | null;
  disposition: string | null;
  notes: string | null;
  inspected_at: string;
  inspector_id: string | null;
  results: InspectionResult[];
  material_batch?: {
    id: string;
    lot_number: string;
    material?: { id: string; name: string; code: string };
    supplier?: { id: string; name: string };
  };
}

export interface CreateInspectionPayload {
  material_batch_id: string;
  overall_result: string;
  sample_qty?: number;
  sample_unit?: string;
  disposition?: string;
  notes?: string;
  results: InspectionResult[];
}

// =========================================================================
// Display helpers
// =========================================================================

export const OVERALL_RESULT_MAP: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
  conditional_pass: '有条件合格',
};

export function getOverallResultText(result: string): string {
  return OVERALL_RESULT_MAP[result] ?? result;
}

export function getOverallResultTagType(result: string): 'success' | 'danger' | 'warning' {
  if (result === 'pass') return 'success';
  if (result === 'fail') return 'danger';
  return 'warning';
}

// =========================================================================
// API functions
// =========================================================================

const incomingInspectionApi = {
  getList() {
    return request.get<IncomingInspection[]>('/incoming-inspections');
  },

  create(payload: CreateInspectionPayload) {
    return request.post<IncomingInspection>('/incoming-inspections', payload);
  },

  getByBatch(batchId: string) {
    return request.get<IncomingInspection[]>(`/incoming-inspections/batch/${batchId}`);
  },
};

export default incomingInspectionApi;
