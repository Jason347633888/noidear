import request from '../request';

export interface AuditReport {
  id: string;
  planId: string;
  plan?: {
    id: string;
    title: string;
    type: 'quarterly' | 'semiannual' | 'annual';
    startDate: string;
    endDate: string;
  };
  pdfUrl?: string;
  totalDocuments: number;
  compliantCount: number;
  nonCompliantCount: number;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryReportDto {
  page?: number;
  limit?: number;
  keyword?: string;
}

// 完成内审计划（生成报告）
export const completeAuditPlan = (planId: string) => {
  return request.post<AuditReport>(`/api/v1/audit/plans/${planId}/complete`);
};

// 查询内审报告列表
export const getReports = (params?: QueryReportDto) => {
  return request.get<{ items: AuditReport[]; total: number }>('/api/v1/audit/reports', { params });
};

// 获取内审报告详情
export const getReport = (id: string) => {
  return request.get<AuditReport>(`/api/v1/audit/reports/${id}`);
};
