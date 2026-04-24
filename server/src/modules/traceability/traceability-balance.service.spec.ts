import { TraceabilityBalanceService } from './traceability-balance.service';

describe('TraceabilityBalanceService', () => {
  it('returns graded material balance rows and an overall status', async () => {
    const prisma = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pb-1',
          batch_no: 'PB-001',
          materialUsages: [
            { quantity: 60, materialBatch: { material: { id: 'm-1', name: '白砂糖' } } },
          ],
          output_qty: 50,
          loss_qty: 5,
          sample_qty: 2,
          waste_qty: 1,
        }),
      },
    };
    const service = new TraceabilityBalanceService(prisma as any);

    await expect(
      service.analyze({ productionBatchId: 'pb-1' }, { department: '品质' } as any),
    ).resolves.toMatchObject({
      summary: expect.objectContaining({ status: 'important' }),
      rows: [expect.objectContaining({ materialName: '白砂糖', diffQty: 2 })],
      recommendations: expect.any(Array),
    });
  });

  it('returns normal status when balance is zero', async () => {
    const prisma = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pb-2',
          batch_no: 'PB-002',
          materialUsages: [
            { quantity: 100, materialBatch: { material: { id: 'm-2', name: '面粉' } } },
          ],
          output_qty: 95,
          loss_qty: 3,
          sample_qty: 1,
          waste_qty: 1,
        }),
      },
    };
    const service = new TraceabilityBalanceService(prisma as any);

    const result = await service.analyze({ productionBatchId: 'pb-2' }, {} as any);
    expect(result.summary.status).toBe('normal');
    expect(result.recommendations).toHaveLength(0);
  });

  it('returns empty result when no batch matches', async () => {
    const prisma = {
      productionBatch: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new TraceabilityBalanceService(prisma as any);

    const result = await service.analyze({ productionBatchId: 'nonexistent' }, {} as any);
    expect(result.rows).toHaveLength(0);
    expect(result.summary.status).toBe('normal');
  });
});
