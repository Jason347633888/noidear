import { traceabilityApi } from '@/api/traceability';

vi.mock('@/api/request', () => ({
  default: { post: vi.fn() },
}));

describe('traceabilityApi', () => {
  it('posts unified query payloads to the new endpoint', async () => {
    const { default: request } = await import('@/api/request');

    await traceabilityApi.query({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });

    expect(request.post).toHaveBeenCalledWith(
      '/traceability/query',
      expect.objectContaining({ objectType: 'materialLot' }),
    );
  });

  it('appends viewMode graph for graph calls', async () => {
    const { default: request } = await import('@/api/request');

    await traceabilityApi.graph({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });

    expect(request.post).toHaveBeenCalledWith(
      '/traceability/query/graph',
      expect.objectContaining({ viewMode: 'graph' }),
    );
  });
});
