import request from './request';

// =========================================================================
// Types
// =========================================================================

export type RecordType = 'temperature_humidity' | 'pressure_differential' | 'fridge_temperature' | 'other';

export interface EnvironmentRecord {
  id: string;
  company_id: string;
  production_batch_id: string | null;
  location_id: string | null;
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

export interface CreateEnvironmentRecordRequest {
  productionBatchId?: string;
  locationId?: string;
  location?: string;
  recordType: RecordType;
  temperature?: number;
  humidity?: number;
  pressureDiff?: number;
  isWithinSpec: boolean;
  abnormalAction?: string;
  measuredAt?: string;
  operatorId?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const RECORD_TYPE_MAP: Record<string, string> = {
  temperature_humidity: '温湿度',
  pressure_differential: '压差',
  fridge_temperature: '冷藏温度',
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

  create(payload: CreateEnvironmentRecordRequest) {
    return request.post<EnvironmentRecord>('/environment-records', {
      production_batch_id: payload.productionBatchId,
      location_id: payload.locationId,
      location: payload.location,
      record_type: payload.recordType,
      temperature: payload.temperature,
      humidity: payload.humidity,
      pressure_diff: payload.pressureDiff,
      is_within_spec: payload.isWithinSpec,
      abnormal_action: payload.abnormalAction,
    });
  },
};

export default environmentRecordApi;
