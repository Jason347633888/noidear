import request from './request';

export interface ToleranceFieldConfig {
  fieldName: string;
  toleranceType: 'range' | 'percentage';
  toleranceMin: number;
  toleranceMax: number;
}

export interface DeviationReport {
  id: string;
  taskRecordId: string;
  fieldName: string;
  expectedValue: number;
  actualValue: number;
  deviationValue: number;
  deviationRate: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
  submitter?: { id: string; name: string };
  approver?: { id: string; name: string };
  approvedAt?: string;
  comment?: string;
}

export interface DeviationReportListParams {
  status?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export default {
  /**
   * 获取偏离报告列表
   */
  getDeviationReports(params: DeviationReportListParams) {
    return request.get<{
      items: DeviationReport[];
      total: number;
      page: number;
      pageSize: number;
    }>('/deviation-reports', { params });
  },

  /**
   * 审批偏离报告
   */
  approveDeviationReport(id: string, data: { action: 'approve' | 'reject'; comment?: string }) {
    return request.post(`/deviation-reports/${id}/approve`, data);
  },

  /**
   * 更新模板公差配置
   */
  updateToleranceConfig(templateId: string, data: { fields: ToleranceFieldConfig[] }) {
    return request.put(`/templates/${templateId}/tolerance`, data);
  },

  /**
   * 获取模板公差配置
   */
  getToleranceConfig(templateId: string) {
    return request.get<{ fields: ToleranceFieldConfig[] }>(`/templates/${templateId}/tolerance`);
  },
};
