import { NotFoundException } from '@nestjs/common';
import { ExternalPartyService } from './external-party.service';

describe('ExternalPartyService', () => {
  const prisma = {
    externalParty: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const service = new ExternalPartyService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only non-deleted parties for the current company and optional type', async () => {
    prisma.externalParty.findMany.mockResolvedValue([{ id: 'cust-1' }]);

    await expect(service.findAll('company-2', 'customer')).resolves.toEqual([{ id: 'cust-1' }]);

    expect(prisma.externalParty.findMany).toHaveBeenCalledWith({
      where: {
        company_id: 'company-2',
        deleted_at: null,
        party_type: 'customer',
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  });

  it('creates parties in the current company and defaults active status', async () => {
    prisma.externalParty.create.mockResolvedValue({ id: 'cust-1' });

    await service.create('company-2', {
      party_type: 'customer',
      name: '客户A',
    } as any);

    expect(prisma.externalParty.create).toHaveBeenCalledWith({
      data: {
        party_type: 'customer',
        name: '客户A',
        company_id: 'company-2',
        status: 'active',
      },
    });
  });

  it('rejects update when the party is outside the current company', async () => {
    prisma.externalParty.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.update('other-party', 'company-2', { name: '新名称' } as any)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.externalParty.updateMany).toHaveBeenCalledWith({
      where: { id: 'other-party', company_id: 'company-2', deleted_at: null },
      data: { name: '新名称' },
    });
    expect(prisma.externalParty.findFirst).not.toHaveBeenCalled();
  });

  it('soft deletes only parties in the current company', async () => {
    prisma.externalParty.updateMany.mockResolvedValue({ count: 1 });
    prisma.externalParty.findFirst.mockResolvedValue({ id: 'cust-1', deleted_at: expect.any(Date) });

    await service.remove('cust-1', 'company-2');

    expect(prisma.externalParty.updateMany).toHaveBeenCalledWith({
      where: { id: 'cust-1', company_id: 'company-2', deleted_at: null },
      data: { deleted_at: expect.any(Date) },
    });
    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: { id: 'cust-1', company_id: 'company-2' },
    });
  });
});
