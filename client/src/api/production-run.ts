import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProductionRun {
  id: string;
  shift_instance_id: string;
  production_line: string;
  status: 'active' | 'closed';
  started_at: string;
  closed_at?: string;
  actual_yield?: number;
  yield_unit?: string;
  notes?: string;
  product: { id: string; name: string };
  recipe?: { id: string; version: number; status: string };
}

export interface CreateProductionRunPayload {
  shift_instance_id: string;
  production_line: string;
  product_id: string;
  recipe_id?: string;
}

export interface CloseProductionRunPayload {
  actual_yield?: number;
  yield_unit?: string;
  notes?: string;
}

// =========================================================================
// API functions
// =========================================================================

export const ProductionRunApi = {
  create(data: CreateProductionRunPayload) {
    return request.post<ProductionRun>('/production-runs', data);
  },

  listByShift(shiftInstanceId: string) {
    return request.get<ProductionRun[]>('/production-runs', {
      params: { shiftInstanceId },
    });
  },

  close(id: string, data: CloseProductionRunPayload) {
    return request.patch<ProductionRun>(`/production-runs/${id}/close`, data);
  },
};
