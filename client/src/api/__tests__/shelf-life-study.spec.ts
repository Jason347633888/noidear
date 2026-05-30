import { describe, it, expect, vi, beforeEach } from 'vitest';
import shelfLifeStudyApi from '../shelf-life-study';
import request from '../request';

vi.mock('../request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockRequest = vi.mocked(request);

const mockStudy = {
  id: 'sls-1',
  company_id: 'co-1',
  product_id: 'prod-1',
  retained_sample_id: null,
  study_type: 'initial' as const,
  storage_conditions: { temperature: '4°C' },
  started_at: '2026-05-30T00:00:00Z',
  planned_ended_at: '2026-11-30T00:00:00Z',
  actual_ended_at: null,
  status: 'active' as const,
  final_conclusion: null,
  conclusion_by: null,
  created_at: '2026-05-30T08:00:00Z',
  updated_at: '2026-05-30T08:00:00Z',
  points: [
    {
      id: 'slsp-1',
      shelf_life_study_id: 'sls-1',
      point_code: 'T0',
      sequence: 1,
      planned_at: '2026-05-30T00:00:00Z',
      status: 'pending' as const,
      inspection_record_id: null,
      skip_reason: null,
      completed_at: null,
      completed_by: null,
    },
  ],
};

describe('shelfLifeStudyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    it('calls GET /shelf-life-studies with params', async () => {
      const paginated = { list: [mockStudy], total: 1, page: 1, limit: 20 };
      mockRequest.get.mockResolvedValueOnce(paginated);

      const result = await shelfLifeStudyApi.getList({ page: 1, status: 'active' });

      expect(mockRequest.get).toHaveBeenCalledWith('/shelf-life-studies', {
        params: { page: 1, status: 'active' },
      });
      expect(result).toEqual(paginated);
    });

    it('calls GET /shelf-life-studies with empty params by default', async () => {
      mockRequest.get.mockResolvedValueOnce({ list: [], total: 0, page: 1, limit: 20 });
      await shelfLifeStudyApi.getList();
      expect(mockRequest.get).toHaveBeenCalledWith('/shelf-life-studies', { params: {} });
    });
  });

  describe('getById', () => {
    it('calls GET /shelf-life-studies/:id', async () => {
      mockRequest.get.mockResolvedValueOnce(mockStudy);

      const result = await shelfLifeStudyApi.getById('sls-1');

      expect(mockRequest.get).toHaveBeenCalledWith('/shelf-life-studies/sls-1');
      expect(result).toEqual(mockStudy);
    });
  });

  describe('create', () => {
    it('calls POST /shelf-life-studies with payload', async () => {
      mockRequest.post.mockResolvedValueOnce(mockStudy);

      const payload = {
        productId: 'prod-1',
        studyType: 'initial' as const,
        storageConditions: { temperature: '4°C' },
        startedAt: '2026-05-30',
        plannedEndedAt: '2026-11-30',
        points: [{ pointCode: 'T0', sequence: 1, plannedAt: '2026-05-30' }],
      };
      const result = await shelfLifeStudyApi.create(payload);

      expect(mockRequest.post).toHaveBeenCalledWith('/shelf-life-studies', payload);
      expect(result).toEqual(mockStudy);
    });
  });
});
