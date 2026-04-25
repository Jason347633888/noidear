import request from './request';

// =========================================================================
// Types
// =========================================================================

export type EvaluationVerdict = 'approved' | 'conditional' | 'eliminated';

export interface SupplierEvaluation {
  id: string;
  company_id: string;
  supplier_id: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode: string;
  };
  eval_period: string;
  eval_date: string;
  quality_score: number | null;
  delivery_score: number | null;
  service_score: number | null;
  total_score: number | null;
  verdict: EvaluationVerdict;
  evaluator_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateEvaluationPayload {
  supplier_id: string;
  eval_period: string;
  quality_score?: number;
  delivery_score?: number;
  service_score?: number;
  verdict: EvaluationVerdict;
  notes?: string;
}

// =========================================================================
// Verdict display helpers
// =========================================================================

const VERDICT_MAP: Record<EvaluationVerdict, { text: string; type: string }> = {
  approved: { text: '合格', type: 'success' },
  conditional: { text: '有条件合格', type: 'warning' },
  eliminated: { text: '淘汰', type: 'danger' },
};

export function getVerdictText(verdict: string): string {
  return VERDICT_MAP[verdict as EvaluationVerdict]?.text ?? verdict;
}

export function getVerdictType(verdict: string): string {
  return VERDICT_MAP[verdict as EvaluationVerdict]?.type ?? 'info';
}

// =========================================================================
// API functions
// =========================================================================

const supplierEvaluationApi = {
  getList() {
    return request.get<{ data: SupplierEvaluation[]; total?: number }>('/supplier-evaluations');
  },

  getBySupplier(supplierId: string) {
    return request.get<{ data: SupplierEvaluation[]; total?: number }>(`/supplier-evaluations/supplier/${supplierId}`);
  },

  create(payload: CreateEvaluationPayload) {
    return request.post<SupplierEvaluation>('/supplier-evaluations', payload);
  },
};

export default supplierEvaluationApi;
