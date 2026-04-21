import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface NewRecord {
  id: string;
  templateId: string;
  dataJson: Record<string, unknown>;
  taskInstanceId?: string;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecordDto {
  templateId: string;
  dataJson: Record<string, unknown>;
  taskInstanceId?: string;
}

export interface SubmitRecordDto {
  deviationReasons?: Record<string, string>;
}

export interface SubmitRecordResponse {
  status: 'submitted';
  deviationCount?: number;
  deviations?: DeviationInfo[];
}

export interface DeviationInfo {
  fieldName: string;
  expectedValue: number;
  actualValue: number;
  deviationValue: number;
  deviationRate: number;
  toleranceType: 'range' | 'percentage';
  toleranceMin: number;
  toleranceMax: number;
}

// =========================================================================
// API
// =========================================================================

export const newRecordApi = {
  create(data: CreateRecordDto) {
    return request.post<NewRecord>('/records', data);
  },

  submit(id: string, data?: SubmitRecordDto) {
    return request.post<SubmitRecordResponse>(`/records/${id}/submit`, data || {});
  },
};
