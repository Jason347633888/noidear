import request from './request';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CleaningPlanTemplateItem {
  target_name: string;
  target_type: string;
  method?: string;
  requires_disinfection?: boolean;
  disinfectant?: string;
  target_concentration?: number;
  normal_range?: string;
  is_mandatory?: boolean;
  requires_verification?: boolean;
  sequence?: number;
}

export interface CleaningPlanTemplate {
  id: string;
  company_id: string;
  name: string;
  area_type: string;
  version: string;
  status: string;
  effective_from: string | null;
  items: CleaningPlanTemplateItem[];
  created_at: string;
  updated_at: string;
}

export interface CleaningPlanItem {
  id: string;
  plan_id: string;
  target_name: string;
  target_type: string;
  method: string | null;
  requires_disinfection: boolean;
  disinfectant: string | null;
  target_concentration: string | null;
  normal_range: string | null;
  is_mandatory: boolean;
  requires_verification: boolean;
  sequence: number;
  created_at: string;
}

export interface CleaningPlan {
  id: string;
  company_id: string;
  area_point_id: string;
  template_id: string | null;
  version: string;
  frequency: string;
  trigger_condition: string | null;
  effective_from: string;
  effective_to: string | null;
  status: string;
  approvalInstanceId: string | null;
  items: CleaningPlanItem[];
  area_point?: { id: string; name: string; type: string };
  created_at: string;
  updated_at: string;
}

export interface CreateCleaningPlanTemplateInput {
  name: string;
  area_type: string;
  version: string;
  effective_from?: string;
  items: CleaningPlanTemplateItem[];
}

export interface CloneTemplateToPlanInput {
  template_id: string;
  area_point_id: string;
  version: string;
  effective_from: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const cleaningPlanApi = {
  // Templates
  createTemplate(data: CreateCleaningPlanTemplateInput) {
    return request.post<CleaningPlanTemplate>('/cleaning-plans/templates', data);
  },

  listTemplates(areaType?: string) {
    return request.get<CleaningPlanTemplate[]>('/cleaning-plans/templates', {
      params: areaType ? { area_type: areaType } : undefined,
    });
  },

  // Plans
  cloneTemplateToArea(data: CloneTemplateToPlanInput) {
    return request.post<CleaningPlan>('/cleaning-plans/clone', data);
  },

  activatePlan(planId: string) {
    return request.post<CleaningPlan>(`/cleaning-plans/${planId}/activate`);
  },

  listActivePlans(areaPointId?: string) {
    return request.get<CleaningPlan[]>('/cleaning-plans/active', {
      params: areaPointId ? { area_point_id: areaPointId } : undefined,
    });
  },
};
