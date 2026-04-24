import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productionBatchApi, materialUsageApi } from '@/api/batch';

// Mock the request module
vi.mock('@/api/request', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import request from '@/api/request';
import { traceabilityApi } from '@/api/traceability';

describe('traceability adapter convergence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.post as any).mockResolvedValue({ data: {} });
    (request.get as any).mockResolvedValue({ data: {} });
  });

  it('uses sourceQueryRef for linkage actions', async () => {
    await traceabilityApi.createLinkage({
      actionType: 'recallAssessment',
      sourceQueryRef: 'query-1',
      sourceNodeIds: ['node-1'],
      sourceRiskIds: ['risk-1'],
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/actions', expect.objectContaining({
      sourceQueryRef: 'query-1',
    }));
  });

  it('uses sourceQueryRef for export', async () => {
    await traceabilityApi.export({
      exportMode: 'simple',
      sourceQueryRef: 'query-1',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/export', expect.objectContaining({
      sourceQueryRef: 'query-1',
    }));
  });
});

describe('legacy batch adapter surface', () => {
  it('keeps batch CRUD methods (productionBatchApi and materialUsageApi)', () => {
    expect(typeof productionBatchApi.getList).toBe('function');
    expect(typeof materialUsageApi.getByBatch).toBe('function');
  });

  it('does not expose traceApi (removed duplicate trace query surface)', async () => {
    // traceApi is no longer exported from @/api/batch — verify via dynamic import
    const batchModule = await import('@/api/batch');
    expect('traceApi' in batchModule).toBe(false);
  });
});
