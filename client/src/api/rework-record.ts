import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ReworkRecord {
  id: string;
  company_id: string;
  production_batch_id: string;
  nc_id: string | null;
  rework_reason: string;
  rework_qty: number;
  unit: string;
  rework_process: string | null;
  rework_date: string;
  operator_id: string | null;
  quality_verdict: string;
  verdict_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReworkRecordPayload {
  production_batch_id: string;
  nc_id?: string;
  rework_reason: string;
  rework_qty: number;
  unit: string;
  rework_process?: string;
  rework_date: string;
  operator_id?: string;
  quality_verdict: string;
  verdict_by?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const VERDICT_MAP: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
};

export function getVerdictText(verdict: string): string {
  return VERDICT_MAP[verdict] ?? verdict;
}

// =========================================================================
// API functions
// =========================================================================

const reworkRecordApi = {
  getList(startDate?: string, endDate?: string) {
    return request.get<{ data: ReworkRecord[]; total?: number }>('/rework-records', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
  },

  create(payload: CreateReworkRecordPayload) {
    return request.post<ReworkRecord>('/rework-records', payload);
  },

  remove(id: string) {
    return request.delete(`/rework-records/${id}`);
  },
};

export default reworkRecordApi;
