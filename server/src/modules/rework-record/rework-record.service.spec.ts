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
    nonConformance: {
      findFirst: jest.fn(),
    },
  };
  let service: ReworkRecordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReworkRecordService(prisma as any);
  });

  it('writes rework records to the authenticated company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      source_type: 'production_batch',
      source_id: 'b1',
    });
    prisma.reworkRecord.create.mockResolvedValue({ id: 'r1' });

    await service.create(
      {
        production_batch_id: 'b1',
        nc_id: 'nc1',
        rework_reason: '返工',
        rework_qty: 1,
        unit: 'kg',
        rework_date: '2026-05-01',
        quality_verdict: 'pass',
      },
      '2',
    );

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'nc1', company_id: '2' },
      select: { id: true, source_type: true, source_id: true },
    });
    expect(prisma.reworkRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          production_batch_id: 'b1',
          nc_id: 'nc1',
        }),
      }),
    );
  });

  it('rejects creation when nc_id is missing', async () => {
    await expect(
      service.create(
        {
          production_batch_id: 'b1',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        } as any,
        '2',
      ),
    ).rejects.toThrow('关联不合格记录不能为空');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the nonconformance is missing or outside current company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          production_batch_id: 'b1',
          nc_id: 'missing-nc',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        },
        '2',
      ),
    ).rejects.toThrow('关联不合格记录不存在');

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-nc', company_id: '2' },
      select: { id: true, source_type: true, source_id: true },
    });
    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('rejects creation when production batch differs from the NC source production batch', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({
      id: 'nc1',
      source_type: 'production_batch',
      source_id: 'batch-from-nc',
    });

    await expect(
      service.create(
        {
          production_batch_id: 'different-batch',
          nc_id: 'nc1',
          rework_reason: '返工',
          rework_qty: 1,
          unit: 'kg',
          rework_date: '2026-05-01',
          quality_verdict: 'pass',
        },
        '2',
      ),
    ).rejects.toThrow('返工生产批次必须与不合格来源批次一致');

    expect(prisma.reworkRecord.create).not.toHaveBeenCalled();
  });

  it('blocks delete when rework record is outside current company', async () => {
    prisma.reworkRecord.findFirst.mockResolvedValue(null);

    await expect(service.remove('r1', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.reworkRecord.delete).not.toHaveBeenCalled();
  });
});
