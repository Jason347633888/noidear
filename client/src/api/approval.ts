/**
 * 旧 Approval 业务类型保留（仅供测试或历史视图引用），
 * 业务逻辑已统一迁到 `client/src/api/unified-approval.ts`。
 */

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
