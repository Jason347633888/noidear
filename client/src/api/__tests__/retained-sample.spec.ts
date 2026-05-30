import { describe, it, expect, vi, beforeEach } from 'vitest';
import retainedSampleApi from '../retained-sample';
import request from '../request';

vi.mock('../request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockRequest = vi.mocked(request);

const mockSample = {
  id: 'rs-1',
  company_id: 'co-1',
  sample_type: 'product' as const,
  product_id: 'prod-1',
  material_batch_id: null,
  production_batch_id: null,
  sample_code: 'RS-001',
  sample_qty: 0.5,
  unit: 'kg',
  retained_at: '2026-05-30T08:00:00Z',
  retention_period: '90d',
  expires_at: '2026-08-28T08:00:00Z',
  storage_condition: 'refrigerated',
  storage_area_id: null,
  status: 'retained' as const,
  disposal_action: null,
  disposed_at: null,
  appeared_in_source_forms: [],
  source_form_version: null,
  source_form_field_group: null,
  created_at: '2026-05-30T08:00:00Z',
  updated_at: '2026-05-30T08:00:00Z',
  inspections: [],
};

describe('retainedSampleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getList', () => {
    it('calls GET /retained-samples with params', async () => {
      const paginated = { list: [mockSample], total: 1, page: 1, limit: 20 };
      mockRequest.get.mockResolvedValueOnce(paginated);

      const result = await retainedSampleApi.getList({ page: 1, status: 'retained' });

      expect(mockRequest.get).toHaveBeenCalledWith('/retained-samples', {
        params: { page: 1, status: 'retained' },
      });
      expect(result).toEqual(paginated);
    });

    it('calls GET /retained-samples with empty params by default', async () => {
      mockRequest.get.mockResolvedValueOnce({ list: [], total: 0, page: 1, limit: 20 });
      await retainedSampleApi.getList();
      expect(mockRequest.get).toHaveBeenCalledWith('/retained-samples', { params: {} });
    });
  });

  describe('getById', () => {
    it('calls GET /retained-samples/:id', async () => {
      mockRequest.get.mockResolvedValueOnce(mockSample);

      const result = await retainedSampleApi.getById('rs-1');

      expect(mockRequest.get).toHaveBeenCalledWith('/retained-samples/rs-1');
      expect(result).toEqual(mockSample);
    });
  });

  describe('create', () => {
    it('calls POST /retained-samples with payload', async () => {
      mockRequest.post.mockResolvedValueOnce(mockSample);

      const payload = {
        sample_type: 'product' as const,
        sample_code: 'RS-001',
        sample_qty: 0.5,
        unit: 'kg',
        retained_at: '2026-05-30T08:00:00Z',
      };
      const result = await retainedSampleApi.create(payload);

      expect(mockRequest.post).toHaveBeenCalledWith('/retained-samples', payload);
      expect(result).toEqual(mockSample);
    });
  });

  describe('dispose', () => {
    it('calls PATCH /retained-samples/:id/dispose', async () => {
      const disposed = { ...mockSample, status: 'disposed' as const };
      mockRequest.patch.mockResolvedValueOnce(disposed);

      const result = await retainedSampleApi.dispose('rs-1', {
        disposal_action: 'destroy',
        disposed_at: '2026-08-28T08:00:00Z',
      });

      expect(mockRequest.patch).toHaveBeenCalledWith('/retained-samples/rs-1/dispose', {
        disposal_action: 'destroy',
        disposed_at: '2026-08-28T08:00:00Z',
      });
      expect(result).toEqual(disposed);
    });
  });

  describe('createInspection', () => {
    it('calls POST /retained-samples/:id/inspections', async () => {
      const mockResult = {
        sample: { ...mockSample, status: 'inspecting' as const },
        sampleInspection: {
          id: 'rsi-1',
          retained_sample_id: 'rs-1',
          inspection_type: 'visual',
          inspection_record_id: 'ir-1',
          processed_disposition: null,
          processed_at: null,
          processed_by: null,
          created_at: '2026-05-30T10:00:00Z',
        },
        inspectionRecord: { id: 'ir-1' },
      };
      mockRequest.post.mockResolvedValueOnce(mockResult);

      const result = await retainedSampleApi.createInspection('rs-1', {
        inspection_type: 'visual',
        inspection_record_id: 'ir-1',
      });

      expect(mockRequest.post).toHaveBeenCalledWith(
        '/retained-samples/rs-1/inspections',
        { inspection_type: 'visual', inspection_record_id: 'ir-1' },
      );
      expect(result).toEqual(mockResult);
    });
  });
});
