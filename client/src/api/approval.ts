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
  recordId?: string;
  documentId?: string;
  approverId: string;
  level: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting' | 'cancelled';
  comment?: string;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  approvalType?: 'single' | 'countersign' | 'sequential';
  sequence?: number;
  groupId?: string;
  approver?: {
    id: string;
    name: string;
  };
  record?: {
    id: string;
    dataJson?: Record<string, unknown>;
    status?: string;
    submitter?: {
      id: string;
      name: string;
    };
    task?: {
      id: string;
      template?: {
        id: string;
        title: string;
      };
    };
  };
  document?: {
    id: string;
    title?: string;
    number?: string;
    level?: number;
    status?: string;
    creator?: {
      id: string;
      name: string;
    };
  };
}

export interface ApprovalHistoryResponse {
  list: Approval[];
  total: number;
  page: number;
  limit: number;
}

export default {
  /**
   * 创建审批链
   */
  createApprovalChain(recordId: string) {
    return request.post<Approval>('/approvals/chains', { recordId });
  },

  /**
   * 一级审批（主管审批）- 向后兼容
   */
  approveLevel1(id: string, action: 'approved' | 'rejected', commentOrReason?: string) {
    return request.post<Approval>(`/approvals/level1/${id}/approve`, {
      approvalId: id,
      action,
      ...(action === 'approved' ? { comment: commentOrReason } : { rejectionReason: commentOrReason }),
    });
  },

  /**
   * 二级审批（经理审批）- 向后兼容
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

  // ========== New Unified API ==========

  /**
   * 获取当前用户的待审批列表
   */
  getPendingApprovals() {
    return request.get<Approval[]>('/approvals/pending');
  },

  /**
   * 获取审批详情
   */
  getApprovalDetail(id: string) {
    return request.get<Approval>(`/approvals/detail/${id}`);
  },

  /**
   * 获取当前用户的审批历史
   */
  getApprovalHistory(page: number = 1, limit: number = 20) {
    return request.get<ApprovalHistoryResponse>('/approvals/history', {
      params: { page, limit },
    });
  },

  /**
   * 统一审批接口（通过/驳回）
   */
  approveUnified(id: string, action: 'approved' | 'rejected', commentOrReason?: string) {
    return request.post<Approval>(`/approvals/${id}/approve`, {
      approvalId: id,
      action,
      ...(action === 'approved' ? { comment: commentOrReason } : { rejectionReason: commentOrReason }),
    });
  },

  /**
   * 统一驳回接口
   */
  rejectUnified(id: string, rejectionReason: string) {
    return request.post<Approval>(`/approvals/${id}/reject`, {
      approvalId: id,
      action: 'rejected',
      rejectionReason,
    });
  },
};
