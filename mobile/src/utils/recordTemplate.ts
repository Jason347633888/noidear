import type { FormField, PaginatedResult } from '@/types'

type BackendTemplatePage = {
  data?: unknown[]
  list?: unknown[]
  total?: number
  page?: number
  limit?: number
  pageSize?: number
  totalPages?: number
}

type TemplateLike = {
  id?: string
  name?: string
  code?: string
  description?: string
  status?: string
  fields?: FormField[]
  fieldsJson?: { fields?: FormField[] } | FormField[]
}

export interface NormalizedRecordTemplate {
  id: string
  name: string
  code: string
  description: string
  status: string
  fields: FormField[]
  sourceGroup: string
}

export function extractTemplateFields(template: TemplateLike): FormField[] {
  if (Array.isArray(template.fields)) return template.fields
  if (Array.isArray(template.fieldsJson)) return template.fieldsJson
  if (Array.isArray((template.fieldsJson as { fields?: FormField[] } | undefined)?.fields)) {
    return (template.fieldsJson as { fields: FormField[] }).fields
  }
  return []
}

export function getTemplateSourceGroup(template: Pick<TemplateLike, 'description'>): string {
  const description = template.description?.trim()
  if (!description) return '未分组'
  const [source] = description.split(' — ')
  return source.trim() || '未分组'
}

export function normalizeTemplate(input: unknown): NormalizedRecordTemplate {
  const template = input as TemplateLike
  return {
    id: String(template.id || ''),
    name: String(template.name || ''),
    code: String(template.code || ''),
    description: String(template.description || ''),
    status: String(template.status || ''),
    fields: extractTemplateFields(template),
    sourceGroup: getTemplateSourceGroup(template),
  }
}

export function normalizeTemplatePage(page: BackendTemplatePage): PaginatedResult<NormalizedRecordTemplate> {
  const rawList = Array.isArray(page.data) ? page.data : Array.isArray(page.list) ? page.list : []
  const pageSize = page.pageSize ?? page.limit ?? rawList.length

  return {
    list: rawList.map(normalizeTemplate),
    total: page.total ?? rawList.length,
    page: page.page ?? 1,
    pageSize,
  }
}

export function sortTemplatesWithPinned<T extends { id: string; name?: string }>(items: T[], pinnedIds: string[]): T[] {
  const pinned = new Set(pinnedIds)
  return [...items].sort((left, right) => {
    const leftPinned = pinned.has(left.id)
    const rightPinned = pinned.has(right.id)
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
    return String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN')
  })
}
