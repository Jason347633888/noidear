import { BadRequestException } from '@nestjs/common';
import { FragileItemInspectionService } from './fragile-item-inspection.service';

const baseDto = {
  production_batch_id: 'batch-1',
  item_name: '玻璃量杯',
  total_qty: 10,
  intact_qty: 10,
  is_pass: true,
  inspected_at: '2026-05-01T09:00:00',
};

describe('FragileItemInspectionService', () => {
  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      productionBatch: { findUnique: jest.fn().mockResolvedValue(null) },
      product: { findUnique: jest.fn() },
      fragileItemInspection: { create: jest.fn() },
    };
    const service = new FragileItemInspectionService(prisma);

    await expect(
      service.create({ ...baseDto, production_batch_id: 'missing' }, 'company-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.product.findUnique).not.toHaveBeenCalled();
    expect(prisma.fragileItemInspection.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the production batch belongs to a different company', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-other', productId: 'prod-other' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ company_id: 'other-company' }),
      },
      fragileItemInspection: { create: jest.fn() },
    };
    const service = new FragileItemInspectionService(prisma);

    await expect(
      service.create({ ...baseDto, production_batch_id: 'batch-other' }, 'company-1'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'prod-other' },
      select: { company_id: true },
    });
    expect(prisma.fragileItemInspection.create).not.toHaveBeenCalled();
  });

  it('creates an inspection using the passed companyId', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1', productId: 'prod-1' }),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ company_id: 'company-abc' }),
      },
      fragileItemInspection: {
        create: jest.fn().mockResolvedValue({ id: 'fii-1' }),
      },
    };
    const service = new FragileItemInspectionService(prisma);

    await service.create(
      { ...baseDto, location: '生产车间A区', inspector_id: 'user-1' },
      'company-abc',
    );

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
        company_id: 'company-abc',
      },
    });
  });
});
