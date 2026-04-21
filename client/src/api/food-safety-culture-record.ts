import request from './request';

// =========================================================================
// Types
// =========================================================================

export type ActivityType = 'training' | 'inspection' | 'meeting' | 'campaign';

export interface FoodSafetyCultureRecord {
  id: string;
  company_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  action_measures: unknown;
  participants: number | null;
  conducted_at: string;
  organizer_id: string | null;
  result_summary: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateFoodSafetyCultureRecordPayload {
  activity_type: ActivityType;
  title: string;
  description?: string;
  participants?: number;
  conducted_at?: string;
  organizer_id?: string;
  result_summary?: string;
  notes?: string;
}

// =========================================================================
// Display helpers
// =========================================================================

const ACTIVITY_TYPE_MAP: Record<string, string> = {
  training: '培训',
  inspection: '检查',
  meeting: '会议',
  campaign: '宣传活动',
};

export function getActivityTypeText(activityType: string): string {
  return ACTIVITY_TYPE_MAP[activityType] ?? activityType;
}

// =========================================================================
// API functions
// =========================================================================

const foodSafetyCultureRecordApi = {
  getList() {
    return request.get<FoodSafetyCultureRecord[]>('/food-safety-culture-records');
  },

  create(payload: CreateFoodSafetyCultureRecordPayload) {
    return request.post<FoodSafetyCultureRecord>('/food-safety-culture-records', payload);
  },

  remove(id: string) {
    return request.delete<void>(`/food-safety-culture-records/${id}`);
  },
};

export default foodSafetyCultureRecordApi;
