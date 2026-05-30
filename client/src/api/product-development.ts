import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ProductProfileSummary {
  productId: string;
  productName: string;
  productCode: string;
  [key: string]: unknown;
}

export interface ProductAllergenEntry {
  allergenName: string;
  present: boolean;
  mayContain: boolean;
  notes?: string;
}

export interface ProductRiskZoneEntry {
  zone: string;
  riskLevel: string;
  controls: string[];
}

export interface ProductValidationEntry {
  id: string;
  validationType: string;
  status: string;
  validatedAt?: string;
  conclusion?: string;
}

export interface RecipeVersionEntry {
  recipeId: string;
  version: number;
  status: string;
  approvedAt?: string;
  changeNote?: string;
}

export interface ProcessChangeImpactEntry {
  planId: string;
  scopes: string[];
  affectedSteps: string[];
  affectedCcps: string[];
  riskLevel: string;
}

// =========================================================================
// API functions
// =========================================================================

export const productDevelopmentApi = {
  getProfiles() {
    return request.get<ProductProfileSummary[]>('/products/profiles');
  },

  getProfile(productId: string) {
    return request.get<ProductProfileSummary>(`/products/${productId}/profile`);
  },

  getAllergens(productId: string) {
    return request.get<ProductAllergenEntry[]>(`/products/${productId}/allergens`);
  },

  getRiskZone(productId: string) {
    return request.get<ProductRiskZoneEntry[]>(`/products/${productId}/risk-zone`);
  },

  getValidation(productId: string) {
    return request.get<ProductValidationEntry[]>(`/products/${productId}/validation`);
  },

  getRecipeVersion(recipeId: string) {
    return request.get<RecipeVersionEntry[]>(`/recipes/${recipeId}/version`);
  },

  getProcessChangeImpact(planId: string) {
    return request.get<ProcessChangeImpactEntry>(`/product-process-changes/${planId}/impact`);
  },
};
