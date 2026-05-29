import { NotFoundException } from '@nestjs/common';
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  const prisma = {
    companyTenant: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    companyProfile: { upsert: jest.fn(), findUnique: jest.fn() },
  };
  beforeEach(() => jest.clearAllMocks());

  describe('createTenant', () => {
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

    it('defaults timezone to Asia/Shanghai when omitted', async () => {
      prisma.companyTenant.create.mockResolvedValue({
        id: 'tenant-2', name: '港荣', timezone: 'Asia/Shanghai',
        retentionPolicy: 'default_food_safety', status: 'active',
      });
      const service = new CompanyService(prisma as any);
      await service.createTenant({ name: '港荣' });
      expect(prisma.companyTenant.create).toHaveBeenCalledWith({
        data: { name: '港荣', timezone: 'Asia/Shanghai', retentionPolicy: 'default_food_safety', status: 'active' },
      });
    });
  });

  describe('getTenant', () => {
    it('returns the tenant when found', async () => {
      const tenant = {
        id: 'tenant-1', name: '港荣', timezone: 'Asia/Shanghai',
        retentionPolicy: 'default_food_safety', status: 'active', profile: null,
      };
      prisma.companyTenant.findUnique.mockResolvedValue(tenant);
      const service = new CompanyService(prisma as any);
      const result = await service.getTenant('tenant-1');
      expect(prisma.companyTenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        include: { profile: true },
      });
      expect(result).toEqual(tenant);
    });

    it('throws NotFoundException when the tenant does not exist', async () => {
      prisma.companyTenant.findUnique.mockResolvedValue(null);
      const service = new CompanyService(prisma as any);
      await expect(service.getTenant('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertProfile', () => {
    it('upserts company profile separately from tenant config', async () => {
      prisma.companyTenant.findUnique.mockResolvedValue({ id: 'tenant-1', profile: null });
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

    it('throws NotFoundException and skips upsert when the tenant does not exist', async () => {
      prisma.companyTenant.findUnique.mockResolvedValue(null);
      const service = new CompanyService(prisma as any);
      await expect(
        service.upsertProfile('missing', { manufacturerName: '港荣' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.companyProfile.upsert).not.toHaveBeenCalled();
    });
  });
});
