import { BadRequestException } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';

describe('EnvironmentRecordService', () => {
  it('rejects creation when the production batch does not exist', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      environmentRecord: {
        create: jest.fn(),
      },
    };
    const service = new EnvironmentRecordService(prisma);

    await expect(
      service.create(
        {
          location: '生产车间A区',
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
    expect(prisma.environmentRecord.create).not.toHaveBeenCalled();
  });

  it('creates an environment record linked to an existing production batch', async () => {
    const prisma: any = {
      productionBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      environmentRecord: {
        create: jest.fn().mockResolvedValue({ id: 'er-1' }),
      },
    };
    const service = new EnvironmentRecordService(prisma);

    await service.create(
      {
        location: '生产车间A区',
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
