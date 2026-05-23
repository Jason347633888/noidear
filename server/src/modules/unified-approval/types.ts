import type { Prisma } from '@prisma/client';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ApprovalTaskStatus = ApprovalStatus;
export type ApprovalActionType = 'APPROVE' | 'REJECT' | 'CLAIM' | 'TRANSFER' | 'CANCEL' | 'COMMENT';
export type ApprovalMode = 'single' | 'countersign_all' | 'countersign_any' | 'sequential' | 'parallel_groups';
export type AssignmentType = 'USER' | 'ROLE' | 'DEPARTMENT_ROLE';
export type ClaimMode = 'DIRECT' | 'CLAIMABLE';
export type RejectPolicy = 'reject_instance' | 'back_to_submitter';

export type ApprovalAssignmentDefinition =
  | { type: 'USER'; userId: string; label?: string }
  | { type: 'ROLE'; roleCode: 'admin' | 'leader' | 'user'; label?: string }
  | { type: 'DEPARTMENT_ROLE'; departmentId: string; roleCode: 'admin' | 'leader' | 'user'; label?: string };

export interface ApprovalStepDefinition {
  stepKey: string;
  stepName: string;
  mode: ApprovalMode;
  assignments: ApprovalAssignmentDefinition[];
  rejectPolicy?: RejectPolicy;
  onApproved: string;
  onRejected?: string;
  dueHours?: number;
}

export interface StartApprovalInput {
  resourceType: string;
  resourceId: string;
  resourceStep?: string;
  triggerKey: string;
  title: string;
  createdById: string;
  tx?: Prisma.TransactionClient;
}

export type ApprovalActionMetadata = Record<string, unknown>;

export interface ApprovalActionValidationContext {
  resourceType: string;
  triggerKey: string;
  stepKey: string;
  action: 'APPROVED' | 'REJECTED';
  comment?: string;
  metadata?: ApprovalActionMetadata;
}

export interface ApprovalCallbackContext {
  tx: Prisma.TransactionClient;
  instanceId: string;
  resourceType: string;
  resourceId: string;
  resourceStep?: string | null;
  triggerKey: string;
  actorId: string;
  taskId?: string;
  comment?: string;
  metadata?: ApprovalActionMetadata;
}

export type ApprovalCallback = (context: ApprovalCallbackContext) => Promise<void>;

export interface ResolvedAssignment {
  assignment: ApprovalAssignmentDefinition;
  assigneeUserIds: string[];
  assigneeRoleCode?: string;
  assigneeDepartmentId?: string;
  claimMode: ClaimMode;
}
