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

  it('creates an open NonConformance from a CCP deviation using production batch as source', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn().mockResolvedValue(8),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-1' }),
      },
    };

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-1',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-1',
          measured_value: 93.5,
          measured_text: null,
          unit: 'C',
          deviation_action: '隔离待评审',
          ccp_point: { ccp_no: 'CCP-BAKE-01' },
        },
      },
      tx,
    );

    expect(tx.nonConformance.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(tx.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: '2',
        nc_no: expect.stringMatching(/^NC-\d{4}-0009$/),
        source_type: 'production_batch',
        source_id: 'batch-1',
        nc_type: 'ccp_deviation',
        discovered_by: 'operator-1',
        discovered_at: expect.any(Date),
        description: expect.stringContaining('CCP-BAKE-01'),
      }),
    });
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('93.5 C');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('隔离待评审');
    expect(tx.nonConformance.create.mock.calls[0][0].data.description).toContain('ccp-record-1');
  });

  it('builds a CCP deviation description from measured text when numeric value is absent', async () => {
    const tx: any = {
      nonConformance: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'nc-ccp-2' }),
      },
    };

    await service.createFromCcpDeviation(
      {
        companyId: '2',
        userId: 'operator-1',
        ccpRecord: {
          id: 'ccp-record-2',
          production_batch_id: 'batch-1',
          ccp_point_id: 'ccp-point-2',
          measured_value: null,
          measured_text: '金探测试片未通过',
          unit: null,
          deviation_action: null,
          ccp_point: null,
        },
      },
      tx,
    );

    const data = tx.nonConformance.create.mock.calls[0][0].data;
    expect(data.description).toContain('ccp-point-2');
    expect(data.description).toContain('金探测试片未通过');
    expect(data.description).toContain('未填写');
  });
});
