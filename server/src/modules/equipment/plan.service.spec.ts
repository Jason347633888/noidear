import { Test, TestingModule } from '@nestjs/testing';
import { PlanService } from './plan.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PlanService', () => {
  let service: PlanService;
  let prisma: any;

  const mockEquipment = {
    id: 'eq-1',
    code: 'EQ-20260216-001',
    name: 'Test Equipment',
    status: 'active',
    deletedAt: null,
    activationDate: new Date('2026-01-01'),
    responsiblePerson: 'user-1',
    maintenanceConfig: {
      daily: { enabled: true, cycle: 1, reminderDays: 0 },
      weekly: { enabled: true, cycle: 7, reminderDays: 1 },
      monthly: { enabled: false, cycle: 30, reminderDays: 3 },
    },
  };

  const mockPlan = {
    id: 'plan-1',
    planNumber: 'MP-20260216-001',
    equipmentId: 'eq-1',
    maintenanceLevel: 'daily',
    plannedDate: new Date('2026-02-17'),
    status: 'pending',
    deletedAt: null,
    maintenanceRecords: [],
    equipment: mockEquipment,
  };

  beforeEach(async () => {
    prisma = {
      equipment: {
        findUnique: jest.fn(),
      },
      maintenancePlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlanService>(PlanService);
  });

  describe('generatePlansForEquipment', () => {
    it('should generate plans for enabled levels', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.maintenancePlan.findFirst.mockResolvedValue(null);
      prisma.maintenancePlan.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `plan-${args.data.maintenanceLevel}`, ...args.data }),
      );

      const plans = await service.generatePlansForEquipment('eq-1');

      // daily and weekly enabled, monthly disabled
      expect(plans).toHaveLength(2);
      expect(prisma.maintenancePlan.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException for missing equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(null);

      await expect(service.generatePlansForEquipment('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when no config', async () => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...mockEquipment,
        maintenanceConfig: null,
      });

      const plans = await service.generatePlansForEquipment('eq-1');
      expect(plans).toEqual([]);
    });
  });

  describe('generateNextPlan', () => {
    it('should generate next plan for active equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.maintenancePlan.findFirst.mockResolvedValue(null);
      prisma.maintenancePlan.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'new-plan', ...args.data }),
      );

      const plan = await service.generateNextPlan('eq-1', 'daily', new Date());
      expect(plan).toBeDefined();
    });

    it('should return null for inactive equipment', async () => {
      prisma.equipment.findUnique.mockResolvedValue({
        ...mockEquipment,
        status: 'inactive',
      });

      const plan = await service.generateNextPlan('eq-1', 'daily', new Date());
      expect(plan).toBeNull();
    });

    it('should return null for disabled level', async () => {
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);

      const plan = await service.generateNextPlan('eq-1', 'monthly', new Date());
      expect(plan).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated plans', async () => {
      prisma.maintenancePlan.findMany.mockResolvedValue([mockPlan]);
      prisma.maintenancePlan.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by equipmentId and level', async () => {
      prisma.maintenancePlan.findMany.mockResolvedValue([]);
      prisma.maintenancePlan.count.mockResolvedValue(0);

      await service.findAll({
        equipmentId: 'eq-1',
        maintenanceLevel: 'daily',
      });

      const where = prisma.maintenancePlan.findMany.mock.calls[0][0].where;
      expect(where.equipmentId).toBe('eq-1');
      expect(where.maintenanceLevel).toBe('daily');
    });
  });

  describe('findOne', () => {
    it('should return plan with relations', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findOne('plan-1');
      expect(result.id).toBe('plan-1');
    });

    it('should throw NotFoundException for missing plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCalendarData', () => {
    it('should return plans grouped by date', async () => {
      prisma.maintenancePlan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.getCalendarData({ year: 2026, month: 2 });
      const dateKey = mockPlan.plannedDate.toISOString().slice(0, 10);
      expect(result[dateKey]).toBeDefined();
    });
  });

  describe('startPlan', () => {
    it('should start a pending plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue(mockPlan);
      prisma.maintenancePlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'in_progress',
      });

      const result = await service.startPlan('plan-1');
      expect(result.status).toBe('in_progress');
    });

    it('should reject starting a non-pending plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'in_progress',
      });

      await expect(service.startPlan('plan-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('completePlan', () => {
    it('should complete an in-progress plan and generate next', async () => {
      const inProgressPlan = { ...mockPlan, status: 'in_progress' };
      prisma.maintenancePlan.findUnique.mockResolvedValue(inProgressPlan);
      prisma.maintenancePlan.update.mockResolvedValue({
        ...inProgressPlan,
        status: 'completed',
      });
      // For generateNextPlan
      prisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      prisma.maintenancePlan.findFirst.mockResolvedValue(null);
      prisma.maintenancePlan.create.mockResolvedValue({ id: 'next-plan' });

      const result = await service.completePlan('plan-1');
      expect(result.status).toBe('completed');
    });

    it('should reject completing a pending plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.completePlan('plan-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelPlan', () => {
    it('should cancel a pending plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue(mockPlan);
      prisma.maintenancePlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'cancelled',
      });

      const result = await service.cancelPlan('plan-1');
      expect(result.status).toBe('cancelled');
    });

    it('should reject cancelling a completed plan', async () => {
      prisma.maintenancePlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
      });

      await expect(service.cancelPlan('plan-1')).rejects.toThrow(BadRequestException);
    });
  });
});
