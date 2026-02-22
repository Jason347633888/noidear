import request from '../request';

export interface AuditPlan {
  id: string;
  title: string;
  type: 'quarterly' | 'semiannual' | 'annual';
  startDate: string;
  endDate: string;
  documentIds: string[];
  status: 'draft' | 'ongoing' | 'pending_rectification' | 'completed';
  auditorId: string;
  auditor?: {
    id: string;
    username: string;
    name: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateAuditPlanDto {
  title: string;
  type: 'quarterly' | 'semiannual' | 'annual';
  startDate: string;
  endDate: string;
  documentIds: string[];
  auditorId: string;
}

export interface UpdateAuditPlanDto {
  title?: string;
  type?: 'quarterly' | 'semiannual' | 'annual';
  startDate?: string;
  endDate?: string;
  documentIds?: string[];
  auditorId?: string;
}

export interface QueryAuditPlanDto {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  keyword?: string;
}

// 创建审核计划
export const createAuditPlan = (data: CreateAuditPlanDto) => {
  return request.post<AuditPlan>('/api/v1/audit/plans', data);
};

// 查询审核计划列表
export const queryAuditPlans = (params: QueryAuditPlanDto) => {
  return request.get<{ items: AuditPlan[]; total: number; page: number; limit: number }>(
    '/api/v1/audit/plans',
    { params }
  );
};

// 获取审核计划详情
export const getAuditPlan = (id: string) => {
  return request.get<AuditPlan>(`/api/v1/audit/plans/${id}`);
};

// 更新审核计划
export const updateAuditPlan = (id: string, data: UpdateAuditPlanDto) => {
  return request.put<AuditPlan>(`/api/v1/audit/plans/${id}`, data);
};

// 删除审核计划
export const deleteAuditPlan = (id: string) => {
  return request.delete(`/api/v1/audit/plans/${id}`);
};

// 启动审核计划
export const startAuditPlan = (id: string) => {
  return request.post<AuditPlan>(`/api/v1/audit/plans/${id}/start`);
};

// 复制审核计划
export const copyAuditPlan = (id: string) => {
  return request.post<AuditPlan>(`/api/v1/audit/plans/${id}/copy`);
};

// 获取统计信息
export const getAuditPlanStats = () => {
  return request.get('/api/v1/audit/plans/statistics');
};
