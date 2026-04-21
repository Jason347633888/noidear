import request from './request';

// =========================================================================
// Types
// =========================================================================

export type NcStatus = 'open' | 'dispositioned' | 'closed';
export type NcSourceType = 'material_batch' | 'production_batch' | 'product';
export type NcDisposition = 'rework' | 'destroy' | 'concession' | 'return';

export interface NonConformance {
  id: string;
  company_id: string;
  nc_no: string;
  source_type: NcSourceType;
  source_id: string;
  nc_type: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  discovered_at: string;
  discovered_by: string | null;
  disposition: NcDisposition | null;
  disposition_by: string | null;
  disposition_at: string | null;
  status: NcStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateNcPayload {
  source_type: NcSourceType;
  source_id: string;
  description: string;
  nc_type?: string;
  qty?: number;
  unit?: string;
  disposition?: string;
}

export interface DisposeNcPayload {
  disposition: NcDisposition;
}

// =========================================================================
// Status / disposition display helpers
// =========================================================================

const NC_STATUS_MAP: Record<string, { text: string; type: string }> = {
  open: { text: '待处置', type: 'danger' },
  dispositioned: { text: '已处置', type: 'warning' },
  closed: { text: '已关闭', type: 'success' },
};

export function getNcStatusText(status: string): string {
  return NC_STATUS_MAP[status]?.text ?? status;
}

export function getNcStatusType(status: string): string {
  return NC_STATUS_MAP[status]?.type ?? 'info';
}

const NC_DISPOSITION_MAP: Record<string, string> = {
  rework: '返工',
  destroy: '销毁',
  concession: '让步接收',
  return: '退货',
};

export function getNcDispositionText(disposition: string | null): string {
  if (!disposition) return '-';
  return NC_DISPOSITION_MAP[disposition] ?? disposition;
}

const NC_SOURCE_TYPE_MAP: Record<string, string> = {
  material_batch: '原料批次',
  production_batch: '生产批次',
  product: '成品',
};

export function getNcSourceTypeText(sourceType: string): string {
  return NC_SOURCE_TYPE_MAP[sourceType] ?? sourceType;
}

// =========================================================================
// API functions
// =========================================================================

const nonConformanceApi = {
  getList(status?: string) {
    return request.get<NonConformance[]>('/non-conformances', {
      params: status ? { status } : {},
    });
  },

  create(payload: CreateNcPayload) {
    return request.post<NonConformance>('/non-conformances', payload);
  },

  dispose(id: string, payload: DisposeNcPayload) {
    return request.patch<NonConformance>(`/non-conformances/${id}/dispose`, payload);
  },
};

export default nonConformanceApi;
