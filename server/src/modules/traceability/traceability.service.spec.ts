import { TraceabilityService } from './traceability.service';

describe('TraceabilityService snapshot/export delegation', () => {
  const prisma = {};
  const queryService = {};

  it('delegates export creation to TraceabilityExportService', async () => {
    const exportService = {
      create: jest.fn().mockResolvedValue({ exportId: 'snap-1', snapshotId: 'snap-1' }),
    };
    const service = new TraceabilityService(prisma as any, queryService as any, exportService as any);

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
    const service = new TraceabilityService(prisma as any, queryService as any, exportService as any);
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
