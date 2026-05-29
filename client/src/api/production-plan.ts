import request from './request';

export interface ProductionPlanItemInput {
  productId: string;
  recipeId?: string;
  plannedQty: number;
  unit: string;
  lineId?: string;
  shiftId?: string;
}

export interface CreateProductionPlanPayload {
  planNo: string;
  planDate: string;
  lineId?: string;
  items: ProductionPlanItemInput[];
}

export interface ProductionPlanItem {
  id: string;
  planId: string;
  productId: string;
  recipeId?: string | null;
  plannedQty: string;
  unit: string;
  lineId?: string | null;
  shiftId?: string | null;
  status: string;
}

export interface ProductionPlan {
  id: string;
  company_id: string;
  planNo: string;
  planDate: string;
  lineId?: string | null;
  status: string;
  createdById?: string | null;
  releasedAt?: string | null;
  releasedById?: string | null;
  items?: ProductionPlanItem[];
}

export function createProductionPlan(data: CreateProductionPlanPayload) {
  return request.post<ProductionPlan>('/production-plans', data);
}

export function releaseProductionPlan(id: string) {
  return request.post<ProductionPlan>(`/production-plans/${id}/release`);
}
