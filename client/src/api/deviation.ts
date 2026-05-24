import request from './request';

export interface ToleranceFieldConfig {
  fieldName: string;
  toleranceType: 'range' | 'percentage';
  toleranceMin: number;
  toleranceMax: number;
}

export interface DeviationReport {
  id: string;
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

};
