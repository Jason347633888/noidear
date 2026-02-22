import request from './request';

export interface LoginLog {
  id: string;
  userId: string;
  username: string;
  action: 'login' | 'logout' | 'login_failed';
  ipAddress: string;
  userAgent: string;
  location?: string;
  loginTime: string;
  logoutTime?: string;
  status: 'success' | 'failed';
  failReason?: string;
  createdAt: string;
}

export interface PermissionLog {
  id: string;
  operatorId: string;
  operatorName: string;
  targetUserId: string;
  targetUsername: string;
  action: 'assign_role' | 'revoke_role' | 'change_department' | 'assign_permission' | 'revoke_permission';
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
  approvedBy?: string;
  approvedByName?: string;
  ipAddress: string;
  createdAt: string;
}

export interface SensitiveLog {
  id: string;
  userId: string;
  username: string;
  action: 'delete_document' | 'export_data' | 'approve' | 'reject' | 'delete_user' | 'reset_password';
  resourceType: 'document' | 'user' | 'role' | 'task' | 'approval';
  resourceId: string;
  resourceName: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface QueryLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  username?: string;
  action?: string;
  status?: string;
  ipAddress?: string;
  resourceType?: string;
  startTime?: string;
  endTime?: string;
  keyword?: string;
}

export interface LoginLogStats {
  totalLogins: number;
  totalFailed: number;
  failureRate: number;
  todayLogins: number;
  todayFailed: number;
}

export interface SensitiveLogStats {
  totalOperations: number;
  byAction: Record<string, number>;
  byResourceType: Record<string, number>;
  todayOperations: number;
}

export interface DashboardStats {
  todayLogins: number;
  todaySensitiveOps: number;
  abnormalLogins: number;
  recentAlerts: number;
}

// 查询登录日志
export const queryLoginLogs = (params: QueryLogsParams) => {
  return request.post<{ items: LoginLog[]; total: number }>('/audit/login-logs/query', params);
};

// 导出登录日志
export const exportLoginLogs = (params: QueryLogsParams) => {
  return request.get('/audit/login-logs/export', {
    params,
    responseType: 'blob',
  });
};

// 获取登录统计
export const getLoginStats = () => {
  return request.get<LoginLogStats>('/audit/login-logs/stats');
};

// 查询权限变更日志
export const queryPermissionLogs = (params: QueryLogsParams) => {
  return request.post<{ items: PermissionLog[]; total: number }>('/audit/permission-logs/query', params);
};

// 导出权限变更日志
export const exportPermissionLogs = (params: QueryLogsParams) => {
  return request.get('/audit/permission-logs/export', {
    params,
    responseType: 'blob',
  });
};

// 查询某用户的权限变更历史
export const getUserPermissionHistory = (userId: string) => {
  return request.get<PermissionLog[]>(`/audit/permission-logs/${userId}`);
};

// 查询敏感操作日志
export const querySensitiveLogs = (params: QueryLogsParams) => {
  return request.post<{ items: SensitiveLog[]; total: number }>('/audit/sensitive-logs/query', params);
};

// 导出敏感操作日志
export const exportSensitiveLogs = (params: QueryLogsParams) => {
  return request.get('/audit/sensitive-logs/export', {
    params,
    responseType: 'blob',
  });
};

// 获取敏感操作统计
export const getSensitiveStats = () => {
  return request.get<SensitiveLogStats>('/audit/sensitive-logs/stats');
};

// 跨日志类型搜索
export const searchLogs = (params: QueryLogsParams) => {
  return request.post<{ loginLogs: LoginLog[]; permissionLogs: PermissionLog[]; sensitiveLogs: SensitiveLog[] }>(
    '/audit/search',
    params,
  );
};

// 获取审计仪表板统计
export const getDashboardStats = () => {
  return request.get<DashboardStats>('/audit/dashboard');
};

// 获取用户操作时间线
export const getUserTimeline = (userId: string, params?: { startTime?: string; endTime?: string }) => {
  return request.get<Array<LoginLog | PermissionLog | SensitiveLog>>(`/audit/timeline/${userId}`, { params });
};

// 生成 BRCGS 审计报告
export const generateBRCGSReport = (params?: { startTime?: string; endTime?: string }) => {
  return request.get('/audit/brcgs-report', {
    params,
    responseType: 'blob',
  });
};
