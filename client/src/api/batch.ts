import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  materialUsages?: MaterialUsage[];
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

export interface TraceResult {
  batchId: string;
  batchNumber: string;
  productName: string;
  forwardTrace: TraceNode[];
  backwardTrace: TraceNode[];
}

export interface TraceNode {
  type: 'material' | 'batch' | 'product';
  id: string;
  name: string;
  batchNumber?: string;
  quantity?: number;
  date?: string;
  children?: TraceNode[];
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

  create(payload: Partial<ProductionBatch>) {
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
  getByBatch(batchId: string) {
    return request.get<MaterialUsage[]>(`/batch-trace/production-batches/${batchId}/material-usage`);
  },

  addUsage(batchId: string, payload: { materialId: string; materialBatchId: string; quantity: number }) {
    return request.post<MaterialUsage>(`/batch-trace/production-batches/${batchId}/material-usage`, payload);
  },

  removeUsage(batchId: string, usageId: string) {
    return request.delete(`/batch-trace/production-batches/${batchId}/material-usage/${usageId}`);
  },
};

// =========================================================================
// Trace APIs
// =========================================================================

export const traceApi = {
  forwardTrace(batchId: string) {
    return request.get<TraceResult>(`/batch-trace/trace/${batchId}/forward`);
  },

  backwardTrace(batchId: string) {
    return request.get<TraceResult>(`/batch-trace/trace/${batchId}/backward`);
  },

  fullTrace(batchId: string) {
    return request.get<TraceResult>(`/batch-trace/trace/${batchId}`);
  },

  exportReport(batchId: string) {
    return request.get(`/batch-trace/trace/${batchId}/export`, { responseType: 'blob' });
  },
};
