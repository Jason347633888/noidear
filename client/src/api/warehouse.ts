import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  specification?: string;
  description?: string;
  minStock?: number;
  maxStock?: number;
  currentStock: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface MaterialBatch {
  id: string;
  materialId: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: string;
  supplierId?: string;
  status: 'normal' | 'expired' | 'locked';
  receivedAt: string;
  material?: Material;
  supplier?: Supplier;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SupplierControlledDocument {
  id: string;
  documentId: string;
  documentKind: string;
  documentTitle: string;
  fileName: string;
  fileType: string;
  docNo?: string;
  expiresAt?: string;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export interface Requisition {
  id: string;
  number: string;
  requesterId: string;
  departmentId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed';
  items: RequisitionItem[];
  createdAt: string;
  requester?: { id: string; name: string };
  department?: { id: string; name: string };
}

export interface RequisitionItem {
  id: string;
  materialId: string;
  quantity: number;
  allocatedQuantity?: number;
  material?: Material;
}

export interface StagingAreaItem {
  id: string;
  materialId: string;
  batchId: string;
  quantity: number;
  status: 'staged' | 'dispensed' | 'returned';
  stagedAt: string;
  material?: Material;
  batch?: MaterialBatch;
}

export interface MaterialBalance {
  materialId: string;
  materialName: string;
  materialCode: string;
  inputQuantity: number;
  outputQuantity: number;
  wasteQuantity: number;
  balance: number;
  yieldRate: number;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

// =========================================================================
// Material APIs
// =========================================================================

export const materialApi = {
  getList(params: { page?: number; limit?: number; keyword?: string; category?: string } = {}) {
    return request.get<PaginatedResponse<Material>>('/warehouse/materials', { params });
  },

  getById(id: string) {
    return request.get<Material>(`/warehouse/materials/${id}`);
  },

  create(payload: Partial<Material>) {
    return request.post<Material>('/warehouse/materials', payload);
  },

  update(id: string, payload: Partial<Material>) {
    return request.put<Material>(`/warehouse/materials/${id}`, payload);
  },

  delete(id: string) {
    return request.delete(`/warehouse/materials/${id}`);
  },
};

// =========================================================================
// Batch APIs
// =========================================================================

export const batchApi = {
  getList(params: { page?: number; limit?: number; materialId?: string; status?: string } = {}) {
    return request.get<PaginatedResponse<MaterialBatch>>('/warehouse/batches', { params });
  },

  getById(id: string) {
    return request.get<MaterialBatch>(`/warehouse/batches/${id}`);
  },

  create(payload: Partial<MaterialBatch>) {
    return request.post<MaterialBatch>('/warehouse/batches', payload);
  },

  update(id: string, payload: Partial<MaterialBatch>) {
    return request.put<MaterialBatch>(`/warehouse/batches/${id}`, payload);
  },
};

// =========================================================================
// Supplier APIs
// =========================================================================

export const supplierApi = {
  getList(params: { page?: number; limit?: number; keyword?: string } = {}) {
    return request.get<PaginatedResponse<Supplier>>('/warehouse/suppliers', { params });
  },

  getById(id: string) {
    return request.get<Supplier>(`/warehouse/suppliers/${id}`);
  },

  create(payload: Partial<Supplier>) {
    return request.post<Supplier>('/warehouse/suppliers', payload);
  },

  update(id: string, payload: Partial<Supplier>) {
    return request.put<Supplier>(`/warehouse/suppliers/${id}`, payload);
  },

  delete(id: string) {
    return request.delete(`/warehouse/suppliers/${id}`);
  },

  getDocuments(id: string) {
    return request.get<SupplierControlledDocument[]>(`/warehouse/suppliers/${id}/documents`);
  },

  uploadDocument(id: string, formData: FormData) {
    return request.post(`/warehouse/suppliers/${id}/documents`, formData);
  },

  replaceDocument(id: string, linkId: string, formData: FormData) {
    return request.post(`/warehouse/suppliers/${id}/documents/${linkId}/replace`, formData);
  },
};

// =========================================================================
// Requisition APIs
// =========================================================================

export const requisitionApi = {
  getList(params: { page?: number; limit?: number; status?: string } = {}) {
    return request.get<PaginatedResponse<Requisition>>('/warehouse/requisitions', { params });
  },

  getById(id: string) {
    return request.get<Requisition>(`/warehouse/requisitions/${id}`);
  },

  create(payload: { departmentId: string; items: { materialId: string; quantity: number }[] }) {
    return request.post<Requisition>('/warehouse/requisitions', payload);
  },

  submit(id: string) {
    return request.post(`/warehouse/requisitions/${id}/submit`);
  },

  approve(id: string, action: 'approved' | 'rejected', comment?: string) {
    return request.post(`/warehouse/requisitions/${id}/approve`, { action, comment });
  },
};

// =========================================================================
// Staging Area APIs
// =========================================================================

export const stagingAreaApi = {
  getStock(params?: { areaId?: string; materialId?: string; page?: number; limit?: number }) {
    return request.get('/warehouse/staging-area/stock', { params });
  },

  stageToArea(data: { batchId: string; areaId: string; quantity: number; operatorId?: string }) {
    return request.post('/warehouse/staging-area/stage-to-area', data);
  },

  confirmStocktake(data: {
    areaId: string;
    batchId: string;
    kind: 'shift_start' | 'shift_end' | 'handover';
    workDate: string;
    shiftTypeId: string;
    actualQuantity: number;
    teamId?: string;
    note?: string;
  }) {
    return request.post('/warehouse/staging-area/stocktakes', data);
  },
};

// =========================================================================
// Material Balance APIs
// =========================================================================

export const materialBalanceApi = {
  getBalance(params: { batchId?: string; dateFrom?: string; dateTo?: string } = {}) {
    return request.get<MaterialBalance[]>('/warehouse/material-balance', { params });
  },
};
