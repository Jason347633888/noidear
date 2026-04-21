import request from './request';

export interface VisitorRecord {
  id: string;
  company_id: string;
  visitor_name: string;
  organization: string | null;
  purpose: string;
  visit_date: string;
  escort: string | null;
  health_status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitorPayload {
  visitor_name: string;
  purpose: string;
  visit_date: string;
  organization?: string;
  escort?: string;
  health_status?: string;
  notes?: string;
}

const visitorRecordApi = {
  getList(date?: string) {
    return request.get<VisitorRecord[]>('/visitor-records', {
      params: date ? { date } : {},
    });
  },

  create(payload: CreateVisitorPayload) {
    return request.post<VisitorRecord>('/visitor-records', payload);
  },
};

export default visitorRecordApi;
