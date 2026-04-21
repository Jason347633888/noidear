import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface RecordTaskAssignment {
  id: string;
  title: string;
  templateId: string;
  template?: { id: string; name: string };
  departmentId: string;
  department?: { id: string; name: string };
  isPeriodic: boolean;
  periodType?: 'daily' | 'weekly' | 'monthly' | null;
  periodConfig?: Record<string, unknown> | null;
  status: 'active' | 'paused' | 'closed';
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordTaskInstance {
  id: string;
  assignmentId: string;
  assignment?: RecordTaskAssignment;
  deadline: string;
  status: 'pending' | 'submitted' | 'overdue';
  createdAt: string;
}

export interface CreateAssignmentDto {
  title: string;
  templateId: string;
  departmentId: string;
  isPeriodic: boolean;
  periodType?: 'daily' | 'weekly' | 'monthly';
  periodConfig?: Record<string, unknown>;
  deadline?: string;
}

export interface AssignmentListResponse {
  list: RecordTaskAssignment[];
  total: number;
  page: number;
  limit: number;
}

export interface InstanceListResponse {
  list: RecordTaskInstance[];
  total: number;
  page: number;
  limit: number;
}

// =========================================================================
// API
// =========================================================================

export const assignmentApi = {
  getList(params?: { page?: number; limit?: number }) {
    return request.get<AssignmentListResponse>('/record-task-assignments', { params });
  },

  getById(id: string) {
    return request.get<RecordTaskAssignment>(`/record-task-assignments/${id}`);
  },

  create(data: CreateAssignmentDto) {
    return request.post<RecordTaskAssignment>('/record-task-assignments', data);
  },

  pause(id: string) {
    return request.post(`/record-task-assignments/${id}/pause`);
  },

  resume(id: string) {
    return request.post(`/record-task-assignments/${id}/resume`);
  },

  close(id: string) {
    return request.post(`/record-task-assignments/${id}/close`);
  },
};

export const instanceApi = {
  getPending(params?: { page?: number; limit?: number }) {
    return request.get<InstanceListResponse>('/record-task-instances/pending', { params });
  },

  getById(id: string) {
    return request.get<RecordTaskInstance>(`/record-task-instances/${id}`);
  },
};
