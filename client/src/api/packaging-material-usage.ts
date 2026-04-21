import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface PackagingMaterialUsage {
  id: string;
  company_id: string;
  production_batch_id: string | null;
  material_name: string;
  material_code: string | null;
  used_weight: string | null;
  waste_weight: string | null;
  unit: string | null;
  usage_date: string;
  operator_id: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreatePackagingMaterialUsagePayload {
  material_name: string;
  material_code?: string;
  production_batch_id?: string;
  used_weight?: number;
  waste_weight?: number;
  unit?: string;
  usage_date?: string;
  operator_id?: string;
  notes?: string;
}

// =========================================================================
// API functions
// =========================================================================

const packagingMaterialUsageApi = {
  getList() {
    return request.get<PackagingMaterialUsage[]>('/packaging-material-usages');
  },

  create(payload: CreatePackagingMaterialUsagePayload) {
    return request.post<PackagingMaterialUsage>('/packaging-material-usages', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/packaging-material-usages/${id}`);
  },
};

export default packagingMaterialUsageApi;
