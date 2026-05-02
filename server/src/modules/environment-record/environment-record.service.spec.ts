import { BadRequestException } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';

describe('EnvironmentRecordService', () => {
  function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '生产车间A区' }),
      },
      environmentRecord: {
        create: jest.fn().mockResolvedValue({ id: 'er-1' }),
      },
      ...overrides,
    } as any;
  }

  it('rejects creation when the production batch does not exist', async () => {
    const prisma = createPrismaMock({
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location_id: 'area-1',
          record_type: 'temperature_humidity',
          temperature: 25.5,
          humidity: 61,
          is_within_spec: true,
          production_batch_id: 'missing-batch',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-batch' },
      select: { id: true },
    });
    expect(prisma.workshopArea.findFirst).not.toHaveBeenCalled();
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the monitoring location does not exist or is inactive', async () => {
    const prisma = createPrismaMock({
      workshopArea: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location_id: 'missing-area',
          record_type: 'temperature_humidity',
          temperature: 25.5,
          humidity: 61,
          is_within_spec: true,
          production_batch_id: 'batch-1',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.workshopArea.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-area',
        company_id: '1',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('creates an environment record linked to an existing production batch and location', async () => {
    const prisma = createPrismaMock();
    const service = new EnvironmentRecordService(prisma);

    await service.create(
      {
        location_id: 'area-1',
        record_type: 'temperature_humidity',
        temperature: 25.5,
        humidity: 61,
        is_within_spec: true,
        production_batch_id: 'batch-1',
      },
      'user-1',
    );

    expect(prisma.environmentRecord.create).toHaveBeenCalledWith({
      data: {
        location_id: 'area-1',
        location: '生产车间A区',
        record_type: 'temperature_humidity',
        temperature: 25.5,
        humidity: 61,
        is_within_spec: true,
        production_batch_id: 'batch-1',
        company_id: '1',
        operator_id: 'user-1',
        measured_at: expect.any(Date),
      },
    });
  });
});
