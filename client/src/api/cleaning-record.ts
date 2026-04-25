import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface CleaningRecord {
  id: string;
  company_id: string;
  target_type: string;
  target_name: string;
  cleaning_method: string | null;
  disinfectant: string | null;
  is_pass: boolean;
  notes: string | null;
  cleaning_date: string;
  operator_id: string | null;
  created_at: string;
}

export interface CreateCleaningRecordPayload {
  target_type: string;
  target_name: string;
  cleaning_method?: string;
  disinfectant?: string;
  is_pass: boolean;
  notes?: string;
}

export const TARGET_TYPE_MAP: Record<string, string> = {
  area: '区域',
  equipment: '设备',
  utensil: '器具',
  facility: '设施',
};

export function getTargetTypeText(type: string): string {
  return TARGET_TYPE_MAP[type] ?? type;
}

// =========================================================================
// API functions
// =========================================================================

const cleaningRecordApi = {
  create(payload: CreateCleaningRecordPayload) {
    return request.post<CleaningRecord>('/cleaning-records', payload);
  },

  getList(targetType?: string) {
    return request.get<{ data: CleaningRecord[]; total?: number }>('/cleaning-records', {
      params: targetType ? { target_type: targetType } : {},
    });
  },
};

export default cleaningRecordApi;
