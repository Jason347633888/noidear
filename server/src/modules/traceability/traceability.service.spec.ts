import { TraceabilityService } from './traceability.service';

describe('TraceabilityService recall actions', () => {
  it('delegates recallAssessment actions to TraceabilityLinkageService', async () => {
    const linkageService = {
      create: jest.fn().mockResolvedValue({
        actionType: 'recallAssessment',
        status: 'pendingReview',
        productRecall: { id: 'recall-1', recall_no: 'RC-2026-0001' },
      }),
    };
    const service = new TraceabilityService({} as any, {} as any, linkageService as any, {} as any);

    const result = await service.createAction(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' } as any,
    );

    expect(linkageService.create).toHaveBeenCalledWith(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' },
    );
    expect((result as any).productRecall).toEqual({ id: 'recall-1', recall_no: 'RC-2026-0001' });
  });
});

describe('TraceabilityService snapshot/export delegation', () => {
  const prisma = {};

  it('delegates export creation to TraceabilityExportService', async () => {
    const exportService = {
      create: jest.fn().mockResolvedValue({ exportId: 'snap-1', snapshotId: 'snap-1' }),
    };
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, exportService as any);

    await expect(
      service.createExport({ exportMode: 'simple', sourceQueryRef: 'hash-001' }, { id: 'user-1' }),
    ).resolves.toMatchObject({ snapshotId: 'snap-1' });
    expect(exportService.create).toHaveBeenCalledWith(
      { exportMode: 'simple', sourceQueryRef: 'hash-001' },
      { id: 'user-1' },
    );
  });

  it('delegates snapshot creation and reads to TraceabilityExportService', async () => {
    const exportService = {
      createSnapshot: jest.fn().mockResolvedValue({ snapshotId: 'snap-2' }),
      getSnapshot: jest.fn().mockResolvedValue({ snapshotId: 'snap-2' }),
      getSnapshotResult: jest.fn().mockResolvedValue({ summary: { queryId: 'q-1' } }),
    };
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, exportService as any);
    const currentUser = { id: 'user-2', companyId: 'company-1' };

    await expect(
      service.createSnapshot({ sourceQueryRef: 'hash-002', snapshotType: 'query' }, currentUser),
    ).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshot('snap-2', currentUser)).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshotResult('snap-2', currentUser)).resolves.toMatchObject({ summary: { queryId: 'q-1' } });
    expect(exportService.getSnapshot).toHaveBeenCalledWith('snap-2', currentUser);
    expect(exportService.getSnapshotResult).toHaveBeenCalledWith('snap-2', currentUser);
  });
});

describe('TraceabilityService trace-context snapshot (Task 9)', () => {
  const baseBatch = {
    id: 'pb-1',
    batchNumber: 'PB-20260528-001',
    status: 'completed',
    productId: 'p-1',
    productName: 'Cookie',
    actualQuantity: 100,
    unit: 'kg',
    productionDate: new Date('2026-05-28T00:00:00.000Z'),
  };

  const buildPrisma = (overrides: Record<string, any> = {}) => ({
    traceabilitySnapshot: {
      create: jest.fn().mockResolvedValue({
        id: 'snapshot-1',
        rootObjectType: 'production_batch',
        rootObjectId: 'pb-1',
        readinessStatus: 'complete',
        snapshotPurpose: 'evidence_export',
        snapshotData: {
          root: {
            type: 'production_batch',
            id: 'pb-1',
            display: { batchNumber: 'PB-20260528-001', status: 'completed' },
          },
          upstream: [],
          downstream: [],
        },
      }),
    },
    evidenceExport: {
      create: jest.fn().mockResolvedValue({ id: 'export-1', snapshotId: 'snapshot-1' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    evidenceFile: {
      create: jest.fn().mockResolvedValue({ id: 'file-1', fileName: 'evidence.pdf' }),
    },
    productionBatch: { findFirst: jest.fn().mockResolvedValue(baseBatch) },
    batchMaterialUsage: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ materialBatchId: 'mb-1', quantity: 10, usedAt: new Date('2026-05-28T00:00:00.000Z') }]),
    },
    materialBatch: {
      findMany: jest.fn().mockResolvedValue([{ id: 'mb-1', batchNumber: 'MB-001', status: 'normal', materialId: 'm-1' }]),
    },
    nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  });

  it('returns bounded trace context with root object and evidence links', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
      maxDepth: 3,
    } as any);

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: 'tenant-1',
          rootObjectType: 'production_batch',
          rootObjectId: 'pb-1',
        }),
      }),
    );
    expect(snapshot.id).toBe('snapshot-1');
    // ready batch (completed, no open NC) -> EvidenceExport created
    expect(prisma.evidenceExport.create).toHaveBeenCalled();
  });

  it('rejects unsupported root object types', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await expect(
      service.createTraceContextSnapshot({
        company_id: 'tenant-1',
        rootObjectType: 'unknown_type',
        rootObjectId: 'x-1',
      } as any),
    ).rejects.toThrow();
    expect(prisma.traceabilitySnapshot.create).not.toHaveBeenCalled();
  });

  it('accepts material_batch as rootObjectType and returns snapshot with full output shape', async () => {
    const prisma = buildPrisma({
      materialBatch: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mb-1',
          batchNumber: 'MB-001',
          status: 'normal',
          materialId: 'm-1',
          supplierBatchNo: 'SUP-001',
          quantity: 500,
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalRecord: { findMany: jest.fn().mockResolvedValue([]) },
      evidenceFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-2' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-mb-1',
          rootObjectType: 'material_batch',
          rootObjectId: 'mb-1',
          readinessStatus: 'complete',
          snapshotPurpose: 'evidence_export',
          snapshotData: {
            root: { type: 'material_batch', id: 'mb-1', label: 'MB-001' },
            upstream: [],
            downstream: [],
            inspections: [],
            nonConformances: [],
            correctiveActions: [],
            approvals: [],
            evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
      evidenceExport: {
        create: jest.fn().mockResolvedValue({ id: 'export-mb-1', snapshotId: 'snapshot-mb-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      productionBatch: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'material_batch',
      rootObjectId: 'mb-1',
    } as any);

    expect(snapshot.id).toBe('snapshot-mb-1');
    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rootObjectType: 'material_batch',
          rootObjectId: 'mb-1',
        }),
      }),
    );
    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData).toMatchObject({
      root: expect.objectContaining({ type: 'material_batch', id: 'mb-1' }),
      upstream: expect.any(Array),
      downstream: expect.any(Array),
      inspections: expect.any(Array),
      nonConformances: expect.any(Array),
      correctiveActions: expect.any(Array),
      approvals: expect.any(Array),
      evidenceFiles: expect.any(Array),
      generatedAt: expect.any(String),
    });
  });

  it('accepts product_recall as rootObjectType', async () => {
    const prisma = buildPrisma({
      productRecall: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pr-1',
          recall_no: 'RC-2026-0001',
          status: 'open',
          product_id: 'p-1',
          batch_ids: ['pb-1'],
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalRecord: { findMany: jest.fn().mockResolvedValue([]) },
      evidenceFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-3' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-pr-1',
          rootObjectType: 'product_recall',
          rootObjectId: 'pr-1',
          readinessStatus: 'complete',
          snapshotPurpose: 'evidence_export',
          snapshotData: {
            root: { type: 'product_recall', id: 'pr-1', label: 'RC-2026-0001' },
            upstream: [],
            downstream: [],
            inspections: [],
            nonConformances: [],
            correctiveActions: [],
            approvals: [],
            evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
      evidenceExport: {
        create: jest.fn().mockResolvedValue({ id: 'export-pr-1', snapshotId: 'snapshot-pr-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      productionBatch: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'product_recall',
      rootObjectId: 'pr-1',
    } as any);

    expect(snapshot.id).toBe('snapshot-pr-1');
  });

  it('accepts traceability_drill as rootObjectType', async () => {
    const prisma = buildPrisma({
      traceabilityDrill: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'td-1',
          drill_no: 'TD-2026-0001',
          status: 'completed',
          drill_type: 'forward',
          drill_date: new Date('2026-05-28'),
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalRecord: { findMany: jest.fn().mockResolvedValue([]) },
      evidenceFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-4' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-td-1',
          rootObjectType: 'traceability_drill',
          rootObjectId: 'td-1',
          readinessStatus: 'complete',
          snapshotPurpose: 'evidence_export',
          snapshotData: {
            root: { type: 'traceability_drill', id: 'td-1', label: 'TD-2026-0001' },
            upstream: [],
            downstream: [],
            inspections: [],
            nonConformances: [],
            correctiveActions: [],
            approvals: [],
            evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
      evidenceExport: {
        create: jest.fn().mockResolvedValue({ id: 'export-td-1', snapshotId: 'snapshot-td-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      productionBatch: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'traceability_drill',
      rootObjectId: 'td-1',
    } as any);

    expect(snapshot.id).toBe('snapshot-td-1');
  });

  it('snapshot output for production_batch includes full shape with generatedAt', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
      maxDepth: 3,
    } as any);

    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData).toMatchObject({
      root: expect.objectContaining({ type: 'production_batch', id: 'pb-1' }),
      upstream: expect.any(Array),
      downstream: expect.any(Array),
      inspections: expect.any(Array),
      nonConformances: expect.any(Array),
      correctiveActions: expect.any(Array),
      approvals: expect.any(Array),
      evidenceFiles: expect.any(Array),
      generatedAt: expect.any(String),
    });
  });

  it('old snapshot does not change after source data changes (immutability)', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    // First call - creates the snapshot
    await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    } as any);

    const firstCallData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    const firstUpstreamLength = firstCallData.upstream.length;

    // Simulate changing source data for the NEXT call: add another material usage
    prisma.batchMaterialUsage.findMany.mockResolvedValueOnce([
      { materialBatchId: 'mb-1', quantity: 10, usedAt: new Date() },
      { materialBatchId: 'mb-2', quantity: 20, usedAt: new Date() },
    ]);
    prisma.materialBatch.findMany.mockResolvedValueOnce([
      { id: 'mb-1', batchNumber: 'MB-001', status: 'normal', materialId: 'm-1' },
      { id: 'mb-2', batchNumber: 'MB-002', status: 'normal', materialId: 'm-2' },
    ]);
    prisma.traceabilitySnapshot.create.mockResolvedValueOnce({
      id: 'snapshot-new',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
      readinessStatus: 'complete',
      snapshotData: {},
    });

    await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    } as any);

    const secondCallData = prisma.traceabilitySnapshot.create.mock.calls[1][0].data.snapshotData as any;
    // First snapshot still has only 1 upstream node (unchanged)
    expect(firstCallData.upstream).toHaveLength(firstUpstreamLength);
    // Second snapshot has 2 upstream nodes (reflects new state)
    expect(secondCallData.upstream).toHaveLength(2);
  });

  it('incomplete snapshot includes readiness reasons in response', async () => {
    const prisma = buildPrisma({
      productionBatch: {
        findFirst: jest.fn().mockResolvedValue({ ...baseBatch, status: 'in_progress' }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-preview',
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    } as any) as any;

    expect(snapshot.readinessReasons).toBeDefined();
    expect(Array.isArray(snapshot.readinessReasons)).toBe(true);
    expect(snapshot.readinessReasons.length).toBeGreaterThan(0);
    // Should mention batch status reason
    expect(snapshot.readinessReasons.some((r: string) => r.includes('in_progress'))).toBe(true);
  });

  it('returns a preview snapshot (no EvidenceExport) when the batch is not ready', async () => {
    const prisma = buildPrisma({
      productionBatch: {
        findFirst: jest.fn().mockResolvedValue({ ...baseBatch, status: 'in_progress' }),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-2',
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const snapshot = await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    } as any);

    expect(snapshot.id).toBe('snapshot-2');
    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      }),
    );
    expect(prisma.evidenceExport.create).not.toHaveBeenCalled();
  });
});
