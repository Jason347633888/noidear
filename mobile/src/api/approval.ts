/**
 * Approval API module
 * Maps to backend /approvals endpoints (audit workflow)
 */
import { get, post } from '@/utils/request'
import type { PaginatedResult } from '@/types'

export interface ApprovalItem {
  id: string
  recordId: string
  recordNumber: string
  templateName: string
  submittedBy: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
}

export interface ApprovalListParams {
  page?: number
  pageSize?: number
  status?: string
}

export async function fetchMyApprovals(
  params: ApprovalListParams = {},
): Promise<PaginatedResult<ApprovalItem>> {
  return get<PaginatedResult<ApprovalItem>>('/approvals/my', params as Record<string, unknown>)
}

export async function approveRecord(
  approvalId: string,
  comment?: string,
): Promise<void> {
  await post(`/approvals/${approvalId}/approve`, { comment })
}

export async function rejectRecord(
  approvalId: string,
  comment: string,
): Promise<void> {
  await post(`/approvals/${approvalId}/reject`, { comment })
}
