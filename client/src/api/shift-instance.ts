import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ShiftInstance {
  id: string;
  shift_type: string;
  shift_date: string;
  status: 'open' | 'closed';
  notes?: string;
  production_runs: ProductionRunSummary[];
  created_at: string;
  closed_at?: string;
}

export interface ProductionRunSummary {
  id: string;
  production_line: string;
  status: 'active' | 'closed';
  started_at: string;
  product: { id: string; name: string };
}

export interface CreateShiftInstancePayload {
  shift_type: string;
  shift_date: string;
  notes?: string;
}

// =========================================================================
// API functions
// =========================================================================

export const ShiftInstanceApi = {
  create(data: CreateShiftInstancePayload) {
    return request.post<ShiftInstance>('/shift-instances', data);
  },

  list(date?: string) {
    return request.get<ShiftInstance[]>('/shift-instances', {
      params: date ? { date } : {},
    });
  },

  findOne(id: string) {
    return request.get<ShiftInstance>(`/shift-instances/${id}`);
  },

  close(id: string, notes?: string) {
    return request.patch<ShiftInstance>(`/shift-instances/${id}/close`, { notes });
  },
};
