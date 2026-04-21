/**
 * Record API module
 * Maps to backend /records and /record-templates endpoints
 */
import { get, post } from '@/utils/request'
import type { FormField, PaginatedResult } from '@/types'

export interface RecordTemplateItem {
  id: string
  name: string
  code: string
  fields: FormField[]
}

export interface RecordListItem {
  id: string
  number: string
  templateId: string
  templateName: string
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  createdBy: string
  submittedAt: string | null
  createdAt: string
}

export interface RecordListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  templateId?: string
}

export async function fetchTemplates(): Promise<RecordTemplateItem[]> {
  const result = await get<PaginatedResult<RecordTemplateItem>>('/record-templates', {
    page: 1,
    pageSize: 100,
  })
  return result.list
}

export async function fetchRecordList(
  params: RecordListParams = {},
): Promise<PaginatedResult<RecordListItem>> {
  return get<PaginatedResult<RecordListItem>>('/records', params as Record<string, unknown>)
}

export async function fetchRecordDetail(id: string): Promise<RecordListItem> {
  return get<RecordListItem>(`/records/${id}`)
}

export async function submitRecord(
  templateId: string,
  dataJson: Record<string, unknown>,
): Promise<void> {
  await post('/records', { templateId, dataJson })
}
