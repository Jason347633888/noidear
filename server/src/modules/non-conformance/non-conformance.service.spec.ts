import { NotFoundException } from '@nestjs/common';
import { NonConformanceService } from './non-conformance.service';

describe('NonConformanceService', () => {
  const prisma = {
    nonConformance: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: NonConformanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NonConformanceService(prisma as any);
  });

  it('scopes numbering and writes by company', async () => {
    prisma.nonConformance.count.mockResolvedValue(3);
    prisma.nonConformance.create.mockResolvedValue({ id: 'nc1' });

    await service.create({ source_type: 'production_batch', source_id: 'b1', description: '偏差' }, 'u1', '2');

    expect(prisma.nonConformance.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.nonConformance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', nc_no: expect.stringMatching(/-0004$/) }) }),
    );
  });

  it('blocks dispose when record is outside current company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(service.dispose('nc1', { disposition: 'rework' }, 'u1', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.nonConformance.update).not.toHaveBeenCalled();
  });
});
