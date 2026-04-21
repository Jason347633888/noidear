import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ChangeApproval {
  id: string;
  company_id: string;
  change_event_id: string;
  approver_id: string | null;
  decision: string | null; // approved | rejected | pending
  comments: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateChangeApprovalPayload {
  change_event_id: string;
  approver_id?: string;
  decision?: string;
  comments?: string;
  approved_at?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const DECISION_MAP: Record<string, { text: string; type: string }> = {
  approved: { text: '批准', type: 'success' },
  rejected: { text: '拒绝', type: 'danger' },
  pending: { text: '待定', type: 'warning' },
};

export function getDecisionText(decision: string | null): string {
  if (!decision) return '-';
  return DECISION_MAP[decision]?.text ?? decision;
}

export function getDecisionType(decision: string | null): string {
  if (!decision) return 'info';
  return DECISION_MAP[decision]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const changeApprovalApi = {
  getByEvent(eventId: string) {
    return request.get<ChangeApproval[]>(`/change-approvals/event/${eventId}`);
  },

  create(payload: CreateChangeApprovalPayload) {
    return request.post<ChangeApproval>('/change-approvals', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/change-approvals/${id}`);
  },
};

export default changeApprovalApi;
