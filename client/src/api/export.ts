import request from './request';

export interface ExportFilters {
  level?: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  deviationType?: string;
  approverId?: string;
  taskRecordIds?: string[];
  taskId?: string;
  templateId?: string;
  submitterId?: string;
  fields?: string[];
}

export default {
  exportDocuments(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/documents', filters, {
      responseType: 'blob',
    });
  },

  exportTasks(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/tasks', filters, {
      responseType: 'blob',
    });
  },

  exportApprovals(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/approvals', filters, {
      responseType: 'blob',
    });
  },

  exportTaskRecordsByTaskId(taskId: string): Promise<Blob> {
    return request.post(`/export/task-records`, { taskId }, {
      responseType: 'blob',
    });
  },

  exportTaskRecords(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/task-records', filters, {
      responseType: 'blob',
    });
  },

  exportStatistics(type: 'documents' | 'tasks' | 'approvals'): Promise<Blob> {
    return request.get('/statistics/export', {
      params: { type },
      responseType: 'blob',
    });
  },

  exportDeviationReports(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/deviation-reports', filters, {
      responseType: 'blob',
    });
  },

  exportUsers(filters?: { department?: string }): Promise<Blob> {
    return request.post('/export/users', filters ?? {}, {
      responseType: 'blob',
    });
  },
};
