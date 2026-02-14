import request from './request';

// =========================================================================
// Types
// =========================================================================

export type TaskStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'overdue';

export interface TaskTemplate {
  id: string;
  title: string;
  fieldsJson: unknown[];
}

export interface TaskDepartment {
  id: string;
  name: string;
}

export interface TaskCreator {
  id: string;
  username: string;
  name: string;
  role: string;
  departmentId: string | null;
}

export interface TaskRecord {
  id: string;
  taskId: string;
  templateId: string;
  dataJson: Record<string, unknown>;
  submitterId: string;
  status: string;
  submittedAt: string;
  approvedAt: string | null;
  submitter?: { name: string } | null;
  approver?: { name: string } | null;
  comment?: string;
  hasDeviation?: boolean;
  deviationCount?: number;
}

export interface Task {
  id: string;
  templateId: string;
  departmentId: string;
  deadline: string;
  status: TaskStatus;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  template: TaskTemplate;
  department: TaskDepartment;
  creator: TaskCreator | null;
  records?: TaskRecord[];
  draftData?: Record<string, unknown>;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  departmentId?: string;
}

export interface TaskListResponse {
  list: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTaskPayload {
  templateId: string;
  departmentId: string;
  deadline: string;
}

export interface UpdateTaskPayload {
  deadline?: string;
  departmentId?: string;
}

export interface SubmitTaskPayload {
  taskId: string;
  data?: Record<string, unknown>;
  deviationReasons?: Record<string, string>;
}

export interface ApproveTaskPayload {
  recordId: string;
  status: 'approved' | 'rejected';
  comment?: string;
}

export interface DraftPayload {
  data: Record<string, unknown>;
}

// =========================================================================
// Lock state helpers
// =========================================================================

const LOCKED_STATUSES: ReadonlySet<string> = new Set([
  'approved',
  'rejected',
  'cancelled',
]);

export function isTaskLocked(status: string): boolean {
  return LOCKED_STATUSES.has(status);
}

export function isTaskOverdue(deadline: string, status: string): boolean {
  if (status === 'completed' || status === 'cancelled' || status === 'approved') {
    return false;
  }
  return new Date(deadline) < new Date();
}

// =========================================================================
// Status display helpers
// =========================================================================

const STATUS_MAP: Record<string, { text: string; type: string }> = {
  pending: { text: '待填报', type: 'warning' },
  submitted: { text: '已提交', type: 'info' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
  overdue: { text: '已逾期', type: 'danger' },
};

export function getTaskStatusText(status: string): string {
  return STATUS_MAP[status]?.text ?? status;
}

export function getTaskStatusType(status: string): string {
  return STATUS_MAP[status]?.type ?? 'info';
}

const RECORD_STATUS_MAP: Record<string, { text: string; type: string }> = {
  pending: { text: '草稿', type: 'info' },
  submitted: { text: '待审批', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};

export function getRecordStatusText(status: string): string {
  return RECORD_STATUS_MAP[status]?.text ?? status;
}

export function getRecordStatusType(status: string): string {
  return RECORD_STATUS_MAP[status]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

export default {
  /**
   * 获取任务列表
   */
  getTasks(params: TaskListParams = {}) {
    return request.get<TaskListResponse>('/tasks', { params });
  },

  /**
   * 获取任务详情
   */
  getTaskById(id: string) {
    return request.get<Task>(`/tasks/${id}`);
  },

  /**
   * 创建任务
   */
  createTask(payload: CreateTaskPayload) {
    return request.post<Task>('/tasks', payload);
  },

  /**
   * 更新任务
   */
  updateTask(id: string, payload: UpdateTaskPayload) {
    return request.put<Task>(`/tasks/${id}`, payload);
  },

  /**
   * 提交任务（兼容旧接口）
   */
  submitTask(payload: SubmitTaskPayload) {
    return request.post<TaskRecord>('/tasks/submit', payload);
  },

  /**
   * 提交任务（RESTful 方式）
   */
  submitTaskById(id: string, data?: Record<string, unknown>, deviationReasons?: Record<string, string>) {
    return request.post<TaskRecord>(`/tasks/${id}/submit`, { data, deviationReasons });
  },

  /**
   * 取消任务
   */
  cancelTask(id: string) {
    return request.post(`/tasks/${id}/cancel`);
  },

  /**
   * 保存草稿
   */
  saveDraft(id: string, payload: DraftPayload) {
    return request.post<TaskRecord>(`/tasks/${id}/draft`, payload);
  },

  /**
   * 审批任务
   */
  approveTask(payload: ApproveTaskPayload) {
    return request.post('/tasks/approve', payload);
  },
};
