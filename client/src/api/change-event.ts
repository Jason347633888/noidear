import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ChangeEventRelation {
  id: string;
  targetType: string;
  targetId?: string | null;
  targetRoute?: string | null;
  targetLabel: string;
  relationType?: string | null;
  impactLevel: string;
  requiredAction?: string | null;
  status: string;
}

export interface ChangeEvent {
  id: string;
  company_id: string;
  change_no: string;
  title: string;
  change_type: string; // 'recipe'|'process'|'equipment'|'supplier'|'other'
  description: string;
  status: string; // 'draft'|'compliance_review'|'verification'|'approval'|'approved'|'rejected'
  initiator_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  relations?: ChangeEventRelation[];
}

export interface CreateChangeEventPayload {
  change_type: string;
  title: string;
  description: string;
  initiator_id?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const CHANGE_TYPE_MAP: Record<string, string> = {
  recipe: '配方变更',
  process: '工艺变更',
  supplier: '供应商变更',
  equipment: '设备变更',
  document: '文件变更',
  record_form: '记录表单变更',
  product: '产品变更',
  haccp: 'HACCP变更',
  other: '其他',
};

export function getChangeTypeText(type: string): string {
  return CHANGE_TYPE_MAP[type] ?? type;
}

const STATUS_MAP: Record<string, { text: string; type: string }> = {
  draft: { text: '草稿', type: 'info' },
  compliance_review: { text: '合规评估中', type: 'warning' },
  verification: { text: '验证中', type: 'warning' },
  approval: { text: '待审批', type: 'warning' },
  approved: { text: '已批准', type: 'success' },
  rejected: { text: '已拒绝', type: 'danger' },
};

export function getStatusText(status: string): string {
  return STATUS_MAP[status]?.text ?? status;
}

export function getStatusType(status: string): string {
  return STATUS_MAP[status]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const changeEventApi = {
  getList() {
    return request.get<ChangeEvent[]>('/change-events');
  },

  getOne(id: string) {
    return request.get<ChangeEvent>(`/change-events/${id}`);
  },

  create(payload: CreateChangeEventPayload) {
    return request.post<ChangeEvent>('/change-events', payload);
  },

  updateStatus(id: string, status: string) {
    return request.patch<ChangeEvent>(`/change-events/${id}/status`, { status });
  },

  remove(id: string) {
    return request.delete<void>(`/change-events/${id}`);
  },
};

export default changeEventApi;
