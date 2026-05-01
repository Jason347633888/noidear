import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PackagingMaterialUsageService } from './packaging-material-usage.service';

describe('PackagingMaterialUsageService', () => {
  const activeMaterial = {
    id: 'mat-1',
    name: '包装膜',
    materialCode: 'PM-001',
    unit: 'kg',
  };

  it('rejects creation when production_batch_id is missing', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn(),
      },
      packagingMaterialUsage: {
        create: jest.fn(),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await expect(
      service.create({
        material_id: 'mat-1',
        used_weight: 12.5,
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).not.toHaveBeenCalled();
    expect(prisma.packagingMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      packagingMaterialUsage: {
        create: jest.fn(),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await expect(
      service.create({
        material_id: 'mat-1',
        production_batch_id: 'missing-batch',
        used_weight: 12.5,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.packagingMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('creates a packaging material usage linked to an existing production batch', async () => {
    const prisma: any = {
      material: {
        findFirst: jest.fn().mockResolvedValue(activeMaterial),
      },
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      packagingMaterialUsage: {
        create: jest.fn().mockResolvedValue({ id: 'pmu-1' }),
      },
    };
    const service = new PackagingMaterialUsageService(prisma);

    await service.create({
      material_id: 'mat-1',
      production_batch_id: 'batch-1',
      used_weight: 12.5,
      waste_weight: 0.2,
      unit: 'kg',
      usage_date: '2026-05-01T08:30:00.000Z',
      operator_id: 'user-1',
      notes: '包装线A',
    });

    expect(prisma.packagingMaterialUsage.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        production_batch_id: 'batch-1',
        material_id: 'mat-1',
        material_name: '包装膜',
        material_code: 'PM-001',
        used_weight: 12.5,
        waste_weight: 0.2,
        unit: 'kg',
        usage_date: new Date('2026-05-01T08:30:00.000Z'),
        operator_id: 'user-1',
        notes: '包装线A',
      },
    });
  });
});
