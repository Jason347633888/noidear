import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface LineChangeCheckRecord {
  id: string;
  company_id: string;
  check_date: string;
  production_line: string | null;
  product_from: string | null;
  product_to: string | null;
  allergen_cleared: boolean;
  equipment_cleaned: boolean;
  utensils_replaced: boolean;
  labels_updated: boolean;
  packaging_cleared: boolean;
  raw_materials_cleared: boolean;
  inspector_id: string | null;
  supervisor_ok: boolean;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateLineChangeCheckRecordPayload {
  check_date?: string;
  production_line?: string;
  product_from?: string;
  product_to?: string;
  allergen_cleared?: boolean;
  equipment_cleaned?: boolean;
  utensils_replaced?: boolean;
  labels_updated?: boolean;
  packaging_cleared?: boolean;
  raw_materials_cleared?: boolean;
  inspector_id?: string;
  supervisor_ok?: boolean;
  notes?: string;
}

// =========================================================================
// API functions
// =========================================================================

const lineChangeCheckRecordApi = {
  getList() {
    return request.get<LineChangeCheckRecord[]>('/line-change-check-records');
  },

  create(payload: CreateLineChangeCheckRecordPayload) {
    return request.post<LineChangeCheckRecord>('/line-change-check-records', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/line-change-check-records/${id}`);
  },
};

export default lineChangeCheckRecordApi;
