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

    await expect(
      service.createSnapshot({ sourceQueryRef: 'hash-002', snapshotType: 'query' }, { id: 'user-2' }),
    ).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshot('snap-2')).resolves.toMatchObject({ snapshotId: 'snap-2' });
    await expect(service.getSnapshotResult('snap-2')).resolves.toMatchObject({ summary: { queryId: 'q-1' } });
  });
});
