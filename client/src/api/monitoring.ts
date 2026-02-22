import request from './request';

export interface SystemMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metricType: 'system' | 'application' | 'business';
  tags?: Record<string, string>;
  timestamp: string;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  metricName: string;
  condition: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  notifyChannels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName?: string;
  metricValue: number;
  triggeredAt: string;
  resolvedAt?: string;
  status: 'triggered' | 'resolved' | 'acknowledged';
  message: string;
  notifiedUsers?: string[];
  createdAt: string;
}

export interface QueryMetricsParams {
  metricName?: string;
  metricType?: 'system' | 'application' | 'business';
  startTime?: string;
  endTime?: string;
  aggregation?: 'minute' | 'hour' | 'day';
  limit?: number;
}

export interface QueryAlertHistoryParams {
  page?: number;
  limit?: number;
  ruleId?: string;
  status?: 'triggered' | 'resolved' | 'acknowledged';
  startTime?: string;
  endTime?: string;
}

export interface CreateAlertRuleDto {
  name: string;
  metricName: string;
  condition: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  notifyChannels: string[];
}

export interface UpdateAlertRuleDto {
  name?: string;
  condition?: '>' | '<' | '>=' | '<=' | '==';
  threshold?: number;
  severity?: 'info' | 'warning' | 'critical';
  notifyChannels?: string[];
}

// 查询历史指标
export const queryMetrics = (params: QueryMetricsParams) => {
  return request.get<SystemMetric[]>('/monitoring/metrics/query', { params });
};

// 获取可用指标列表
export const getAvailableMetrics = () => {
  return request.get<Array<{ name: string; type: string; description: string }>>('/monitoring/metrics/available');
};

// 创建告警规则
export const createAlertRule = (data: CreateAlertRuleDto) => {
  return request.post<AlertRule>('/monitoring/alerts/rules', data);
};

// 查询告警规则列表
export const queryAlertRules = (params?: { page?: number; limit?: number; enabled?: boolean; severity?: string }) => {
  return request.get<{ items: AlertRule[]; total: number }>('/monitoring/alerts/rules', { params });
};

// 获取告警规则详情
export const getAlertRule = (id: string) => {
  return request.get<AlertRule>(`/monitoring/alerts/rules/${id}`);
};

// 更新告警规则
export const updateAlertRule = (id: string, data: UpdateAlertRuleDto) => {
  return request.put<AlertRule>(`/monitoring/alerts/rules/${id}`, data);
};

// 删除告警规则
export const deleteAlertRule = (id: string) => {
  return request.delete(`/monitoring/alerts/rules/${id}`);
};

// 启用/禁用告警规则
export const toggleAlertRule = (id: string, enabled: boolean) => {
  return request.post(`/monitoring/alerts/rules/${id}/toggle`, { enabled });
};

// 查询告警历史
export const queryAlertHistory = (params: QueryAlertHistoryParams) => {
  return request.get<{ items: AlertHistory[]; total: number }>('/monitoring/alerts/history', { params });
};

// 确认告警
export const acknowledgeAlert = (id: string) => {
  return request.post(`/monitoring/alerts/history/${id}/acknowledge`);
};
