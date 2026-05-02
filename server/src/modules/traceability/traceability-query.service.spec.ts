import { TraceabilityQueryService } from './traceability-query.service';

describe('TraceabilityQueryService contract', () => {
  it('builds a ledger-and-graph result with stable top-level keys', async () => {
    const prisma = {
      materialBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mb-1',
          batchNumber: 'RM-001',
          material: null,
          supplier: null,
          batchMaterialUsages: [],
        }),
      },
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
      ledger: expect.objectContaining({ rows: expect.any(Array) }),
      graph: expect.objectContaining({ nodes: expect.any(Array), edges: expect.any(Array) }),
      risk: expect.objectContaining({ items: expect.any(Array) }),
      evidence: expect.objectContaining({ items: expect.any(Array) }),
      permission: expect.objectContaining({ canInitiateLinkage: expect.any(Boolean) }),
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
    expect(response.canInitiateLinkage).toBe(true);
    expect(response.canExecuteHighRiskAction).toBe(false);
  });

  it('assembles the main traceability chain for a material lot query', async () => {
    const prisma = {
      materialBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'mb-1',
          batchNumber: 'RM-001',
          material: null,
          supplier: null,
          batchMaterialUsages: [
            {
              id: 'use-1',
              quantity: 25,
              productionBatch: {
                id: 'pb-1',
                batchNumber: 'PB-001',
                delivery_notes: [{ id: 'dn-1', dn_no: 'DN-001', customer_name: '客户A', shipped_qty: 100, unit: '箱' }],
              },
            },
          ],
        }),
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

    expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
      'materialLot',
      'ingredientUsage',
      'productionBatch',
      'deliveryNote',
    ]);
  });

  it('assembles a bidirectional chain for a production batch query', async () => {
    const prisma = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pb-1',
          batchNumber: 'PB-001',
          productName: '海绵蛋糕',
          status: 'completed',
          materialUsages: [
            {
              id: 'use-1',
              quantity: 25,
              materialBatch: {
                id: 'mb-1',
                batchNumber: 'RM-001',
                supplierBatchNo: 'SUP-001',
                material: { id: 'mat-1', name: '面粉' },
                supplier: { id: 'sup-1', name: '合格供应商' },
              },
            },
          ],
          delivery_notes: [
            {
              id: 10,
              dn_no: 'DN-001',
              customer_name: '客户A',
              shipped_qty: 100,
              unit: '箱',
            },
          ],
        }),
      },
    };

    const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
    const result = await service.query(
      {
        entryMode: 'object',
        objectType: 'productionBatch',
        objectId: 'pb-1',
        traceMode: 'bidirectional',
        viewMode: 'ledger',
        timeMode: 'current',
      },
      { department: '品质', scenarioPermissions: ['bidirectionalTrace'] } as any,
    );

    expect(result.summary).toMatchObject({
      objectType: 'productionBatch',
      objectId: 'pb-1',
      traceMode: 'bidirectional',
      resultStatus: 'ok',
    });
    expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
      'materialLot',
      'ingredientUsage',
      'productionBatch',
      'deliveryNote',
    ]);
    expect(result.graph.edges.map((edge) => edge.relationType)).toEqual([
      'usedIn',
      'produces',
      'shippedBy',
    ]);
  });

  it('assembles a backward chain from a delivery note query', async () => {
    const prisma = {
      deliveryNote: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          dn_no: 'DN-001',
          customer_name: '客户A',
          shipped_qty: 100,
          unit: '箱',
          production_batch: {
            id: 'pb-1',
            batchNumber: 'PB-001',
            productName: '海绵蛋糕',
            materialUsages: [
              {
                id: 'use-1',
                quantity: 25,
                materialBatch: {
                  id: 'mb-1',
                  batchNumber: 'RM-001',
                  material: { id: 'mat-1', name: '面粉' },
                  supplier: { id: 'sup-1', name: '合格供应商' },
                },
              },
            ],
          },
        }),
      },
    };

    const service = new TraceabilityQueryService(prisma as any, { getSummary: jest.fn() } as any);
    const result = await service.query(
      {
        entryMode: 'object',
        objectType: 'deliveryNote',
        objectId: '10',
        traceMode: 'backward',
        viewMode: 'ledger',
        timeMode: 'current',
      },
      { department: '品质', scenarioPermissions: ['backwardTrace'] } as any,
    );

    expect(result.summary).toMatchObject({
      objectType: 'deliveryNote',
      objectId: '10',
      traceMode: 'backward',
      resultStatus: 'ok',
    });
    expect(result.ledger.rows.map((row) => row.nodeType)).toEqual([
      'deliveryNote',
      'productionBatch',
      'ingredientUsage',
      'materialLot',
    ]);
  });
});
