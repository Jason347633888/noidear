import { BadRequestException } from '@nestjs/common';
import { FragileItemInspectionService } from './fragile-item-inspection.service';

describe('FragileItemInspectionService', () => {
  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      fragileItemInspection: {
        create: jest.fn(),
      },
    };
    const service = new FragileItemInspectionService(prisma);

    await expect(
      service.create({
        production_batch_id: 'missing-batch',
        item_name: '玻璃量杯',
        total_qty: 10,
        intact_qty: 10,
        is_pass: true,
        inspected_at: '2026-05-01T09:00:00',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.fragileItemInspection.create).not.toHaveBeenCalled();
  });

  it('creates an inspection linked to an existing production batch', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      fragileItemInspection: {
        create: jest.fn().mockResolvedValue({ id: 'fii-1' }),
      },
    };
    const service = new FragileItemInspectionService(prisma);

    await service.create({
      production_batch_id: 'batch-1',
      location: '生产车间A区',
      item_name: '玻璃量杯',
      total_qty: 10,
      intact_qty: 10,
      is_pass: true,
      inspected_at: '2026-05-01T09:00:00',
      inspector_id: 'user-1',
    });

    expect(prisma.fragileItemInspection.create).toHaveBeenCalledWith({
      data: {
        production_batch_id: 'batch-1',
        location: '生产车间A区',
        item_name: '玻璃量杯',
        total_qty: 10,
        intact_qty: 10,
        is_pass: true,
        inspected_at: expect.any(Date),
        inspector_id: 'user-1',
        company_id: '1',
      },
    });
  });
});
