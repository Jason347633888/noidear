import { TraceabilityExportService } from './traceability-export.service';

describe('TraceabilityExportService', () => {
  it('returns a ready simple export without creating a snapshot', async () => {
    const prisma = { traceabilitySnapshot: { create: jest.fn() } };
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'simple', sourceQueryRef: 'hash-001' },
      { id: 'user-1' } as any,
    ) as any;

    expect(result).toMatchObject({ mode: 'simple', status: 'ready' });
    expect(result.fileName).toContain('hash-001');
    expect(prisma.traceabilitySnapshot.create).not.toHaveBeenCalled();
  });

  it('creates an async snapshot record for fullPackage export', async () => {
    const snapshotRow = { id: 'snap-1', status: 'pending', sourceQueryHash: 'hash-002' };
    const prisma = { traceabilitySnapshot: { create: jest.fn().mockResolvedValue(snapshotRow) } };
    const service = new TraceabilityExportService(prisma as any);

    const result = await service.create(
      { exportMode: 'fullPackage', sourceQueryRef: 'hash-002' },
      { id: 'user-2' } as any,
    ) as any;

    expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceQueryHash: 'hash-002',
          exportMode: 'fullPackage',
          requesterId: 'user-2',
        }),
      }),
    );
    expect(result.id).toBe('snap-1');
  });
});
