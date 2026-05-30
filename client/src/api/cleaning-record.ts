import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface CleaningRecord {
  id: string;
  company_id: string;
  target_type: string;
  target_name: string;
  area_point_id: string | null;
  equipment_id: string | null;
  cleaning_plan_id: string | null;
  is_pass: boolean;
  status: string;
  notes: string | null;
  cleaning_date: string;
  operator_id: string | null;
  verifier_id: string | null;
  items: CleaningRecordItem[];
  created_at: string;
}

export interface CleaningRecordItem {
  id: string;
  record_id: string;
  plan_item_id: string | null;
  target_name: string;
  target_type: string;
  method_snapshot: string | null;
  requires_disinfection: boolean;
  completed: boolean;
  completed_at: string | null;
  actual_concentration: string | null;
  sanitizer_check_id: string | null;
  result: 'pending' | 'pass' | 'fail';
  remark: string | null;
  evidence_file_id: string | null;
  created_at: string;
}

export interface CreateCleaningRecordPayload {
  target_type: string;
  target_name: string;
  is_pass: boolean;
  notes?: string;
}

export interface CreateFromPlanPayload {
  area_point_id: string;
  cleaning_date: string;
  company_id?: string;
}

export interface CompleteItemPayload {
  result: 'pass' | 'fail';
  remark?: string;
  actual_concentration?: number;
  sanitizer_check_id?: string;
  evidence_file_id?: string;
}

export const TARGET_TYPE_MAP: Record<string, string> = {
  area: '区域',
  equipment: '设备',
  utensil: '器具',
  facility: '设施',
};

export const RESULT_MAP: Record<string, string> = {
  pending: '待完成',
  pass: '合格',
  fail: '不合格',
};

export const STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  verified: '已验证',
  rejected: '已驳回',
};

export function getTargetTypeText(type: string): string {
  return TARGET_TYPE_MAP[type] ?? type;
}

export function getResultText(result: string): string {
  return RESULT_MAP[result] ?? result;
}

export function getStatusText(status: string): string {
  return STATUS_MAP[status] ?? status;
}

// =========================================================================
// API functions
// =========================================================================

const cleaningRecordApi = {
  create(payload: CreateCleaningRecordPayload) {
    return request.post<CleaningRecord>('/cleaning-records', payload);
  },

  createFromPlan(payload: CreateFromPlanPayload) {
    return request.post<CleaningRecord>('/cleaning-records/from-plan', payload);
  },

  getList(targetType?: string) {
    return request.get<{ data: CleaningRecord[]; total?: number }>('/cleaning-records', {
      params: targetType ? { target_type: targetType } : {},
    });
  },

  completeItem(recordId: string, itemId: string, payload: CompleteItemPayload) {
    return request.patch<CleaningRecordItem>(
      `/cleaning-records/${recordId}/items/${itemId}/complete`,
      payload,
    );
  },

  submit(recordId: string) {
    return request.post<CleaningRecord>(`/cleaning-records/${recordId}/submit`, {});
  },

  verify(recordId: string, pass: boolean) {
    return request.post<CleaningRecord>(`/cleaning-records/${recordId}/verify`, { pass });
  },

  createNonConformance(recordId: string, itemId: string, ncNo: string) {
    return request.post<{ id: string; nc_no: string }>(
      `/cleaning-records/${recordId}/items/${itemId}/non-conformance`,
      { nc_no: ncNo },
    );
  },
};

export default cleaningRecordApi;
