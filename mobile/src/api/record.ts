/**
 * Record API module.
 * Uses backend /records and /record-templates; H5 and PC share the same data source.
 */
import { get, post } from '@/utils/request'
import type { FormField, PaginatedResult } from '@/types'
import { normalizeTemplatePage, type NormalizedRecordTemplate } from '@/utils/recordTemplate'

export type RecordTemplateItem = NormalizedRecordTemplate

export interface RecordListItem {
  id: string
  templateId: string
  number: string
  status: string
  dataJson: Record<string, unknown>
  createdBy: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RecordListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  templateId?: string
}

export async function fetchTemplates(): Promise<RecordTemplateItem[]> {
  const result = await get<unknown>('/record-templates', {
    page: 1,
    limit: 1000,
    status: 'active',
  })
  return normalizeTemplatePage(result as Parameters<typeof normalizeTemplatePage>[0]).list
}

export async function fetchRecordList(
  params: RecordListParams = {},
): Promise<PaginatedResult<RecordListItem>> {
  const { pageSize, ...rest } = params
  const query: Record<string, unknown> = { ...rest }
  if (pageSize !== undefined) query.limit = pageSize

  const result = await get<PaginatedResult<RecordListItem> | { data: RecordListItem[]; total: number; page: number; limit: number }>(
    '/records',
    query,
  )

  if ('data' in result && Array.isArray(result.data)) {
    return {
      list: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    }
  }

  return result as PaginatedResult<RecordListItem>
}

export async function fetchRecordDetail(id: string): Promise<RecordListItem> {
  return get<RecordListItem>(`/records/${id}`)
}

export async function submitRecord(
  templateId: string,
  dataJson: Record<string, unknown>,
): Promise<RecordListItem> {
  return post<RecordListItem>('/records', {
    templateId,
    dataJson,
    offlineFilled: false,
  })
}
