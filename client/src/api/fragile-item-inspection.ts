import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface FragileItemInspection {
  id: string;
  company_id: string;
  production_batch_id: string | null;
  location: string | null;
  item_name: string;
  total_qty: number;
  intact_qty: number;
  is_pass: boolean;
  damage_action: string | null;
  inspected_at: string;
  inspector_id: string | null;
  created_at: string;
}

export interface CreateFragileItemInspectionPayload {
  production_batch_id?: string;
  location?: string;
  item_name: string;
  total_qty: number;
  intact_qty: number;
  is_pass: boolean;
  damage_action?: string;
  inspected_at: string;
  inspector_id?: string;
}

// =========================================================================
// API functions
// =========================================================================

const fragileItemInspectionApi = {
  getList(startDate?: string, endDate?: string) {
    return request.get<FragileItemInspection[]>('/fragile-item-inspections', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
  },

  create(payload: CreateFragileItemInspectionPayload) {
    return request.post<FragileItemInspection>('/fragile-item-inspections', payload);
  },

  remove(id: string) {
    return request.delete(`/fragile-item-inspections/${id}`);
  },
};

export default fragileItemInspectionApi;
