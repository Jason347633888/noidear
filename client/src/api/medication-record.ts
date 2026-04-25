import request from './request';

export interface MedicationRecord {
  id: string;
  company_id: string;
  employee_id: string;
  drug_name: string;
  dosage: string | null;
  reason: string | null;
  fit_for_duty: boolean;
  health_impact: string | null;
  assessed_by: string | null;
  record_date: string;
  created_at: string;
}

export interface CreateMedicationPayload {
  employee_id: string;
  drug_name: string;
  fit_for_duty: boolean;
  dosage?: string;
  reason?: string;
  health_impact?: string;
  assessed_by?: string;
}

const medicationRecordApi = {
  getList(employeeId?: string, fitForDuty?: boolean) {
    const params: Record<string, string> = {};
    if (employeeId) params['employee_id'] = employeeId;
    if (fitForDuty !== undefined) params['fit_for_duty'] = String(fitForDuty);
    return request.get<{ data: MedicationRecord[]; total?: number }>('/medication-records', { params });
  },

  create(payload: CreateMedicationPayload) {
    return request.post<MedicationRecord>('/medication-records', payload);
  },
};

export default medicationRecordApi;
