import request from './request';

// =========================================================================
// Types
// =========================================================================

export type CapaStatus = 'open' | 'implementing' | 'verifying' | 'closed';
export type CapaTriggerType = 'non_conformance' | 'customer_complaint' | 'internal_audit' | 'other';

export interface CorrectiveAction {
  id: string;
  company_id: string;
  capa_no: string;
  trigger_type: CapaTriggerType;
  trigger_id: string | null;
  description: string;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  due_date: string | null;
  responsible_id: string | null;
  status: CapaStatus;
  verified_by: string | null;
  verified_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCapaPayload {
  trigger_type: CapaTriggerType;
  trigger_id?: string;
  description: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  due_date?: string;
  responsible_id?: string;
}

// =========================================================================
// Status / trigger display helpers
// =========================================================================

const CAPA_STATUS_MAP: Record<string, { text: string; type: string }> = {
  open: { text: '待处理', type: 'danger' },
  implementing: { text: '实施中', type: 'warning' },
  verifying: { text: '验证中', type: 'primary' },
  closed: { text: '已关闭', type: 'success' },
};

export function getCapaStatusText(status: string): string {
  return CAPA_STATUS_MAP[status]?.text ?? status;
}

export function getCapaStatusType(status: string): string {
  return CAPA_STATUS_MAP[status]?.type ?? 'info';
}

const CAPA_TRIGGER_TYPE_MAP: Record<string, string> = {
  non_conformance: '不合格品',
  customer_complaint: '顾客投诉',
  internal_audit: '内部审核',
  other: '其他',
};

export function getCapaTriggerTypeText(triggerType: string): string {
  return CAPA_TRIGGER_TYPE_MAP[triggerType] ?? triggerType;
}

// =========================================================================
// API functions
// =========================================================================

const correctiveActionApi = {
  getList(status?: string) {
    return request.get<{ data: CorrectiveAction[]; total?: number }>('/corrective-actions', {
      params: status ? { status } : {},
    });
  },

  create(payload: CreateCapaPayload) {
    return request.post<CorrectiveAction>('/corrective-actions', payload);
  },

  close(id: string) {
    return request.post<CorrectiveAction>(`/corrective-actions/${id}/close`);
  },
};

export default correctiveActionApi;
