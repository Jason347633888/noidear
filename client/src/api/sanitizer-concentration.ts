import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface SanitizerConcentrationCheck {
  id: string;
  company_id: string;
  areaPointId: string;
  disinfectantType: string;
  targetConcentration?: string;
  actualConcentration: string;
  unit: string;
  judgment: 'pass' | 'fail';
  checkedAt: string;
  operatorId: string | null;
  verifierId: string | null;
  notes: string | null;
  appearedInSourceForms: string[];
  sourceFormVersion: string | null;
  sourceFormFieldGroup: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSanitizerConcentrationCheckPayload {
  area_point_id: string;
  disinfectant_type: string;
  target_concentration?: number;
  actual_concentration: number;
  unit: string;
  judgment: 'pass' | 'fail';
  checked_at: string;
  operator_id?: string;
  verifier_id?: string;
  notes?: string;
  appeared_in_source_forms?: string[];
  source_form_version?: string;
  source_form_field_group?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

export const JUDGMENT_LABEL: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
};

export function getJudgmentLabel(judgment: string): string {
  return JUDGMENT_LABEL[judgment] ?? judgment;
}

// =========================================================================
// API functions
// =========================================================================

const sanitizerConcentrationApi = {
  create(payload: CreateSanitizerConcentrationCheckPayload) {
    return request.post<SanitizerConcentrationCheck>('/sanitizer-concentration-checks', payload);
  },

  getList(params?: { areaPointId?: string; from?: string; to?: string }) {
    return request.get<{ data: SanitizerConcentrationCheck[]; total?: number }>(
      '/sanitizer-concentration-checks',
      { params },
    );
  },

  getById(id: string) {
    return request.get<SanitizerConcentrationCheck>(`/sanitizer-concentration-checks/${id}`);
  },

  createNonConformance(id: string) {
    return request.post<{ id: string; nc_no: string }>(
      `/sanitizer-concentration-checks/${id}/non-conformance`,
    );
  },
};

export default sanitizerConcentrationApi;
