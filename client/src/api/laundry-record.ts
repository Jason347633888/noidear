import request from './request';

// =========================================================================
// Types
// =========================================================================

export type LaundryRecordStatus = 'draft' | 'submitted' | 'verified' | 'rejected';

export interface LaundryWorkRecordItem {
  id: string;
  laundry_record_id: string;
  garment_type: string;
  garment_inventory_id: string | null;
  area_id: string | null;
  quantity: number;
  action: string;
  result: string;
  notes: string | null;
  evidence_file_id: string | null;
}

export interface LaundryWorkRecord {
  id: string;
  company_id: string;
  work_date: string;
  shift_type_id: string | null;
  batch_no: string | null;
  washing_method: string | null;
  disinfection_method: string | null;
  disinfectant: string | null;
  temperature: number | null;
  duration_min: number | null;
  operator_id: string;
  notes: string | null;
  status: LaundryRecordStatus;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  items: LaundryWorkRecordItem[];
}

export interface CreateLaundryWorkRecordPayload {
  company_id: string;
  work_date: string;
  shift_type_id?: string;
  batch_no?: string;
  washing_method?: string;
  disinfection_method?: string;
  disinfectant?: string;
  temperature?: number;
  duration_min?: number;
  operator_id: string;
  notes?: string;
  items: {
    garment_type: string;
    garment_inventory_id?: string;
    area_id?: string;
    quantity: number;
    action: string;
    result: string;
    notes?: string;
    evidence_file_id?: string;
  }[];
}

// =========================================================================
// API functions
// =========================================================================

const laundryRecordApi = {
  getList(status?: string) {
    return request.get<LaundryWorkRecord[]>('/laundry-records', {
      params: status ? { status } : undefined,
    });
  },

  getOne(id: string) {
    return request.get<LaundryWorkRecord>(`/laundry-records/${id}`);
  },

  create(payload: CreateLaundryWorkRecordPayload) {
    return request.post<LaundryWorkRecord>('/laundry-records', payload);
  },

  submit(id: string) {
    return request.post<LaundryWorkRecord>(`/laundry-records/${id}/submit`, {});
  },

  verify(id: string, pass: boolean) {
    return request.post<LaundryWorkRecord>(`/laundry-records/${id}/verify`, { pass });
  },
};

export default laundryRecordApi;
