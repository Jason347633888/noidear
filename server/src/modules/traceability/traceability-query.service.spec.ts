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

  it('trims traceability actions for warehouse users', () => {
    const service = new TraceabilityQueryService({} as any, {} as any);
    const response = service.getTraceabilityPermissionView({
      department: '仓储',
      scenarioPermissions: ['forwardTrace', 'materialBalance'],
    } as any);

    expect(response.canViewSummary).toBe(true);
    expect(response.canViewDetail).toBe(true);
    expect(response.canInitiateAction).toBe(true);
    expect(response.canExecuteHighRiskAction).toBe(false);
  });

  it('assembles the main traceability chain for a material lot query', async () => {
    const prisma = {
      materialBatch: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mb-1',
          batch_no: 'RM-001',
          batchMaterialUsages: [{ id: 'use-1', productionBatchId: 'pb-1', quantity: 25 }],
        }),
      },
      // TASK-9: finishedGoods removed from productionBatch — no fg nodes in ledger
      productionBatch: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'pb-1', batch_no: 'PB-001', delivery_notes: [{ id: 'dn-1', delivery_no: 'DN-001' }] },
        ]),
      },
    };

    const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
    const result = await service.query(
      {
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'mb-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
      },
      { department: '品质', scenarioPermissions: ['forwardTrace'] } as any,
    );

    expect(result.ledger.map((row) => row.nodeType)).toEqual([
      'materialLot',
      'ingredientUsage',
      'productionBatch',
      'deliveryNote',
    ]);
  });
});
