import request from './request';

// =========================================================================
// Types
// =========================================================================

export type ShelfLifeStudyType = 'initial' | 'periodic';
export type ShelfLifeStudyStatus = 'active' | 'concluded';
export type ShelfLifeStudyPointStatus = 'pending' | 'done' | 'skipped';

export interface ShelfLifeStudyPoint {
  id: string;
  shelf_life_study_id: string;
  point_code: string;
  sequence: number;
  planned_at: string;
  status: ShelfLifeStudyPointStatus;
  inspection_record_id: string | null;
  skip_reason: string | null;
  completed_at: string | null;
  completed_by: string | null;
}

export interface ShelfLifeStudy {
  id: string;
  company_id: string;
  product_id: string;
  retained_sample_id: string | null;
  study_type: ShelfLifeStudyType;
  storage_conditions: Record<string, unknown>;
  started_at: string;
  planned_ended_at: string;
  actual_ended_at: string | null;
  status: ShelfLifeStudyStatus;
  final_conclusion: string | null;
  conclusion_by: string | null;
  created_at: string;
  updated_at: string;
  points: ShelfLifeStudyPoint[];
}

export interface CreateShelfLifeStudyPayload {
  productId: string;
  retainedSampleId?: string;
  studyType: ShelfLifeStudyType;
  storageConditions: Record<string, unknown>;
  startedAt: string;
  plannedEndedAt: string;
  points: Array<{
    pointCode: string;
    sequence: number;
    plannedAt: string;
  }>;
}

export interface ListShelfLifeStudiesParams {
  page?: number;
  limit?: number;
  productId?: string;
  status?: ShelfLifeStudyStatus;
}

export interface PaginatedShelfLifeStudies {
  list: ShelfLifeStudy[];
  total: number;
  page: number;
  limit: number;
}

// =========================================================================
// API
// =========================================================================

export const shelfLifeStudyApi = {
  getList(params: ListShelfLifeStudiesParams = {}) {
    return request.get<PaginatedShelfLifeStudies>('/shelf-life-studies', { params });
  },

  getById(id: string) {
    return request.get<ShelfLifeStudy>(`/shelf-life-studies/${id}`);
  },

  create(payload: CreateShelfLifeStudyPayload) {
    return request.post<ShelfLifeStudy>('/shelf-life-studies', payload);
  },
};

export default shelfLifeStudyApi;
