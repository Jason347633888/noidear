import request from './request';

export interface ProductProcessChangePlan {
  id: string;
  changeEventId: string;
  productId: string;
  scopes: string[];
  status: string;
  payloadJson: Record<string, unknown>;
}

export interface CreateProductProcessChangeDraftPayload {
  scopes: string[];
  payloadJson: Record<string, unknown>;
}

export const productProcessChangeApi = {
  createDraft(productId: string, payload: CreateProductProcessChangeDraftPayload) {
    return request.post<ProductProcessChangePlan>(
      `/products/${productId}/process-changes`,
      payload,
    );
  },

  submit(planId: string) {
    return request.post<ProductProcessChangePlan>(
      `/product-process-changes/${planId}/submit`,
    );
  },
};
