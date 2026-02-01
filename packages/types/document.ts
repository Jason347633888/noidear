// 文档相关类型

export type DocumentLevel = 1 | 2 | 3;

export type DocumentStatus =
  | 'draft'      // 草稿
  | 'pending'    // 待审批
  | 'approved'   // 已发布
  | 'rejected'   // 已驳回
  | 'archived'   // 已归档
  | 'inactive';  // 已停用

export interface Document {
  id: string;
  level: DocumentLevel;
  number: string;
  title: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  version: number;
  status: DocumentStatus;
  creatorId: string;
  creatorName?: string;
  approverId: string | null;
  approverName?: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  creatorId: string;
  creatorName?: string;
  createdAt: string;
}

export interface CreateDocumentDTO {
  level: DocumentLevel;
  title: string;
  file: File;
}

export interface UpdateDocumentDTO {
  title?: string;
  file?: File;
}

export interface DocumentListParams {
  page: number;
  limit: number;
  level: DocumentLevel;
  keyword?: string;
  status?: DocumentStatus;
}

export interface DocumentListResponse {
  list: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmitApprovalDTO {
  documentId: string;
  approverId: string;
}

export interface ApprovalOperationDTO {
  approvalId: string;
  status: 'approved' | 'rejected';
  comment?: string;
}
