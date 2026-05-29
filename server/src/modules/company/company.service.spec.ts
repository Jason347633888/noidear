import { CompanyService } from './company.service';

describe('CompanyService', () => {
  const prisma = {
    companyTenant: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    companyProfile: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant with string id and default retention policy', async () => {
    prisma.companyTenant.create.mockResolvedValue({
      id: 'tenant-1', name: '揭阳市港荣时尚食品有限公司', timezone: 'Asia/Shanghai',
      retentionPolicy: 'default_food_safety', status: 'active',
    });
    const service = new CompanyService(prisma as any);
    const result = await service.createTenant({ name: '揭阳市港荣时尚食品有限公司', timezone: 'Asia/Shanghai' });
    expect(prisma.companyTenant.create).toHaveBeenCalledWith({
      data: { name: '揭阳市港荣时尚食品有限公司', timezone: 'Asia/Shanghai', retentionPolicy: 'default_food_safety', status: 'active' },
    });
    expect(result.id).toBe('tenant-1');
  });

  it('upserts company profile separately from tenant config', async () => {
    prisma.companyProfile.upsert.mockResolvedValue({
      id: 'profile-1', company_id: 'tenant-1', manufacturerName: '港荣',
      manufacturerAddress: '揭阳市', manufacturerPhone: '0663-0000000', originPlace: '广东揭阳',
    });
    const service = new CompanyService(prisma as any);
    await service.upsertProfile('tenant-1', {
      manufacturerName: '港荣', manufacturerAddress: '揭阳市', manufacturerPhone: '0663-0000000', originPlace: '广东揭阳',
    });
    expect(prisma.companyProfile.upsert).toHaveBeenCalledWith({
      where: { company_id: 'tenant-1' },
      create: { company_id: 'tenant-1', manufacturerName: '港荣', manufacturerAddress: '揭阳市', manufacturerPhone: '0663-0000000', originPlace: '广东揭阳' },
      update: { manufacturerName: '港荣', manufacturerAddress: '揭阳市', manufacturerPhone: '0663-0000000', originPlace: '广东揭阳' },
    });
  });
});
