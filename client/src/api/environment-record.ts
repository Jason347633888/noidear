import request from './request';

// =========================================================================
// Types
// =========================================================================

export type RecordType = 'temperature_humidity' | 'pressure_differential' | 'other';

export interface EnvironmentRecord {
  id: string;
  company_id: string;
  production_batch_id: string | null;
  location: string;
  record_type: RecordType;
  temperature: number | null;
  humidity: number | null;
  pressure_diff: number | null;
  is_within_spec: boolean;
  abnormal_action: string | null;
  measured_at: string;
  operator_id: string | null;
  created_at: string;
}

export interface CreateEnvironmentRecordPayload {
  location: string;
  record_type: RecordType;
  temperature?: number;
  humidity?: number;
  pressure_diff?: number;
  is_within_spec: boolean;
  abnormal_action?: string;
  production_batch_id?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const RECORD_TYPE_MAP: Record<string, string> = {
  temperature_humidity: '温湿度',
  pressure_differential: '压差',
  other: '其他',
};

export function getRecordTypeText(recordType: string): string {
  return RECORD_TYPE_MAP[recordType] ?? recordType;
}

// =========================================================================
// API functions
// =========================================================================

const environmentRecordApi = {
  getList(startDate?: string, endDate?: string) {
    return request.get<{ data: EnvironmentRecord[]; total?: number }>('/environment-records', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
  },

  create(payload: CreateEnvironmentRecordPayload) {
    return request.post<EnvironmentRecord>('/environment-records', payload);
  },
};

export default environmentRecordApi;
