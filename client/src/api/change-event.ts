import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ChangeVerificationRecord {
  id: string;
  company_id: string;
  change_event_id: string;
  verification_date: string;
  result: string; // 'pass'|'fail'|'partial'
  description: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChangeEvent {
  id: string;
  company_id: string;
  change_no: string;
  title: string;
  change_type: string; // 'personnel'|'process'|'equipment'|'formula'|'facility'
  description: string;
  risk_level: string; // 'low'|'medium'|'high'
  status: string; // 'draft'|'approved'|'verified'|'closed'
  initiated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  verifications: ChangeVerificationRecord[];
}

export interface CreateChangeEventPayload {
  title: string;
  change_type: string;
  description: string;
  risk_level?: string;
}

export interface CreateVerificationPayload {
  verification_date: string;
  result: string;
  description?: string;
  verified_by?: string;
}

// =========================================================================
// Status / risk display helpers
// =========================================================================

const STATUS_MAP: Record<string, { text: string; type: string }> = {
  draft: { text: '草稿', type: 'info' },
  approved: { text: '已审批', type: 'success' },
  verified: { text: '已验证', type: 'primary' },
  closed: { text: '已关闭', type: '' },
};

export function getStatusText(status: string): string {
  return STATUS_MAP[status]?.text ?? status;
}

export function getStatusType(status: string): string {
  return STATUS_MAP[status]?.type ?? 'info';
}

const RISK_MAP: Record<string, { text: string; type: string }> = {
  low: { text: '低', type: 'success' },
  medium: { text: '中', type: 'warning' },
  high: { text: '高', type: 'danger' },
};

export function getRiskText(risk: string): string {
  return RISK_MAP[risk]?.text ?? risk;
}

export function getRiskType(risk: string): string {
  return RISK_MAP[risk]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const changeEventApi = {
  getList() {
    return request.get<ChangeEvent[]>('/change-events');
  },

  create(payload: CreateChangeEventPayload) {
    return request.post<ChangeEvent>('/change-events', payload);
  },

  approve(id: string) {
    return request.post<ChangeEvent>(`/change-events/${id}/approve`);
  },

  createVerification(id: string, payload: CreateVerificationPayload) {
    return request.post<ChangeVerificationRecord>(
      `/change-events/${id}/verifications`,
      payload,
    );
  },

  getVerifications(id: string) {
    return request.get<ChangeVerificationRecord[]>(
      `/change-events/${id}/verifications`,
    );
  },
};

export default changeEventApi;
