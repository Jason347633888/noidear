import { NotFoundException } from '@nestjs/common';
import { ReworkRecordService } from './rework-record.service';

describe('ReworkRecordService', () => {
  const prisma = {
    reworkRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };
  let service: ReworkRecordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReworkRecordService(prisma as any);
  });

  it('writes rework records to the authenticated company', async () => {
    prisma.reworkRecord.create.mockResolvedValue({ id: 'r1' });

    await service.create(
      {
        production_batch_id: 'b1',
        rework_reason: '返工',
        rework_qty: 1,
        unit: 'kg',
        rework_date: '2026-05-01',
        quality_verdict: 'pass',
      },
      '2',
    );

    expect(prisma.reworkRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2' }) }),
    );
  });

  it('blocks delete when rework record is outside current company', async () => {
    prisma.reworkRecord.findFirst.mockResolvedValue(null);

    await expect(service.remove('r1', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.reworkRecord.delete).not.toHaveBeenCalled();
  });
});
