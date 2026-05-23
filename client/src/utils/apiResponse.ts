type ListResponse<T> = T[] | { data?: T[]; list?: T[] } | null | undefined;
type TotalResponse = { total?: number; meta?: { total?: number } } | null | undefined;

export function toList<T>(response: ListResponse<T>): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.list)) {
    return response.list;
  }

  return [];
}

export function toTotal(response: TotalResponse): number {
  if (typeof response?.total === 'number') {
    return response.total;
  }

  if (typeof response?.meta?.total === 'number') {
    return response.meta.total;
  }

  return 0;
}
