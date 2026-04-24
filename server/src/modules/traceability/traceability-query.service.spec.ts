import { TraceabilityQueryService } from './traceability-query.service';

describe('TraceabilityQueryService contract', () => {
  it('builds a ledger-and-graph result with stable top-level keys', async () => {
    const prisma = {
      materialBatch: { findFirst: jest.fn().mockResolvedValue({ id: 'mb-1', batch_no: 'RM-001' }) },
    };
    const modelLanding = { getSummary: jest.fn().mockReturnValue({ totalForms: 283, totalGroups: 59 }) };
    const service = new TraceabilityQueryService(prisma as any, modelLanding as any);

    await expect(
      service.query({
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'mb-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
      }, { department: '品质', scenarioPermissions: ['forwardTrace'] } as any),
    ).resolves.toMatchObject({
      summary: expect.objectContaining({ objectType: 'materialLot', traceMode: 'forward', timeMode: 'current' }),
      ledger: expect.any(Array),
      graph: expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) }),
      risks: expect.any(Array),
      evidence: expect.any(Array),
      permission: expect.any(Object),
    });
  });
});
