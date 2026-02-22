import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface Record {
  id: string;
  taskId: string;
  templateId: string;
  dataJson: globalThis.Record<string, unknown>;
  submitterId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  submitter?: { id: string; name: string };
  approver?: { id: string; name: string };
  task?: {
    id: string;
    template?: { id: string; title: string };
    department?: { id: string; name: string };
  };
  comment?: string;
  hasDeviation?: boolean;
  deviationCount?: number;
}

export interface RecordChangeLog {
  id: string;
  recordId: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  changer?: { id: string; name: string };
}

export interface RecordListParams {
  page?: number;
  limit?: number;
  taskId?: string;
  status?: string;
  templateId?: string;
}

export interface RecordListResponse {
  list: Record[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmitRecordPayload {
  taskId: string;
  data: globalThis.Record<string, unknown>;
  deviationReasons?: globalThis.Record<string, string>;
}

// =========================================================================
// API
// =========================================================================

export default {
  getRecords(params: RecordListParams = {}) {
    return request.get<RecordListResponse>('/records', { params });
  },

  getRecordById(id: string) {
    return request.get<Record>(`/records/${id}`);
  },

  submitRecord(payload: SubmitRecordPayload) {
    return request.post<Record>('/records', payload);
  },

  updateRecord(id: string, data: globalThis.Record<string, unknown>) {
    return request.put<Record>(`/records/${id}`, { data });
  },

  approveRecord(id: string, action: 'approved' | 'rejected', comment?: string) {
    return request.post(`/records/${id}/approve`, { action, comment });
  },

  getRecordChangeLogs(recordId: string) {
    return request.get<RecordChangeLog[]>(`/records/${recordId}/change-logs`);
  },

  exportRecordPdf(recordId: string) {
    return request.get(`/records/${recordId}/pdf`, { responseType: 'blob' });
  },
};
