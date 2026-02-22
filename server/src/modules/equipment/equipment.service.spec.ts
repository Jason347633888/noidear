import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentService } from './equipment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let prisma: any;

  const mockEquipment = {
    id: 'eq-1',
    code: 'EQ-20260216-001',
    name: 'Test Equipment',
    category: 'production',
    status: 'active',
    deletedAt: null,
    activationDate: null,
    maintenancePlans: [],
    maintenanceRecords: [],
    equipmentFaults: [],
  };

  beforeEach(async () => {
    prisma = {
      equipment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      maintenancePlan: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  describe('create', () => {
    it('should create equipment with auto-generated code', async () => {
      prisma.equipment.findFirst.mockResolvedValue(null);
      prisma.equipment.create.mockResolvedValue(mockEquipment);

      const result = await service.create({
        name: 'Test Equipment',
        category: 'production',
      });

      expect(result).toEqual(mockEquipment);
      expect(prisma.equipment.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on duplicate code', async () => {
      prisma.equipment.findFirst.mockResolvedValue(null);
      prisma.equipment.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create({ name: 'Test', category: 'production' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated equipment list', async () => {
      prisma.equipment.findMany.mockResolvedValue([mockEquipment]);
      prisma.equipment.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by category and status', async () => {
      prisma.equipment.findMany.mockResolvedValue([]);
      prisma.equipment.count.mockResolvedValue(0);

      await service.findAll({ category: 'production', status: 'active' });

      const where = prisma.equipment.findMany.mock.calls[0][0].where;
      expect(where.category).toBe('production');
      expect(where.status).toBe('active');
    });

    it('should search by name and code', async () => {
      prisma.equipment.findMany.mockResolvedValue([]);
      prisma.equipment.count.mockResolvedValue(0);

      await service.findAll({ search: 'test' });

      const where = prisma.equipment.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.OR).toHaveLength(3);
    });

    it('should clamp page and limit values', async () => {
      prisma.equipment.findMany.mockResolvedValue([]);
      prisma.equipment.count.mockResolvedValue(0);

      const result = await service.findAll({ page: -1, limit: 500 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });
  });

  describe('findOne', () => {
    it('should return equipment with relations', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const result = await service.findOne('eq-1');
      expect(result.id).toBe('eq-1');
    });

    it('should throw NotFoundException for missing equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...mockEquipment,
        deletedAt: new Date(),
      });

      await expect(service.findOne('eq-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update equipment fields', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.equipment.update.mockResolvedValue({ ...mockEquipment, name: 'Updated' });

      const result = await service.update('eq-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.equipment.update.mockResolvedValue({
        ...mockEquipment,
        deletedAt: new Date(),
      });

      const result = await service.remove('eq-1');
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should set activation date when activating', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.equipment.update.mockResolvedValue({
        ...mockEquipment,
        status: 'active',
        activationDate: new Date(),
      });

      const result = await service.updateStatus('eq-1', { status: 'active' });
      expect(result.status).toBe('active');
    });

    it('should cancel pending plans when scrapping', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.maintenancePlan.updateMany.mockResolvedValue({ count: 2 });
      prisma.equipment.update.mockResolvedValue({
        ...mockEquipment,
        status: 'scrapped',
      });

      const result = await service.updateStatus('eq-1', { status: 'scrapped' });

      expect(result.status).toBe('scrapped');
      expect(prisma.maintenancePlan.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            equipmentId: 'eq-1',
            status: { in: ['pending', 'in_progress'] },
          }),
        }),
      );
    });
  });
});
