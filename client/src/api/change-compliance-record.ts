import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ChangeComplianceRecord {
  id: string;
  company_id: string;
  change_event_id: string;
  assessor_id: string | null;
  legal_compliance: boolean | null;
  safety_impact: string | null;
  risk_level: string | null; // low | medium | high
  conclusion: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateComplianceRecordPayload {
  change_event_id: string;
  assessor_id?: string;
  legal_compliance?: boolean;
  safety_impact?: string;
  risk_level?: string;
  conclusion?: string;
  notes?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const RISK_MAP: Record<string, { text: string; type: string }> = {
  low: { text: '低', type: 'success' },
  medium: { text: '中', type: 'warning' },
  high: { text: '高', type: 'danger' },
};

export function getRiskText(risk: string | null): string {
  if (!risk) return '-';
  return RISK_MAP[risk]?.text ?? risk;
}

export function getRiskType(risk: string | null): string {
  if (!risk) return 'info';
  return RISK_MAP[risk]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const changeComplianceRecordApi = {
  getByEvent(eventId: string) {
    return request.get<ChangeComplianceRecord[]>(`/change-compliance-records/event/${eventId}`);
  },

  create(payload: CreateComplianceRecordPayload) {
    return request.post<ChangeComplianceRecord>('/change-compliance-records', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/change-compliance-records/${id}`);
  },
};

export default changeComplianceRecordApi;
