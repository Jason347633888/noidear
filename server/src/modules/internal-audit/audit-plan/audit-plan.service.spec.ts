import { Test, TestingModule } from '@nestjs/testing';
import { AuditPlanService } from './audit-plan.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuditPlanService', () => {
  let service: AuditPlanService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    auditFinding: {
      count: jest.fn(),
    },
  };

  const mockOperationLogService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditPlanService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OperationLogService,
          useValue: mockOperationLogService,
        },
      ],
    }).compile();

    service = module.get<AuditPlanService>(AuditPlanService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'Q1 2024 Audit',
      type: 'quarterly',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      auditorId: 'user-1',
      documentIds: ['doc-1', 'doc-2'],
    };

    it('should create an audit plan successfully', async () => {
      const mockAuditor = { id: 'user-1', status: 'active', name: 'John' };
      const mockDocuments = [
        { id: 'doc-1', status: 'published' },
        { id: 'doc-2', status: 'published' },
      ];
      const mockCreatedPlan = {
        id: 'plan-1',
        ...createDto,
        status: 'draft',
        createdBy: 'creator-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockAuditor);
      mockPrismaService.document.findMany.mockResolvedValue(mockDocuments);
      mockPrismaService.auditPlan.create.mockResolvedValue(mockCreatedPlan);

      const result = await service.create(createDto, 'creator-1');

      expect(result).toEqual(mockCreatedPlan);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['doc-1', 'doc-2'] } },
      });
      expect(mockPrismaService.auditPlan.create).toHaveBeenCalled();
    });

    it('should throw error if auditor not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'creator-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'creator-1')).rejects.toThrow(
        'Auditor must be active user',
      );
    });

    it('should throw error if auditor is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'inactive',
      });

      await expect(service.create(createDto, 'creator-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if startDate >= endDate', async () => {
      const invalidDto = {
        ...createDto,
        startDate: '2024-03-31',
        endDate: '2024-01-01',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'active',
      });

      await expect(service.create(invalidDto, 'creator-1')).rejects.toThrow(
        'Start date must be before end date',
      );
    });

    it('should throw error if some documents not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'active',
      });
      mockPrismaService.document.findMany.mockResolvedValue([
        { id: 'doc-1', status: 'published' },
      ]); // Only 1 out of 2

      await expect(service.create(createDto, 'creator-1')).rejects.toThrow(
        'Some documents not found',
      );
    });

    it('should throw error if documents are not published', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: 'active',
      });
      mockPrismaService.document.findMany.mockResolvedValue([
        { id: 'doc-1', status: 'draft' },
        { id: 'doc-2', status: 'published' },
      ]);

      await expect(service.create(createDto, 'creator-1')).rejects.toThrow(
        'Only published documents can be selected',
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated audit plans', async () => {
      const mockPlans = [
        { id: 'plan-1', title: 'Q1 Audit', status: 'draft' },
        { id: 'plan-2', title: 'Q2 Audit', status: 'ongoing' },
      ];

      mockPrismaService.auditPlan.findMany.mockResolvedValue(mockPlans);
      mockPrismaService.auditPlan.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual(mockPlans);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by status', async () => {
      mockPrismaService.auditPlan.findMany.mockResolvedValue([]);
      mockPrismaService.auditPlan.count.mockResolvedValue(0);

      await service.findAll({ status: 'draft' });

      expect(mockPrismaService.auditPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'draft' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return audit plan with progress', async () => {
      const mockPlan = {
        id: 'plan-1',
        title: 'Q1 Audit',
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        findings: [{ id: 'finding-1' }, { id: 'finding-2' }],
        auditor: { id: 'user-1', name: 'John' },
        creator: { id: 'user-2', name: 'Jane' },
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findOne('plan-1');

      expect(result.auditedCount).toBe(2);
      expect(result.totalCount).toBe(3);
      expect(result.progress).toBe(66.7);
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update draft plan', async () => {
      const mockPlan = { id: 'plan-1', status: 'draft' };
      const updateDto = { title: 'Updated Title' };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        ...updateDto,
      });

      const result = await service.update('plan-1', updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw error if plan is not draft', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'ongoing',
      });

      await expect(
        service.update('plan-1', { title: 'New' }),
      ).rejects.toThrow('Only draft plans can be updated');
    });
  });

  describe('remove', () => {
    it('should delete draft plan', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'draft',
      });
      mockPrismaService.auditPlan.delete.mockResolvedValue({
        id: 'plan-1',
      });

      await service.remove('plan-1');

      expect(mockPrismaService.auditPlan.delete).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
      });
    });

    it('should throw error if plan is not draft', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'completed',
      });

      await expect(service.remove('plan-1')).rejects.toThrow(
        'Only draft plans can be deleted',
      );
    });
  });

  describe('execute', () => {
    it('should execute draft plan', async () => {
      const mockPlan = { id: 'plan-1', status: 'draft' };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'ongoing',
        startedAt: new Date(),
      });

      const result = await service.execute('plan-1');

      expect(result.status).toBe('ongoing');
      expect(result.startedAt).toBeDefined();
    });

    it('should throw error if plan is not draft', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'ongoing',
      });

      await expect(service.execute('plan-1')).rejects.toThrow(
        'Only draft plans can be executed',
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(10); // total
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(3); // draft
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(2); // ongoing
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(1); // pending_rectification
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(4); // completed
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(5); // quarterly
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(3); // semiannual
      mockPrismaService.auditPlan.count.mockResolvedValueOnce(2); // annual
      mockPrismaService.auditPlan.findMany.mockResolvedValue([
        { id: 'plan-1', title: 'Recent Plan 1' },
      ]);

      const result = await service.getStatistics();

      expect(result.totalPlans).toBe(10);
      expect(result.byStatus.draft).toBe(3);
      expect(result.byType.quarterly).toBe(5);
      expect(result.recentPlans).toHaveLength(1);
    });
  });

  describe('copyPlan', () => {
    const originalPlan = {
      id: 'plan-1',
      title: 'Q1 2024 Internal Audit',
      type: 'quarterly',
      documentIds: ['doc-1', 'doc-2', 'doc-3'],
      status: 'completed',
      auditorId: 'auditor-1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-03-31'),
    };

    it('should copy plan successfully', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        title: 'Q1 2024 Internal Audit（副本）',
        status: 'draft',
        auditorId: 'user-1',
        createdAt: new Date(),
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.title).toBe('Q1 2024 Internal Audit（副本）');
      expect(result.status).toBe('draft');
      expect(result.documentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(result.type).toBe('quarterly');
      expect(mockOperationLogService.log).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'copy_audit_plan',
        module: 'internal-audit',
        objectId: 'plan-2',
        objectType: 'audit_plan',
        details: {
          originalPlanId: 'plan-1',
          copiedFields: ['documentIds', 'type'],
        },
      });
    });

    it('should throw NotFoundException if original plan not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(null);

      await expect(service.copyPlan('plan-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should append （副本） to title', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        title: 'Q1 2024 Internal Audit（副本）',
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.title).toContain('（副本）');
    });

    it('should set status to draft', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        status: 'draft',
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.status).toBe('draft');
    });

    it('should copy documentIds and type only', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        title: 'Q1 2024 Internal Audit（副本）',
        status: 'draft',
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.documentIds).toEqual(originalPlan.documentIds);
      expect(result.type).toBe(originalPlan.type);
    });

    it('should set auditorId to current user', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        auditorId: 'user-1',
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.auditorId).toBe('user-1');
    });

    it('should handle plan with existing （副本） suffix', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...originalPlan,
        title: 'Q1 2024 Internal Audit（副本）',
      });
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
        title: 'Q1 2024 Internal Audit（副本）（副本）',
      });

      const result = await service.copyPlan('plan-1', 'user-1');

      expect(result.title).toBe('Q1 2024 Internal Audit（副本）（副本）');
    });

    it('should log copy operation', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(originalPlan);
      mockPrismaService.auditPlan.create.mockResolvedValue({
        ...originalPlan,
        id: 'plan-2',
      });

      await service.copyPlan('plan-1', 'user-1');

      expect(mockOperationLogService.log).toHaveBeenCalled();
    });
  });
});
