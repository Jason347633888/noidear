import { traceabilityApi } from '@/api/traceability';

vi.mock('@/api/request', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe('traceabilityApi contract adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the frozen query contract to /traceability/query', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.query({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/query', expect.objectContaining({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
    }));
  });

  it('creates linkage with sourceQueryRef field', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.createLinkage({
      actionType: 'deviation',
      sourceQueryRef: 'hash-001',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/actions', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('creates export with sourceQueryRef field', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.export({
      exportMode: 'simple',
      sourceQueryRef: 'hash-001',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/export', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('creates snapshot via POST /traceability/snapshots', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.createSnapshot({
      sourceQueryRef: 'hash-001',
      snapshotType: 'query',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/snapshots', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('fetches snapshot via GET /traceability/snapshots/:id', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.getSnapshot('snap-123');
    expect(request.get).toHaveBeenCalledWith('/traceability/snapshots/snap-123');
  });
});
