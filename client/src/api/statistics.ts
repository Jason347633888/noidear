import request from './request';

export interface StatisticsFilter {
  period?: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface DocumentStats {
  total: number;
  byType: { name: string; value: number }[];
  byDepartment: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
}

export interface UserStats {
  total: number;
  byDepartment: { name: string; value: number }[];
  byRole: { name: string; value: number }[];
}

export interface WorkflowStats {
  total: number;
  avgDuration: number;
  timeoutRate: number;
  passRate: number;
  trend: { date: string; avgDuration: number }[];
}

export interface EquipmentStats {
  total: number;
  goodRate: number;
  repairRate: number;
  faultRate: number;
}

export default {
  getDocumentStats(filter: StatisticsFilter): Promise<DocumentStats> {
    return request.get('/statistics/documents', { params: filter });
  },

  getUserStats(filter: StatisticsFilter): Promise<UserStats> {
    return request.get('/statistics/users', { params: filter });
  },

  getWorkflowStats(filter: StatisticsFilter): Promise<WorkflowStats> {
    return request.get('/statistics/workflow', { params: filter });
  },

  getEquipmentStats(filter: StatisticsFilter): Promise<EquipmentStats> {
    return request.get('/statistics/equipment', { params: filter });
  },
};
