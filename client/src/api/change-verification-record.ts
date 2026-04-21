import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ChangeVerificationRecord {
  id: string;
  company_id: string;
  change_event_id: string;
  verifier_id: string | null;
  verification_method: string | null;
  result: string | null; // pass | fail | conditional_pass
  findings: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVerificationRecordPayload {
  change_event_id: string;
  verifier_id?: string;
  verification_method?: string;
  result?: string;
  findings?: string;
  notes?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const RESULT_MAP: Record<string, { text: string; type: string }> = {
  pass: { text: '通过', type: 'success' },
  fail: { text: '失败', type: 'danger' },
  conditional_pass: { text: '有条件通过', type: 'warning' },
};

export function getVerificationResultText(result: string | null): string {
  if (!result) return '-';
  return RESULT_MAP[result]?.text ?? result;
}

export function getVerificationResultType(result: string | null): string {
  if (!result) return 'info';
  return RESULT_MAP[result]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const changeVerificationRecordApi = {
  getByEvent(eventId: string) {
    return request.get<ChangeVerificationRecord[]>(`/change-verification-records/event/${eventId}`);
  },

  create(payload: CreateVerificationRecordPayload) {
    return request.post<ChangeVerificationRecord>('/change-verification-records', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/change-verification-records/${id}`);
  },
};

export default changeVerificationRecordApi;
