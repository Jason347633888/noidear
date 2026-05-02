import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TraceabilityExportService } from './traceability-export.service';

const createPrisma = () => ({
  traceabilitySnapshot: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
});

const snapshotRow = {
  id: 'snap-1',
  company_id: 'company-1',
  sourceQueryHash: 'hash-001',
  exportMode: 'simple',
  requesterId: 'user-1',
  status: 'ready',
  snapshotType: 'export',
  summary: {
    sourceQueryRef: 'hash-001',
    snapshotType: 'export',
    exportMode: 'simple',
    retention: { retentionPolicy: 'audit-default', expiresAt: null },
    payloadRef: 'hash-001',
    resultSummary: { sourceQueryRef: 'hash-001' },
    resultPayload: {
      summary: {
        queryId: 'q-1',
        entryMode: 'object',
        objectType: 'materialLot',
        objectId: 'batch-1',
        traceMode: 'forward',
        viewMode: 'ledger',
        timeMode: 'current',
        riskLevel: 'normal',
        resultStatus: 'ok',
      },
      permission: {},
      risk: { items: [] },
      ledger: { rows: [] },
      graph: { nodes: [], edges: [] },
      evidence: { items: [] },
      actions: { available: [] },
      export: {},
      meta: { queryHash: 'hash-001' },
      extensions: {},
    },
  },
  filePath: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-01T00:00:00.000Z'),
};

describe('TraceabilityExportService', () => {
  it('persists simple exports and returns TraceExportResult with snapshotId', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'simple', sourceQueryRef: 'hash-001', includeEvidence: true },
      { id: 'user-1' } as any,
    );

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceQueryHash: 'hash-001',
        exportMode: 'simple',
        requesterId: 'user-1',
        status: 'ready',
        snapshotType: 'export',
        summary: expect.objectContaining({
          sourceQueryRef: 'hash-001',
          snapshotType: 'export',
          exportMode: 'simple',
        }),
      }),
    });
    expect(result).toMatchObject({
      exportId: 'snap-1',
      exportMode: 'simple',
      status: 'ready',
      sourceQueryRef: 'hash-001',
      requestedBy: 'user-1',
      snapshotId: 'snap-1',
      downloadRef: null,
    });
  });

  it('persists fullPackage exports as queued and returns TraceExportResult', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue({
      ...snapshotRow,
      id: 'snap-2',
      sourceQueryHash: 'hash-002',
      requesterId: 'user-2',
      exportMode: 'fullPackage',
      status: 'queued',
      summary: { ...snapshotRow.summary, sourceQueryRef: 'hash-002', payloadRef: 'hash-002', exportMode: 'fullPackage' },
    });
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'fullPackage', sourceQueryRef: 'hash-002' },
      { id: 'user-2' } as any,
    );

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceQueryHash: 'hash-002',
        exportMode: 'fullPackage',
        requesterId: 'user-2',
        status: 'queued',
        snapshotType: 'export',
      }),
    });
    expect(result).toMatchObject({
      exportId: 'snap-2',
      exportMode: 'fullPackage',
      status: 'queued',
      sourceQueryRef: 'hash-002',
      requestedBy: 'user-2',
      snapshotId: 'snap-2',
    });
  });

  it('creates query snapshots and maps database row to TraceSnapshotResult', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.create.mockResolvedValue({
      ...snapshotRow,
      id: 'snap-query',
      sourceQueryHash: 'hash-003',
      exportMode: 'snapshot',
      snapshotType: 'query',
      summary: { ...snapshotRow.summary, sourceQueryRef: 'hash-003', payloadRef: 'hash-003', snapshotType: 'query', exportMode: 'snapshot' },
    });
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.createSnapshot(
      { sourceQueryRef: 'hash-003', snapshotType: 'query', retentionPolicy: 'audit-default' },
      { id: 'user-3' } as any,
    );

    expect(result).toMatchObject({
      snapshotId: 'snap-query',
      sourceQueryRef: 'hash-003',
      snapshotType: 'query',
      status: 'ready',
      payloadRef: 'hash-003',
      expiresAt: null,
    });
  });

  it('reads snapshots from database for same-tenant user', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.getSnapshot('snap-1', { id: 'user-1', companyId: 'company-1' });

    expect(prisma.traceabilitySnapshot.findUnique).toHaveBeenCalledWith({ where: { id: 'snap-1' } });
    expect(result).toMatchObject({
      snapshotId: 'snap-1',
      sourceQueryRef: 'hash-001',
      snapshotType: 'export',
      status: 'ready',
    });
  });

  it('rejects cross-tenant snapshot reads with ForbiddenException', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    await expect(
      service.getSnapshot('snap-1', { id: 'attacker', companyId: 'other-company' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException for missing snapshots', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(null);
    const service = new TraceabilityExportService(prisma as any);

    await expect(service.getSnapshot('missing', { id: 'user-1', companyId: 'company-1' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns persisted formal result payload for snapshot result', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue(snapshotRow);
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.getSnapshotResult('snap-1', { id: 'user-1', companyId: 'company-1' }) as any;

    expect(result.summary.queryId).toBe('q-1');
    expect(result.meta.queryHash).toBe('hash-001');
  });

  it('throws ConflictException when snapshot has no formal result payload', async () => {
    const prisma = createPrisma();
    prisma.traceabilitySnapshot.findUnique.mockResolvedValue({
      ...snapshotRow,
      summary: { sourceQueryRef: 'hash-001', snapshotType: 'export' },
    });
    const service = new TraceabilityExportService(prisma as any);

    await expect(service.getSnapshotResult('snap-1', { id: 'user-1', companyId: 'company-1' })).rejects.toBeInstanceOf(ConflictException);
  });
});
