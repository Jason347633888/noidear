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

  exportDeviationReports(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/deviation-reports', filters, {
      responseType: 'blob',
    });
  },

  exportApprovals(filters: ExportFilters): Promise<Blob> {
    return request.post('/export/approvals', filters, {
      responseType: 'blob',
    });
  },
};
