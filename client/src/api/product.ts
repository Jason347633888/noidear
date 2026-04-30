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
  deleted_at?: string | null;
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

// -------------------------------------------------------------------------
// Workbench nested types
// -------------------------------------------------------------------------

export interface RecipeLineSummary {
  id: string;
  material_id: string;
  material_name?: string;
  qty_per_batch: number | string;
  unit: string;
  area_id?: string;
  is_critical?: boolean;
}

export interface RecipeSummary {
  id?: string;
  product_id?: string;
  version: number;
  status: 'active' | 'archived' | 'draft' | string;
  changeEventId?: string | null;
  approved_at?: string | null;
  lines?: RecipeLineSummary[];
}

export interface ProcessStepSummary {
  id: string;
  product_id?: string;
  recipe_id?: string | null;
  step_no: number;
  step_name?: string;
  name?: string;
  description?: string;
  is_ccp?: boolean;
  changeEventId?: string | null;
  deleted_at?: string | null;
}

export interface ProductProcessChangePlanSummary {
  id: string;
  changeEventId: string;
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved_executing'
    | 'execution_failed'
    | 'executed'
    | string;
  scopes: string[];
  // payloadJson 形状由服务端 DTO 校验，前端无需提前解析。
  payloadJson: Record<string, unknown>;
}

export interface ChangeEventSummary {
  id: string;
  change_no?: string;
  status?: string;
  title?: string;
  created_at?: string;
}

export interface CcpPointSummary {
  id: string;
  ccp_no: string;
  hazard_type: string;
  control_measure: string;
  critical_limit: string;
  cl_min?: string | number | null;
  cl_max?: string | number | null;
  cl_unit?: string | null;
  process_step_id: string;
  deleted_at?: string | null;
}

export interface FailureTodoSummary {
  id: string;
  relatedId: string;       // plan id
  description: string;     // error message
  createdAt: string;
}

export interface ProductWorkbench {
  product: Product;
  currentRecipe: RecipeSummary | null;
  archivedRecipes: RecipeSummary[];
  processSteps: ProcessStepSummary[];
  archivedProcessSteps: ProcessStepSummary[];
  activePlan: ProductProcessChangePlanSummary | null;
  ccpPoints: CcpPointSummary[];
  archivedCcpPoints: CcpPointSummary[];
  failureTodos: FailureTodoSummary[];
  relatedChanges: ChangeEventSummary[];
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

  getWorkbench(id: string) {
    return request.get<ProductWorkbench>(`/products/${id}/workbench`);
  },

  create(data: CreateProductPayload) {
    return request.post<Product>('/products', data);
  },

  update(id: string, data: Partial<CreateProductPayload>) {
    return request.patch<Product>(`/products/${id}`, data);
  },

  archive(id: string) {
    return request.post<Product>(`/products/${id}/archive`);
  },

  remove(id: string) {
    return request.post<Product>(`/products/${id}/archive`);
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
