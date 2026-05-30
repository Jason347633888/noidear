import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import request from '@/api/request';
import { traceabilityDrillApi } from '@/api/traceability-drill';

describe('traceabilityDrillApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as any).mockResolvedValue({ data: [] });
    (request.post as any).mockResolvedValue({ data: {} });
    (request.patch as any).mockResolvedValue({ data: {} });
  });

  it('calls GET /traceability/drills for list', async () => {
    await traceabilityDrillApi.getList();
    expect(request.get).toHaveBeenCalledWith('/traceability/drills', { params: undefined });
  });

  it('calls GET /traceability/drills/:id for detail', async () => {
    await traceabilityDrillApi.getDetail('drill-1');
    expect(request.get).toHaveBeenCalledWith('/traceability/drills/drill-1');
  });

  it('calls POST /traceability/drills to plan a drill', async () => {
    const payload = {
      drill_type: 'forward' as const,
      drill_date: '2026-06-01',
      root_object_type: 'production_batch',
      root_object_id: 'batch-1',
      participants: [],
    };
    await traceabilityDrillApi.plan(payload);
    expect(request.post).toHaveBeenCalledWith('/traceability/drills', payload);
  });

  it('calls POST /traceability/drills/:id/start to start a drill', async () => {
    await traceabilityDrillApi.start('drill-1');
    expect(request.post).toHaveBeenCalledWith('/traceability/drills/drill-1/start');
  });

  it('calls POST /traceability/drills/:id/attach-snapshot to attach snapshot', async () => {
    await traceabilityDrillApi.attachSnapshot('drill-1', 'snap-1');
    expect(request.post).toHaveBeenCalledWith(
      '/traceability/drills/drill-1/attach-snapshot',
      { snapshot_id: 'snap-1' },
    );
  });

  it('calls POST /traceability/drills/:id/conclude to conclude a drill', async () => {
    await traceabilityDrillApi.conclude('drill-1', 'passed');
    expect(request.post).toHaveBeenCalledWith(
      '/traceability/drills/drill-1/conclude',
      { conclusion: 'passed' },
    );
  });

  it('calls POST /traceability/drills/:id/capa to create CAPA', async () => {
    await traceabilityDrillApi.createCapa('drill-1');
    expect(request.post).toHaveBeenCalledWith('/traceability/drills/drill-1/capa');
  });
});
