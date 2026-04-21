import request from './request';

export interface EmergencyDrillRecord {
  id: string;
  company_id: string;
  drill_type: string;
  drill_date: string;
  participants: number;
  duration_min: number | null;
  result: string;
  issues: string | null;
  improvement: string | null;
  organizer: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDrillPayload {
  drill_type: string;
  drill_date: string;
  participants: number;
  result: string;
  duration_min?: number;
  issues?: string;
  improvement?: string;
  organizer?: string;
}

export function getDrillTypeText(type: string): string {
  const map: Record<string, string> = {
    fire: '消防演练',
    food_safety: '食品安全',
    chemical: '化学品',
    earthquake: '地震',
    other: '其他',
  };
  return map[type] ?? type;
}

export function getResultText(result: string): string {
  const map: Record<string, string> = {
    pass: '通过',
    fail: '失败',
    partial: '部分通过',
  };
  return map[result] ?? result;
}

const emergencyDrillApi = {
  getList() {
    return request.get<EmergencyDrillRecord[]>('/emergency-drills');
  },

  create(payload: CreateDrillPayload) {
    return request.post<EmergencyDrillRecord>('/emergency-drills', payload);
  },
};

export default emergencyDrillApi;
