// 任务相关类型

export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskRecordStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface Task {
  id: string;
  templateId: string;
  templateTitle?: string;
  departmentId: string;
  departmentName?: string;
  deadline: string;
  status: TaskStatus;
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface TaskRecord {
  id: string;
  taskId: string;
  templateId: string;
  dataJson: Record<string, unknown>;
  status: TaskRecordStatus;
  submitterId: string | null;
  submitterName?: string;
  submittedAt: string | null;
  approverId: string | null;
  approverName?: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateTaskDTO {
  templateId: string;
  departmentId: string;
  deadline: string;
}

export interface TaskListParams {
  page: number;
  limit: number;
  status?: TaskStatus;
  departmentId?: string; // 部门负责人查看本部门任务
}

export interface TaskListResponse {
  list: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmitTaskDTO {
  taskId: string;
  data: Record<string, unknown>;
}

export interface CancelTaskDTO {
  taskId: string;
}
