import { TraceabilityService } from './traceability.service';
import { normalizeTraceDepth, DEFAULT_TRACE_DEPTH, MAX_TRACE_DEPTH } from './evidence-snapshot.helpers';

describe('normalizeTraceDepth (depth enforcement spec)', () => {
  it('defaults to DEFAULT_TRACE_DEPTH (3) when depth is undefined', () => {
    expect(normalizeTraceDepth(undefined)).toBe(DEFAULT_TRACE_DEPTH);
    expect(DEFAULT_TRACE_DEPTH).toBe(3);
  });

  it('defaults to DEFAULT_TRACE_DEPTH (3) when depth is 0', () => {
    expect(normalizeTraceDepth(0)).toBe(DEFAULT_TRACE_DEPTH);
  });

  it('clamps to MAX_TRACE_DEPTH (6) when depth exceeds the maximum', () => {
    expect(normalizeTraceDepth(10)).toBe(MAX_TRACE_DEPTH);
    expect(normalizeTraceDepth(7)).toBe(MAX_TRACE_DEPTH);
    expect(MAX_TRACE_DEPTH).toBe(6);
  });

  it('returns depth as-is for valid values between 1 and 6', () => {
    expect(normalizeTraceDepth(1)).toBe(1);
    expect(normalizeTraceDepth(3)).toBe(3);
    expect(normalizeTraceDepth(6)).toBe(6);
  });

  it('truncates fractional values', () => {
    expect(normalizeTraceDepth(3.9)).toBe(3);
    expect(normalizeTraceDepth(6.1)).toBe(6);
  });
});

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
      // InspectionRecord schema: object_type/object_id/overall_result/inspected_at (no source_id/record_no)
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      // CorrectiveAction links via trigger_type/trigger_id, loaded via NC ids
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      // ApprovalInstance (not approvalRecord) — resourceType/resourceId/status/completedAt/createdById
      approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
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

  it('accepts product_recall as rootObjectType and stores real batch linkage', async () => {
    // ProductRecall has NO product_id scalar and NO batch_ids array.
    // Batch linkage is via the ProductRecallBatch relation (must be included).
    const prisma = buildPrisma({
      productRecall: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pr-1',
          recall_no: 'RC-2026-0001',
          status: 'open',
          // batches comes from include: { batches: { select: {...} } }
          batches: [
            {
              production_batch_id: 'pb-1',
              batch_number_snapshot: 'PB-001',
              product_name_snapshot: 'Cookie',
            },
          ],
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
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
    // Verify real batch linkage is stored in snapshotData (not product_id/batch_ids scalars)
    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData.root.display.batches).toHaveLength(1);
    expect(savedData.root.display.batches[0]).toMatchObject({
      productionBatchId: 'pb-1',
      batchNumberSnapshot: 'PB-001',
      productNameSnapshot: 'Cookie',
    });
    // Verify no product_id/batch_ids scalars from the non-existent columns
    expect(savedData.root.display.productId).toBeUndefined();
    expect(savedData.root.display.batchIds).toBeUndefined();
  });

  it('accepts traceability_drill as rootObjectType and derives label from drill_type + drill_date', async () => {
    // TraceabilityDrill schema has NO drill_no column.
    // Label is derived from drill_type + drill_date.
    const prisma = buildPrisma({
      traceabilityDrill: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'td-1',
          // No drill_no — that column does not exist in the schema.
          status: 'completed',
          drill_type: 'forward',
          drill_date: new Date('2026-05-28'),
          root_object_type: 'production_batch',
          root_object_id: 'pb-99',
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
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
            root: { type: 'traceability_drill', id: 'td-1', label: 'forward@2026-05-28' },
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
    // Verify label is derived from drill_type + drill_date (no drill_no in schema)
    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData.root.label).toBe('forward@2026-05-28');
    // Verify root_object_type/root_object_id are stored in display
    expect(savedData.root.display.rootObjectType).toBe('production_batch');
    expect(savedData.root.display.rootObjectId).toBe('pb-99');
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

  it('loadInspections queries real InspectionRecord schema fields (object_type/object_id/overall_result/inspected_at)', async () => {
    // This test exists to catch schema drift. If InspectionRecord field names change,
    // this test will fail before the broken query is silently swallowed by catch {}.
    const inspectionRecord = { findMany: jest.fn().mockResolvedValue([
      { id: 'ir-1', overall_result: 'pass', inspected_at: new Date('2026-05-28T10:00:00.000Z') },
    ]) };
    const prisma = buildPrisma({
      inspectionRecord,
      approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
      maxDepth: 3,
    } as any);

    // Verify the query uses object_type/object_id (not source_id/record_no which don't exist)
    expect(inspectionRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          object_type: expect.any(String),
          object_id: expect.objectContaining({ in: expect.any(Array) }),
        }),
        select: expect.objectContaining({
          overall_result: true,
          inspected_at: true,
        }),
      }),
    );
    // Verify the snapshot encodes the inspection correctly
    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData.inspections).toHaveLength(1);
    expect(savedData.inspections[0]).toMatchObject({ id: 'ir-1', result: 'pass' });
  });

  it('loadApprovals queries real ApprovalInstance model (not approvalRecord which does not exist)', async () => {
    const approvalInstance = { findMany: jest.fn().mockResolvedValue([
      { id: 'ai-1', createdById: 'user-1', status: 'APPROVED', completedAt: new Date('2026-05-28T12:00:00.000Z') },
    ]) };
    const prisma = buildPrisma({
      approvalInstance,
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    } as any);

    // Verify the query uses ApprovalInstance schema fields (resourceType/resourceId)
    expect(approvalInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resourceType: expect.any(String),
          resourceId: expect.objectContaining({ in: expect.any(Array) }),
        }),
        select: expect.objectContaining({
          createdById: true,
          status: true,
          completedAt: true,
        }),
      }),
    );
    const savedData = prisma.traceabilitySnapshot.create.mock.calls[0][0].data.snapshotData as any;
    expect(savedData.approvals).toHaveLength(1);
    expect(savedData.approvals[0]).toMatchObject({ id: 'ai-1', approverId: 'user-1', status: 'APPROVED' });
  });
});

describe('TraceabilityService default evidence export layouts (Task 14-5)', () => {
  const baseBatch = {
    id: 'pb-layout-1',
    company_id: 'co-1',
    batchNumber: 'PB-LAYOUT-001',
    status: 'completed',
    actualQuantity: 50,
    unit: 'kg',
    productionDate: new Date('2026-05-30T00:00:00.000Z'),
  };

  const buildPrisma = (overrides: Record<string, any> = {}) => ({
    traceabilitySnapshot: {
      create: jest.fn().mockResolvedValue({
        id: 'snapshot-layout-1',
        rootObjectType: 'production_batch',
        rootObjectId: 'pb-layout-1',
        readinessStatus: 'complete',
        snapshotPurpose: 'evidence_export',
        snapshotData: {
          root: { type: 'production_batch', id: 'pb-layout-1', display: { batchNumber: 'PB-LAYOUT-001', status: 'completed' } },
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
      create: jest.fn().mockResolvedValue({ id: 'export-layout-1', snapshotId: 'snapshot-layout-1', templateVersion: 'traceability_default_v1' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    evidenceFile: {
      create: jest.fn().mockResolvedValue({ id: 'file-layout-1', fileName: 'evidence.pdf' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    productionBatch: { findFirst: jest.fn().mockResolvedValue(baseBatch) },
    // At least one material usage needed for hasMainChain to be true
    batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([{ materialBatchId: 'mb-layout-1', quantity: 10, usedAt: new Date() }]) },
    materialBatch: { findMany: jest.fn().mockResolvedValue([{ id: 'mb-layout-1', batchNumber: 'MB-L-001', status: 'normal', materialId: 'm-1' }]) },
    nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
    inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
    correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
    approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  });

  it('does not require ExportTemplate prisma model — evidenceExport.create is called without templateId field', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'co-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-layout-1',
    } as any);

    expect(prisma.evidenceExport.create).toHaveBeenCalled();
    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    // Must NOT reference an ExportTemplate by id — no template lookup table
    expect(createArgs).not.toHaveProperty('templateId');
    expect(createArgs).not.toHaveProperty('exportTemplateId');
  });

  it('stores traceability_default_v1 layout code in templateVersion for production_batch exports', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'co-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-layout-1',
    } as any);

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.templateVersion).toBe('traceability_default_v1');
  });

  it('stores traceability_default_v1 layout code for material_batch exports', async () => {
    const prisma = buildPrisma({
      materialBatch: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mb-layout-1',
          batchNumber: 'MB-LAYOUT-001',
          status: 'normal',
          materialId: 'm-1',
        }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
      inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
      approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
      evidenceFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-mb-layout' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-mb-layout',
          rootObjectType: 'material_batch',
          rootObjectId: 'mb-layout-1',
          readinessStatus: 'complete',
          snapshotPurpose: 'evidence_export',
          snapshotData: {
            root: { type: 'material_batch', id: 'mb-layout-1', label: 'MB-LAYOUT-001' },
            upstream: [], downstream: [], inspections: [],
            nonConformances: [], correctiveActions: [], approvals: [], evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
      evidenceExport: {
        create: jest.fn().mockResolvedValue({ id: 'export-mb-layout', snapshotId: 'snapshot-mb-layout', templateVersion: 'traceability_default_v1' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      productionBatch: { findFirst: jest.fn().mockResolvedValue(null) },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createTraceContextSnapshot({
      company_id: 'co-1',
      rootObjectType: 'material_batch',
      rootObjectId: 'mb-layout-1',
    } as any);

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.templateVersion).toBe('traceability_default_v1');
  });

  it('preserves existing templateVersion when caller provides one (e.g., advanced page override)', async () => {
    const prisma = buildPrisma({
      traceabilitySnapshot: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'snap-adv-1',
          company_id: 'co-1',
          readinessStatus: 'complete',
          rootObjectType: 'production_batch',
          rootObjectId: 'pb-layout-1',
          snapshotData: {
            root: { type: 'production_batch', id: 'pb-layout-1', display: {} },
            upstream: [], downstream: [], inspections: [],
            nonConformances: [], correctiveActions: [], approvals: [], evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.exportFromExistingSnapshot('snap-adv-1', {
      companyId: 'co-1',
      requesterId: 'user-1',
      templateVersion: 'custom_layout_v2',
    });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.templateVersion).toBe('custom_layout_v2');
  });

  it('uses traceability_default_v1 when no templateVersion is passed to exportFromExistingSnapshot', async () => {
    const prisma = buildPrisma({
      traceabilitySnapshot: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'snap-adv-2',
          company_id: 'co-1',
          readinessStatus: 'complete',
          rootObjectType: 'production_batch',
          rootObjectId: 'pb-layout-1',
          snapshotData: {
            root: { type: 'production_batch', id: 'pb-layout-1', display: {} },
            upstream: [], downstream: [], inspections: [],
            nonConformances: [], correctiveActions: [], approvals: [], evidenceFiles: [],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.exportFromExistingSnapshot('snap-adv-2', { companyId: 'co-1', requesterId: 'user-1' });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.templateVersion).toBe('traceability_default_v1');
  });
});

// ── Phase 14 Task 6: Enhanced EvidenceExport Package Generation ────────────────

describe('TraceabilityService.createEvidenceExport (Task 14-6)', () => {
  const baseBatch = {
    id: 'pb-ev-1',
    batchNumber: 'PB-EV-001',
    status: 'completed',
    productId: 'p-1',
    productName: 'Cookie',
    actualQuantity: 100,
    unit: 'kg',
    productionDate: new Date('2026-05-30T00:00:00.000Z'),
  };

  const buildPrisma = (overrides: Record<string, any> = {}) => ({
    traceabilitySnapshot: {
      create: jest.fn().mockResolvedValue({
        id: 'snapshot-ev-1',
        rootObjectType: 'production_batch',
        rootObjectId: 'pb-ev-1',
        readinessStatus: 'complete',
        snapshotPurpose: 'evidence_export',
        snapshotData: {
          root: { type: 'production_batch', id: 'pb-ev-1', display: { batchNumber: 'PB-EV-001', status: 'completed' } },
          upstream: [{ type: 'material_batch', id: 'mb-1' }],
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
      create: jest.fn().mockResolvedValue({
        id: 'export-ev-1',
        snapshotId: 'snapshot-ev-1',
        templateVersion: 'traceability_default_v1',
        approvalSnapshot: null,
        attachmentIndex: null,
      }),
    },
    evidenceFile: {
      create: jest.fn().mockResolvedValue({ id: 'file-ev-1', fileName: 'evidence.pdf' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    productionBatch: { findFirst: jest.fn().mockResolvedValue(baseBatch) },
    batchMaterialUsage: {
      findMany: jest.fn().mockResolvedValue([
        { materialBatchId: 'mb-1', quantity: 10, usedAt: new Date('2026-05-30T00:00:00.000Z') },
      ]),
    },
    materialBatch: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'mb-1', batchNumber: 'MB-001', status: 'normal', materialId: 'm-1' },
      ]),
    },
    nonConformance: { findMany: jest.fn().mockResolvedValue([]) },
    inspectionRecord: { findMany: jest.fn().mockResolvedValue([]) },
    correctiveAction: { findMany: jest.fn().mockResolvedValue([]) },
    approvalInstance: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  });

  it('rejects formal export for non-production_batch resource types', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await expect(
      service.createEvidenceExport({
        companyId: 'co-1',
        resourceType: 'material_batch',
        resourceId: 'mb-1',
        exportMode: 'formal',
        requesterId: 'user-1',
      }),
    ).rejects.toThrow(/production_batch/i);

    await expect(
      service.createEvidenceExport({
        companyId: 'co-1',
        resourceType: 'product_recall',
        resourceId: 'recall-1',
        exportMode: 'formal',
        requesterId: 'user-1',
      }),
    ).rejects.toThrow(/production_batch/i);
  });

  it('rejects formal export when production batch is not completed', async () => {
    const prisma = buildPrisma({
      productionBatch: {
        findFirst: jest.fn().mockResolvedValue({ ...baseBatch, status: 'in_progress' }),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-preview-1',
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await expect(
      service.createEvidenceExport({
        companyId: 'co-1',
        resourceType: 'production_batch',
        resourceId: 'pb-ev-1',
        exportMode: 'formal',
        requesterId: 'user-1',
      }),
    ).rejects.toThrow(/not ready|incomplete|in_progress/i);
  });

  it('rejects formal export when there are open blockers (open non-conformances)', async () => {
    const prisma = buildPrisma({
      nonConformance: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'nc-1', nc_no: 'NC-001', status: 'open', source_type: 'production_batch', source_id: 'pb-ev-1' },
        ]),
      },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-blocked-1',
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await expect(
      service.createEvidenceExport({
        companyId: 'co-1',
        resourceType: 'production_batch',
        resourceId: 'pb-ev-1',
        exportMode: 'formal',
        requesterId: 'user-1',
      }),
    ).rejects.toThrow(/not ready|incomplete|open non-conformance/i);
  });

  it('does not persist EvidenceExport row for a complete preview (exportMode=preview)', async () => {
    const prisma = buildPrisma(); // snapshot returns readinessStatus='complete'
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'preview',
      requesterId: 'user-1',
    }) as any;

    // Preview mode must never persist an EvidenceExport row, even if the snapshot is complete.
    expect(prisma.evidenceExport.create).not.toHaveBeenCalled();
    expect(prisma.evidenceFile.create).not.toHaveBeenCalled();
    // Should return snapshot data with readinessStatus
    expect(result).toHaveProperty('readinessStatus');
  });

  it('allows preview export even when batch is not ready (status=incomplete returned)', async () => {
    const prisma = buildPrisma({
      productionBatch: {
        findFirst: jest.fn().mockResolvedValue({ ...baseBatch, status: 'in_progress' }),
      },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]) },
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-prev-2',
          readinessStatus: 'incomplete',
          snapshotPurpose: 'preview',
        }),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'preview',
      requesterId: 'user-1',
    }) as any;

    expect(result.readinessStatus).toBe('incomplete');
    // No EvidenceExport row created for preview
    expect(prisma.evidenceExport.create).not.toHaveBeenCalled();
  });

  it('stores approvalSnapshot with only allowed fields (no handwritten/CA signature)', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-1',
      approvalContext: {
        submittedBy: 'user-submit',
        submittedAt: '2026-05-30T09:00:00.000Z',
        reviewedBy: 'user-review',
        reviewedAt: '2026-05-30T10:00:00.000Z',
        conclusion: 'approved',
        opinion: 'All checks passed.',
      },
    });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.approvalSnapshot).toMatchObject({
      submittedBy: 'user-submit',
      submittedAt: '2026-05-30T09:00:00.000Z',
      reviewedBy: 'user-review',
      reviewedAt: '2026-05-30T10:00:00.000Z',
      conclusion: 'approved',
      opinion: 'All checks passed.',
    });
    // Must NOT include handwritten or CA signature fields
    expect(createArgs.approvalSnapshot).not.toHaveProperty('handwrittenSignature');
    expect(createArgs.approvalSnapshot).not.toHaveProperty('caSignature');
    expect(createArgs.approvalSnapshot).not.toHaveProperty('digitalSignature');
  });

  it('stores approvalSnapshot with nulls when no approval context is provided', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-1',
    });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.approvalSnapshot).toMatchObject({
      submittedBy: null,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      conclusion: 'not_required',
      opinion: null,
    });
  });

  it('creates a new EvidenceFile for every export (historical exports are immutable, never overwritten)', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    // First export
    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-1',
    });

    const firstFileArgs = prisma.evidenceFile.create.mock.calls[0][0].data;
    const firstExportArgs = prisma.evidenceExport.create.mock.calls[0][0].data;

    // Reset and run second export
    prisma.traceabilitySnapshot.create.mockResolvedValueOnce({
      id: 'snapshot-ev-2',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-ev-1',
      readinessStatus: 'complete',
      snapshotPurpose: 'evidence_export',
      snapshotData: { root: {}, upstream: [], downstream: [], generatedAt: new Date().toISOString() },
    });
    prisma.evidenceFile.create.mockResolvedValueOnce({ id: 'file-ev-2', fileName: 'evidence2.pdf' });
    prisma.evidenceExport.create.mockResolvedValueOnce({ id: 'export-ev-2', snapshotId: 'snapshot-ev-2' });

    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-2',
    });

    // Two separate EvidenceFile rows created (no overwrite)
    expect(prisma.evidenceFile.create).toHaveBeenCalledTimes(2);
    // Two separate EvidenceExport rows created (no overwrite)
    expect(prisma.evidenceExport.create).toHaveBeenCalledTimes(2);

    const secondFileArgs = prisma.evidenceFile.create.mock.calls[1][0].data;
    const secondExportArgs = prisma.evidenceExport.create.mock.calls[1][0].data;

    // Each export references a different snapshot (fresh immutable snapshot per call)
    expect(firstExportArgs.snapshotId).not.toBe(secondExportArgs.snapshotId);
    // Each EvidenceFile has a distinct fileName/path (includes snapshotId)
    expect(firstFileArgs.filePath).not.toBe(secondFileArgs.filePath);
  });

  it('builds attachmentIndex from snapshotData.evidenceFiles (full chain, no extra DB query)', async () => {
    // The snapshot already contains evidence files for the full upstream chain
    // (batch + material batches). attachmentIndex must read from snapshotData, not
    // issue a fresh loadEvidenceFiles call that would only see the root batch.
    const prisma = buildPrisma({
      traceabilitySnapshot: {
        create: jest.fn().mockResolvedValue({
          id: 'snapshot-ev-att',
          rootObjectType: 'production_batch',
          rootObjectId: 'pb-ev-1',
          readinessStatus: 'complete',
          snapshotPurpose: 'evidence_export',
          snapshotData: {
            root: { type: 'production_batch', id: 'pb-ev-1', display: { batchNumber: 'PB-EV-001', status: 'completed' } },
            upstream: [{ type: 'material_batch', id: 'mb-1' }],
            downstream: [],
            inspections: [],
            nonConformances: [],
            correctiveActions: [],
            approvals: [],
            evidenceFiles: [
              { id: 'att-1', fileName: 'batch-record.pdf', filePath: '/evidence/batch-record.pdf', mimeType: 'application/pdf' },
              { id: 'att-2', fileName: 'inspection-report.pdf', filePath: '/evidence/inspection.pdf', mimeType: 'application/pdf' },
            ],
            generatedAt: new Date().toISOString(),
          },
        }),
      },
      evidenceFile: {
        create: jest.fn().mockResolvedValue({ id: 'file-ev-3', fileName: 'evidence.pdf' }),
        // findMany should NOT be called for building attachmentIndex
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-1',
    });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    // count and refs must reflect the snapshotData.evidenceFiles (2 entries)
    expect(createArgs.attachmentIndex.count).toBe(2);
    expect(createArgs.attachmentIndex.refs).toHaveLength(2);
    expect(createArgs.attachmentIndex.refs[0]).toMatchObject({
      id: 'att-1',
      fileName: 'batch-record.pdf',
      filePath: '/evidence/batch-record.pdf',
      mimeType: 'application/pdf',
    });
    expect(createArgs.attachmentIndex.refs[1]).toMatchObject({
      id: 'att-2',
      fileName: 'inspection-report.pdf',
      filePath: '/evidence/inspection.pdf',
      mimeType: 'application/pdf',
    });
    // loadRelatedFacts calls findMany once for the full upstream chain during snapshot build.
    // createEvidenceExport must NOT issue a second findMany call (for just [resourceId])
    // to build the attachmentIndex — it must reuse snapshotData.evidenceFiles instead.
    const findManyCalls = prisma.evidenceFile.findMany.mock.calls;
    expect(findManyCalls.length).toBe(1);
    // The one allowed call must cover the full chain (batch + material batches), not only [resourceId]
    const calledIds: string[] = findManyCalls[0][0].where.resourceId.in;
    expect(calledIds.length).toBeGreaterThan(1);
  });

  it('creates EvidenceExport with default layout traceability_default_v1', async () => {
    const prisma = buildPrisma();
    const service = new TraceabilityService(prisma as any, {} as any, {} as any, {} as any);

    await service.createEvidenceExport({
      companyId: 'co-1',
      resourceType: 'production_batch',
      resourceId: 'pb-ev-1',
      exportMode: 'formal',
      requesterId: 'user-1',
    });

    const createArgs = prisma.evidenceExport.create.mock.calls[0][0].data;
    expect(createArgs.templateVersion).toBe('traceability_default_v1');
    expect(createArgs.exportScope).toBe('main_chain_evidence');
    expect(createArgs.summaryFormat).toBe('pdf');
  });
});
