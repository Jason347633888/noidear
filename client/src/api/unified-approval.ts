import request from './request';

export interface ApprovalTask {
  id: string;
  stepKey: string;
  stepName: string;
  approvalMode: string;
  assignmentType: string;
  assigneeUserId?: string;
  assigneeRoleCode?: string;
  assigneeDepartmentId?: string;
  assigneePermissionCode?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  comment?: string;
  actedAt?: string;
  createdAt: string;
}

export interface ApprovalInstance {
  id: string;
  resourceType: string;
  resourceId: string;
  resourceStep?: string;
  title: string;
  status: string;
  tasks: ApprovalTask[];
}

export const unifiedApprovalApi = {
  getInstance: (id: string) =>
    request.get<ApprovalInstance>(`/approval-instances/${id}`),

  getByResource: (resourceType: string, resourceId: string) =>
    request.get<ApprovalInstance[]>(`/approval-instances/by-resource/${resourceType}/${resourceId}`),

  approveTask: (taskId: string, body: { comment?: string }) =>
    request.post(`/approval-tasks/${taskId}/approve`, body),

  rejectTask: (taskId: string, body: { comment: string }) =>
    request.post(`/approval-tasks/${taskId}/reject`, body),

  getMyPending: () =>
    request.get<ApprovalTask[]>('/approval-tasks/my-pending'),
};
