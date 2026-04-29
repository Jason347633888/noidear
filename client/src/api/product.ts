import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface Product {
  id: string;
  code: string;
  name: string;
  spec?: string;
  net_weight?: number;
  weight_unit?: string;
  status: string;
  source?: 'rd_process' | 'legacy_import' | 'manual_admin';
}

export interface LegacyProductLinePayload {
  material_id: string;
  qty_per_batch: number;
  unit: string;
  is_critical?: boolean;
  area_id: string;
  notes?: string;
}

export interface CreateLegacyProductPayload {
  name: string;
  lines: LegacyProductLinePayload[];
}

export interface ProductReportDocument {
  id: string;
  documentId: string;
  reportType: string;
  reportName: string;
  fileName: string;
  fileType: string;
  reportNo?: string;
  testedAt?: string;
  conclusion?: string;
  expiresAt?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export interface CreateProductPayload {
  code: string;
  name: string;
  spec?: string;
  net_weight?: number;
  weight_unit?: string;
  status?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const STATUS_MAP: Record<string, string> = {
  active: '在产',
  inactive: '停产',
  discontinued: '淘汰',
};

export function getProductStatusText(status: string): string {
  return STATUS_MAP[status] ?? status;
}

export type ProductStatusType = 'success' | 'info' | 'danger';

export function getProductStatusType(status: string): ProductStatusType {
  if (status === 'active') return 'success';
  if (status === 'discontinued') return 'danger';
  return 'info';
}

// =========================================================================
// API functions
// =========================================================================

export const productApi = {
  getList() {
    return request.get<Product[]>('/products');
  },

  getOne(id: string) {
    return request.get<Product>(`/products/${id}`);
  },

  create(data: CreateProductPayload) {
    return request.post<Product>('/products', data);
  },

  update(id: string, data: Partial<CreateProductPayload>) {
    return request.patch<Product>(`/products/${id}`, data);
  },

  remove(id: string) {
    return request.delete(`/products/${id}`);
  },

  getReports(id: string) {
    return request.get<ProductReportDocument[]>(`/products/${id}/reports`);
  },

  uploadReport(id: string, formData: FormData) {
    return request.post(`/products/${id}/reports`, formData);
  },

  replaceReport(id: string, linkId: string, formData: FormData) {
    return request.post(`/products/${id}/reports/${linkId}/replace`, formData);
  },

  createLegacy(data: CreateLegacyProductPayload) {
    return request.post<{ product: Product; recipe: unknown }>('/products/legacy', data);
  },
};
