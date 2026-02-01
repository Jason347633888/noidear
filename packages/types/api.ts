// API 响应类型

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    departmentId: string | null;
  };
}

export interface ApprovalHistory {
  id: string;
  documentId: string;
  approverId: string;
  approverName: string;
  status: 'approved' | 'rejected';
  comment: string | null;
  createdAt: string;
}

// 审批相关
export interface PendingApproval {
  id: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  documentLevel: number;
  creatorId: string;
  creatorName: string;
  createdAt: string;
}

// 消息相关
export interface Notification {
  id: string;
  userId: string;
  type: 'task' | 'approval' | 'reminder';
  title: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  list: Notification[];
  total: number;
  unreadCount: number;
}

// 部门相关
export interface Department {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parentName?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DepartmentListResponse {
  list: Department[];
  total: number;
}

// 编号规则
export interface NumberRule {
  id: string;
  level: number;
  departmentId: string;
  departmentName?: string;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

// 审批
export interface Approval {
  id: string;
  documentId: string;
  recordId: string | null;
  approverId: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment: string | null;
  createdAt: string;
}

export interface ApprovalListResponse {
  list: Approval[];
  total: number;
}

// 操作日志
export interface OperationLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  module: string;
  objectId: string;
  objectType: string;
  details: Record<string, unknown> | null;
  ip: string;
  createdAt: string;
}

export interface OperationLogListResponse {
  list: OperationLog[];
  total: number;
}
