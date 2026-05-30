import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CleaningPlanService } from './cleaning-plan.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tmpl-1',
    company_id: 'company-1',
    name: '灌装间清洁模板',
    area_type: 'filling',
    version: 'v1',
    status: 'draft',
    effective_from: null,
    items: [
      { target_name: '灌装机', target_type: 'equipment', method: '湿式清洁', requires_disinfection: true },
    ],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-1',
    company_id: 'company-1',
    area_point_id: 'area-1',
    template_id: 'tmpl-1',
    version: 'v1',
    frequency: 'daily',
    trigger_condition: null,
    effective_from: new Date('2024-01-01'),
    effective_to: null,
    status: 'draft',
    approvalInstanceId: null,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makePlanItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    plan_id: 'plan-1',
    target_name: '灌装机',
    target_type: 'equipment',
    method: '湿式清洁',
    requires_disinfection: true,
    disinfectant: null,
    target_concentration: null,
    normal_range: null,
    is_mandatory: true,
    requires_verification: false,
    sequence: 0,
    created_at: new Date(),
    ...overrides,
  };
}

function createPrismaMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    workshopArea: {
      findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '灌装间A' }),
    },
    cleaningPlanTemplate: {
      create: jest.fn().mockResolvedValue(makeTemplate()),
      findUnique: jest.fn().mockResolvedValue(makeTemplate()),
      findMany: jest.fn().mockResolvedValue([makeTemplate()]),
    },
    cleaningPlan: {
      create: jest.fn().mockResolvedValue(makePlan({ items: [makePlanItem()] })),
      findUnique: jest.fn().mockResolvedValue(makePlan({ items: [makePlanItem()] })),
      findMany: jest.fn().mockResolvedValue([makePlan()]),
      update: jest.fn().mockResolvedValue(makePlan({ status: 'active' })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cleaningPlanItem: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<unknown>) => {
      const tx = {
        cleaningPlan: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue(makePlan({ status: 'retired', effective_to: new Date() })),
        },
        cleaningPlanItem: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    }),
    ...overrides,
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CleaningPlanService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createTemplate ──────────────────────────────────────────────────────────

  describe('createTemplate', () => {
    it('creates a template with JSON item defaults', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningPlanService(prisma);

      await service.createTemplate({
        company_id: 'company-1',
        name: '灌装间清洁模板',
        area_type: 'filling',
        version: 'v1',
        items: [
          { target_name: '灌装机', target_type: 'equipment', method: '湿式清洁', requires_disinfection: true },
        ],
      });

      expect(prisma.cleaningPlanTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: '灌装间清洁模板',
            area_type: 'filling',
            version: 'v1',
            status: 'draft',
          }),
        }),
      );
    });

    it('rejects template with empty items', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningPlanService(prisma);

      await expect(
        service.createTemplate({
          company_id: 'company-1',
          name: '模板',
          area_type: 'filling',
          version: 'v1',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── cloneTemplateToArea ─────────────────────────────────────────────────────

  describe('cloneTemplateToArea', () => {
    it('creates area plan from template with items', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningPlanService(prisma);

      await service.cloneTemplateToArea('tmpl-1', 'area-1', 'v1', new Date('2024-01-01'));

      expect(prisma.cleaningPlan.create).toHaveBeenCalled();
      expect(prisma.cleaningPlanItem.createMany).toHaveBeenCalled();
    });

    it('throws NotFoundException when template does not exist', async () => {
      const prisma = createPrismaMock({
        cleaningPlanTemplate: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new CleaningPlanService(prisma);

      await expect(
        service.cloneTemplateToArea('nonexistent', 'area-1', 'v1', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when area point does not exist', async () => {
      const prisma = createPrismaMock({
        workshopArea: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      const service = new CleaningPlanService(prisma);

      await expect(
        service.cloneTemplateToArea('tmpl-1', 'nonexistent-area', 'v1', new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── activatePlan ────────────────────────────────────────────────────────────

  describe('activatePlan', () => {
    it('activates one plan per area point, retiring any existing active plan', async () => {
      const existingActive = makePlan({ status: 'active', id: 'old-plan-1' });
      const prisma = createPrismaMock({
        cleaningPlan: {
          findUnique: jest.fn().mockResolvedValue(makePlan({ status: 'draft' })),
          update: jest.fn().mockResolvedValue(makePlan({ status: 'active' })),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findMany: jest.fn().mockResolvedValue([existingActive]),
          create: jest.fn(),
        },
        $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<unknown>) => {
          const tx = {
            cleaningPlan: {
              findMany: jest.fn().mockResolvedValue([existingActive]),
              update: jest.fn().mockResolvedValue(makePlan({ status: 'active' })),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            cleaningPlanItem: {
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          };
          return fn(tx);
        }),
      });
      const service = new CleaningPlanService(prisma);

      const result = await service.activatePlan('plan-1');

      expect(result.status).toBe('active');
    });

    it('rejects activating a second overlapping active plan for the same area point', async () => {
      // Simulate: plan is already active
      const prisma = createPrismaMock({
        cleaningPlan: {
          findUnique: jest.fn().mockResolvedValue(makePlan({ status: 'active' })),
          update: jest.fn(),
          updateMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
        },
      });
      const service = new CleaningPlanService(prisma);

      await expect(service.activatePlan('plan-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when plan does not exist', async () => {
      const prisma = createPrismaMock({
        cleaningPlan: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
          updateMany: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
        },
      });
      const service = new CleaningPlanService(prisma);

      await expect(service.activatePlan('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── listActivePlans ─────────────────────────────────────────────────────────

  describe('listActivePlans', () => {
    it('returns all active plans when no areaPointId provided', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningPlanService(prisma);

      const result = await service.listActivePlans();

      expect(prisma.cleaningPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        }),
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters by areaPointId when provided', async () => {
      const prisma = createPrismaMock();
      const service = new CleaningPlanService(prisma);

      await service.listActivePlans('area-1');

      expect(prisma.cleaningPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            area_point_id: 'area-1',
          }),
        }),
      );
    });
  });
});
