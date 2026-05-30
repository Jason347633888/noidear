import request from './request';

// =========================================================================
// Types
// =========================================================================

export type EvaluationType =
  | 'contractor_food_safety'
  | 'logistics'
  | 'outsourced_service'
  | 'other';

export type EvaluationResult = 'pass' | 'conditional' | 'fail';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ExternalPartyEvaluation {
  id: string;
  company_id: string;
  external_party_id: string;
  evaluation_type: EvaluationType;
  evaluation_date: string;
  score: number | null;
  result: EvaluationResult;
  risk_level: RiskLevel | null;
  evaluator_id: string | null;
  evidence_file_id: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
  externalParty?: { id: string; name: string; party_type: string } | null;
}

export interface CreateExternalPartyEvaluationPayload {
  evaluation_type: EvaluationType;
  evaluation_date: string;
  score?: number;
  result: EvaluationResult;
  risk_level?: RiskLevel;
  evaluator_id?: string;
  evidence_file_id?: string;
  next_review_at?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

export const EVALUATION_TYPE_MAP: Record<string, string> = {
  contractor_food_safety: '承包商食品安全',
  logistics: '物流服务',
  outsourced_service: '外包服务',
  other: '其他',
};

export const RESULT_MAP: Record<string, string> = {
  pass: '通过',
  conditional: '有条件通过',
  fail: '不通过',
};

export const RISK_LEVEL_MAP: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export function getEvaluationTypeText(type: string): string {
  return EVALUATION_TYPE_MAP[type] ?? type;
}

export function getResultText(result: string): string {
  return RESULT_MAP[result] ?? result;
}

export function getRiskLevelText(level: string): string {
  return RISK_LEVEL_MAP[level] ?? level;
}

// =========================================================================
// API functions
// =========================================================================

const externalPartyEvaluationApi = {
  getList() {
    return request.get<ExternalPartyEvaluation[]>('/external-parties/evaluations');
  },

  getByParty(partyId: string) {
    return request.get<ExternalPartyEvaluation[]>(`/external-parties/${partyId}/evaluations`);
  },

  create(partyId: string, payload: CreateExternalPartyEvaluationPayload) {
    return request.post<ExternalPartyEvaluation>(
      `/external-parties/${partyId}/evaluations`,
      payload,
    );
  },
};

export default externalPartyEvaluationApi;
