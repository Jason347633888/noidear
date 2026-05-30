import request from './request';

export type DrillType = 'forward' | 'backward' | 'both';
export type DrillStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type DrillConclusion = 'passed' | 'failed';

export interface TraceabilityDrill {
  id: string;
  company_id: string;
  drill_type: DrillType;
  drill_date: string;
  planned_start: string | null;
  planned_end: string | null;
  simulated_case: string | null;
  root_object_type: string;
  root_object_id: string;
  participants: string[];
  status: DrillStatus;
  actual_start: string | null;
  actual_end: string | null;
  traceability_snapshot_id: string | null;
  conclusion: DrillConclusion | null;
  conclusion_at: string | null;
  capa_id: string | null;
  reviewer_id: string | null;
  approver_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanDrillPayload {
  drill_type: DrillType;
  drill_date: string;
  root_object_type: string;
  root_object_id: string;
  participants: string[];
  planned_start?: string;
  planned_end?: string;
  simulated_case?: string;
  reviewer_id?: string;
  approver_id?: string;
}

export const traceabilityDrillApi = {
  getList(params?: { status?: DrillStatus; drill_type?: DrillType }) {
    return request.get<TraceabilityDrill[]>('/traceability/drills', { params });
  },

  getDetail(id: string) {
    return request.get<TraceabilityDrill>(`/traceability/drills/${id}`);
  },

  plan(payload: PlanDrillPayload) {
    return request.post<TraceabilityDrill>('/traceability/drills', payload);
  },

  start(id: string) {
    return request.post<TraceabilityDrill>(`/traceability/drills/${id}/start`);
  },

  attachSnapshot(id: string, snapshotId: string) {
    return request.post<TraceabilityDrill>(`/traceability/drills/${id}/attach-snapshot`, {
      snapshot_id: snapshotId,
    });
  },

  conclude(id: string, conclusion: DrillConclusion, reviewerId?: string) {
    return request.post<TraceabilityDrill>(`/traceability/drills/${id}/conclude`, {
      conclusion,
      ...(reviewerId ? { reviewer_id: reviewerId } : {}),
    });
  },

  createCapa(id: string) {
    return request.post<TraceabilityDrill>(`/traceability/drills/${id}/capa`);
  },
};
