import { CcpService } from './ccp.service';

describe('CcpService', () => {
  const prisma = {
    cCPRecord: { create: jest.fn(), findMany: jest.fn() },
    cCPPoint: { findMany: jest.fn() },
    productionBatch: { findUnique: jest.fn() },
  };
  let service: CcpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CcpService(prisma as any);
  });

  it('writes CCP records to the authenticated company', async () => {
    prisma.cCPRecord.create.mockResolvedValue({ id: 'r1' });

    await service.createRecord(
      { production_batch_id: 'b1', ccp_point_id: 'p1', is_within_cl: true },
      'u1',
      '2',
    );

    expect(prisma.cCPRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', operator_id: 'u1' }) }),
    );
  });

  it('finds missing CCPs only from current company records and points', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'b1' });
    prisma.cCPRecord.findMany.mockResolvedValue([{ ccp_point_id: 'p1' }]);
    prisma.cCPPoint.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

    await expect(service.findMissingCCPs('b1', '2')).resolves.toEqual([{ id: 'p2' }]);
    expect(prisma.cCPRecord.findMany).toHaveBeenCalledWith({
      where: { production_batch_id: 'b1', company_id: '2' },
      select: { ccp_point_id: true },
    });
    expect(prisma.cCPPoint.findMany).toHaveBeenCalledWith({ where: { company_id: '2' } });
  });
});
