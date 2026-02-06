import request from './request';

export interface CreateApprovalChainDto {
  recordId: string;
}

export interface ApproveDto {
  approvalId: string;
  action: 'approved' | 'rejected';
  comment?: string;
  rejectionReason?: string;
}

export interface Approval {
  id: string;
  recordId: string;
  approverId: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
  comment?: string;
  rejectionReason?: string;
  approvedAt?: string;
  approver?: {
    id: string;
    name: string;
  };
}

export default {
  /**
   * 创建审批链
   */
  createApprovalChain(recordId: string) {
    return request.post<Approval>('/approvals/chains', { recordId });
  },

  /**
   * 一级审批（主管审批）
   */
  approveLevel1(id: string, action: 'approved' | 'rejected', commentOrReason?: string) {
    return request.post<Approval>(`/approvals/level1/${id}/approve`, {
      approvalId: id,
      action,
      ...(action === 'approved' ? { comment: commentOrReason } : { rejectionReason: commentOrReason }),
    });
  },

  /**
   * 二级审批（经理审批）
   */
  approveLevel2(id: string, action: 'approved' | 'rejected', commentOrReason?: string) {
    return request.post<Approval>(`/approvals/level2/${id}/approve`, {
      approvalId: id,
      action,
      ...(action === 'approved' ? { comment: commentOrReason } : { rejectionReason: commentOrReason }),
    });
  },

  /**
   * 获取审批链
   */
  getApprovalChain(recordId: string) {
    return request.get<Approval[]>(`/approvals/chains/${recordId}`);
  },
};
