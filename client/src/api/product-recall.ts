import request from './request';

export type ProductRecallStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'notified'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ProductRecallBatch {
  id: string;
  production_batch_id: string;
  batch_number_snapshot: string;
  product_name_snapshot: string;
  affected_qty: string | null;
  unit: string | null;
  status: string;
}

export interface ProductRecallNotification {
  id: string;
  customer_name: string;
  notification_method: string;
  status: 'pending' | 'sent' | 'failed';
  notified_at: string | null;
  response_summary: string | null;
}

export interface ProductRecall {
  id: string;
  company_id: string;
  recall_no: string;
  title: string;
  reason: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: ProductRecallStatus;
  source_complaint_id: string | null;
  source_query_ref: string | null;
  requested_at: string;
  completed_at: string | null;
  batches?: ProductRecallBatch[];
  notifications?: ProductRecallNotification[];
}

export interface CreateProductRecallPayload {
  title: string;
  reason: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  source_complaint_id?: string;
  source_query_ref?: string;
  batches?: Array<{ production_batch_id: string; affected_qty?: number; unit?: string }>;
  notifications?: Array<{
    external_party_id?: string;
    customer_name: string;
    contact_name?: string;
    contact_phone?: string;
    notification_method?: 'phone' | 'email' | 'letter' | 'onsite';
  }>;
}

const productRecallApi = {
  getList(params?: { status?: ProductRecallStatus; risk_level?: string; production_batch_id?: string; source_complaint_id?: string }) {
    return request.get<ProductRecall[]>('/product-recalls', { params });
  },
  getDetail(id: string) {
    return request.get<ProductRecall>(`/product-recalls/${id}`);
  },
  create(payload: CreateProductRecallPayload) {
    return request.post<ProductRecall>('/product-recalls', payload);
  },
  submit(id: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/submit`);
  },
  approve(id: string, review_note?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/approve`, { review_note });
  },
  reject(id: string, review_note?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/reject`, { review_note });
  },
  complete(id: string, completion_summary: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/complete`, { completion_summary });
  },
  cancel(id: string, cancel_reason: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/cancel`, { cancel_reason });
  },
  markNotificationSent(id: string, notificationId: string, response_summary?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/notifications/${notificationId}/mark-sent`, { response_summary });
  },
};

export default productRecallApi;
