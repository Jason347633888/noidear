import { describe, it, expect, vi, beforeEach } from 'vitest';
import batchReleaseApi from '../batch-release';
import request from '../request';

vi.mock('../request', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockRequest = vi.mocked(request);

describe('batchReleaseApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReleaseReadiness', () => {
    it('calls POST /batch-trace/production-batches/:id/release-readiness when ready', async () => {
      const readiness = { ready: true, blockers: [] };
      mockRequest.post.mockResolvedValueOnce(readiness);

      const result = await batchReleaseApi.getReleaseReadiness('batch-1');

      expect(mockRequest.post).toHaveBeenCalledWith(
        '/batch-trace/production-batches/batch-1/release-readiness',
      );
      expect(result).toEqual(readiness);
    });

    it('returns blockers when not ready', async () => {
      const readiness = {
        ready: false,
        blockers: [
          {
            code: 'missing_product_inspection',
            message: '缺少成品检验记录',
            resourceType: 'production_batch',
            resourceId: 'batch-1',
          },
        ],
      };
      mockRequest.post.mockResolvedValueOnce(readiness);

      const result = await batchReleaseApi.getReleaseReadiness('batch-1');

      expect(result.ready).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0].code).toBe('missing_product_inspection');
    });
  });

  describe('releaseBatch', () => {
    it('calls POST /batch-trace/production-batches/:id/release', async () => {
      const released = {
        id: 'batch-1',
        batchNumber: 'PB-2026-001',
        released_at: '2026-05-30T12:00:00Z',
        released_by_id: 'user-1',
      };
      mockRequest.post.mockResolvedValueOnce(released);

      const result = await batchReleaseApi.releaseBatch('batch-1');

      expect(mockRequest.post).toHaveBeenCalledWith(
        '/batch-trace/production-batches/batch-1/release',
      );
      expect(result).toEqual(released);
    });
  });
});
