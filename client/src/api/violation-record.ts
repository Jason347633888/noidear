import request from './request';

export interface ViolationRecord {
  id: string;
  company_id: string;
  employee_id: string;
  violation_type: string;
  description: string;
  penalty: string | null;
  corrective_requirement: string | null;
  occurred_at: string;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateViolationPayload {
  employee_id: string;
  violation_type: string;
  description: string;
  penalty?: string;
  corrective_requirement?: string;
}

const violationRecordApi = {
  getList(employeeId?: string) {
    return request.get<{ data: ViolationRecord[]; total?: number }>('/violation-records', {
      params: employeeId ? { employee_id: employeeId } : {},
    });
  },

  create(payload: CreateViolationPayload) {
    return request.post<ViolationRecord>('/violation-records', payload);
  },
};

export default violationRecordApi;
