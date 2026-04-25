import request from './request';

// =========================================================================
// Types
// =========================================================================

export type ComplaintStatus = 'open' | 'closed';

export interface CustomerComplaint {
  id: string;
  company_id: string;
  complaint_no: string;
  customer_name: string;
  production_batch_id: string | null;
  received_at: string;
  complaint_type: string | null;
  description: string;
  status: ComplaintStatus;
  resolution: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateComplaintPayload {
  customer_name: string;
  production_batch_id?: string;
  description: string;
  complaint_type?: string;
}

export interface ResolveComplaintPayload {
  resolution: string;
}

// =========================================================================
// Status display helpers
// =========================================================================

const COMPLAINT_STATUS_MAP: Record<string, { text: string; type: string }> = {
  open: { text: '待处理', type: 'danger' },
  closed: { text: '已关闭', type: 'success' },
};

export function getComplaintStatusText(status: string): string {
  return COMPLAINT_STATUS_MAP[status]?.text ?? status;
}

export function getComplaintStatusType(status: string): string {
  return COMPLAINT_STATUS_MAP[status]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const customerComplaintApi = {
  getList(status?: string) {
    return request.get<{ data: CustomerComplaint[]; total?: number }>('/customer-complaints', {
      params: status ? { status } : {},
    });
  },

  create(payload: CreateComplaintPayload) {
    return request.post<CustomerComplaint>('/customer-complaints', payload);
  },

  resolve(id: string, payload: ResolveComplaintPayload) {
    return request.post<CustomerComplaint>(`/customer-complaints/${id}/resolve`, payload);
  },
};

export default customerComplaintApi;
