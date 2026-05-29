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

  it('rejects non production_batch root object types', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await expect(
      service.createTraceContextSnapshot({
        company_id: 'tenant-1',
        rootObjectType: 'material_batch',
        rootObjectId: 'mb-1',
      } as any),
    ).rejects.toThrow();
    expect(prisma.traceabilitySnapshot.create).not.toHaveBeenCalled();
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
