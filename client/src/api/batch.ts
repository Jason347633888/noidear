import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productId?: string;
  productName: string;
  productCode: string;
  recipeId?: string;
  recipeName?: string;
  quantity: number;
  plannedQuantity?: number;
  unit: string;
  productionDate?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  materialUsages?: MaterialUsage[];
}

export interface CreateProductionBatchPayload {
  productId: string;
  recipeId: string;
  plannedQuantity: number;
  productionDate: string;
}

export interface MaterialUsage {
  id: string;
  batchId: string;
  materialId: string;
  materialBatchId: string;
  quantity: number;
  usedAt: string;
  material?: {
    id: string;
    code: string;
    name: string;
  };
  materialBatch?: {
    id: string;
    batchNumber: string;
  };
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

// =========================================================================
// Production Batch APIs
// =========================================================================

export const productionBatchApi = {
  getList(params: { page?: number; limit?: number; status?: string; keyword?: string } = {}) {
    return request.get<PaginatedResponse<ProductionBatch>>('/batch-trace/production-batches', { params });
  },

  getById(id: string) {
    return request.get<ProductionBatch>(`/batch-trace/production-batches/${id}`);
  },

  create(payload: Partial<ProductionBatch> | CreateProductionBatchPayload) {
    return request.post<ProductionBatch>('/batch-trace/production-batches', payload);
  },

  update(id: string, payload: Partial<ProductionBatch>) {
    return request.put<ProductionBatch>(`/batch-trace/production-batches/${id}`, payload);
  },

  complete(id: string) {
    return request.post(`/batch-trace/production-batches/${id}/complete`);
  },
};

// =========================================================================
// Material Usage APIs
// =========================================================================

export const materialUsageApi = {
  getByBatch(productionBatchId: string) {
    return request.get<MaterialUsage[]>('/batch-trace/material-usage', { params: { productionBatchId } });
  },

  addUsage(payload: { productionBatchId: string; materialBatchId: string; recipeLineId: string; quantity: number }) {
    return request.post<MaterialUsage>('/batch-trace/material-usage', payload);
  },

  removeUsage(usageId: string) {
    return request.delete(`/batch-trace/material-usage/${usageId}`);
  },
};


