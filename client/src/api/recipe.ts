import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface RecipeLine {
  id: string;
  material_id: string;
  qty_per_batch: number;
  unit: string;
  is_critical?: boolean;
  area_id?: string;
  area_name_snapshot?: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  version: number;
  status: string;
  version_note?: string;
  lines: RecipeLine[];
  product?: {
    id: string;
    name: string;
    code: string;
    status: string;
    deleted_at?: string | null;
  };
}

export interface CreateRecipePayload {
  product_id: string;
  version_note?: string;
  lines: Array<{
    material_id: string;
    qty_per_batch: number;
    unit: string;
    is_critical?: boolean;
    area_id: string;
  }>;
}

// =========================================================================
// Display helpers
// =========================================================================

const RECIPE_STATUS_MAP: Record<string, string> = {
  active: '当前版本',
  archived: '已归档',
};

export function getRecipeStatusText(status: string): string {
  return RECIPE_STATUS_MAP[status] ?? status;
}

export type RecipeStatusType = 'success' | 'info';

export function getRecipeStatusType(status: string): RecipeStatusType {
  return status === 'active' ? 'success' : 'info';
}

// =========================================================================
// API functions
// =========================================================================

export const recipeApi = {
  getList(archive = false) {
    return request.get<Recipe[]>('/recipes', { params: { archive } });
  },

  getByProduct(productId: string, archive = false) {
    return request.get<Recipe[]>(`/recipes/product/${productId}`, { params: { archive } });
  },

  getOne(id: string) {
    return request.get<Recipe>(`/recipes/${id}`);
  },

  create(data: CreateRecipePayload) {
    return request.post<Recipe>('/recipes', data);
  },

  archive(id: string) {
    return request.post<Recipe>(`/recipes/${id}/archive`);
  },

  remove(id: string) {
    return request.post<Recipe>(`/recipes/${id}/archive`);
  },
};
