import { Test, TestingModule } from '@nestjs/testing';
import { AuditExecutionService } from './audit-execution.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AuditExecutionService', () => {
  let service: AuditExecutionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditFinding: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockOperationLogService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExecutionService,
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

    service = module.get<AuditExecutionService>(AuditExecutionService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockPlan = {
      id: 'plan-1',
      status: 'ongoing',
      auditorId: 'auditor-1',
      documentIds: ['doc-1', 'doc-2'],
    };

    const createDto = {
      planId: 'plan-1',
      documentId: 'doc-1',
      auditResult: '符合',
    };

    it('should create finding with auditResult = "符合"', async () => {
      const mockCreatedFinding = {
        id: 'finding-1',
        ...createDto,
        issueType: null,
        description: null,
        department: null,
        assigneeId: null,
        dueDate: null,
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findFirst.mockResolvedValue(null); // No duplicate
      mockPrismaService.auditFinding.create.mockResolvedValue(mockCreatedFinding);

      const result = await service.create(createDto, 'auditor-1');

      expect(result).toEqual(mockCreatedFinding);
      expect(mockPrismaService.auditFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          planId: 'plan-1',
          documentId: 'doc-1',
          auditResult: '符合',
          issueType: null,
          description: null,
          department: null,
          assigneeId: null,
          dueDate: null,
        }),
      });
    });

    it('should create finding with auditResult = "不符合" with all required fields', async () => {
      const nonCompliantDto = {
        planId: 'plan-1',
        documentId: 'doc-1',
        auditResult: '不符合',
        issueType: '需要修改',
        description: '文档内容不完整，缺少关键信息',
        department: '生产部',
        assigneeId: 'user-1',
      };

      const mockCreatedFinding = {
        id: 'finding-1',
        ...nonCompliantDto,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        status: 'pending',
        createdAt: new Date(),
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findFirst.mockResolvedValue(null);
      mockPrismaService.auditFinding.create.mockResolvedValue(mockCreatedFinding);

      const result = await service.create(nonCompliantDto, 'auditor-1');

      expect(result).toEqual(mockCreatedFinding);
      expect(mockPrismaService.auditFinding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          auditResult: '不符合',
          issueType: '需要修改',
          description: nonCompliantDto.description,
          department: '生产部',
          assigneeId: 'user-1',
          dueDate: expect.any(Date),
        }),
      });

      // Verify dueDate is approximately 30 days from now
      const createdDueDate = mockPrismaService.auditFinding.create.mock.calls[0][0].data.dueDate;
      const expectedDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(createdDueDate.getTime() - expectedDueDate.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });

    it('should throw error if plan not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        'Audit plan not found',
      );
    });

    it('should throw error if plan status != ongoing', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'draft',
      });

      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        'Can only create findings when plan status is ongoing',
      );
    });

    it('should throw error if documentId not in plan.documentIds', async () => {
      const invalidDto = {
        ...createDto,
        documentId: 'doc-999', // Not in plan.documentIds
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.create(invalidDto, 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidDto, 'auditor-1')).rejects.toThrow(
        'Document not included in this audit plan',
      );
    });

    it('should throw error if duplicate finding exists', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findFirst.mockResolvedValue({
        id: 'existing-finding',
        planId: 'plan-1',
        documentId: 'doc-1',
      });

      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'auditor-1')).rejects.toThrow(
        'Document already audited in this plan',
      );
    });

    it('should throw error if auditResult = "不符合" but missing required fields', async () => {
      const incompleteDto = {
        planId: 'plan-1',
        documentId: 'doc-1',
        auditResult: '不符合',
        // Missing: issueType, description, department, assigneeId
      };

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findFirst.mockResolvedValue(null);

      await expect(service.create(incompleteDto, 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(incompleteDto, 'auditor-1')).rejects.toThrow(
        'issueType, description, department, assigneeId required for non-conforming results',
      );
    });

    it('should throw error if user is not the auditor', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.create(createDto, 'different-user')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createDto, 'different-user')).rejects.toThrow(
        'Only the assigned auditor can create findings',
      );
    });
  });

  describe('update', () => {
    const mockFinding = {
      id: 'finding-1',
      planId: 'plan-1',
      documentId: 'doc-1',
      auditResult: '符合',
    };

    const mockPlan = {
      id: 'plan-1',
      status: 'ongoing',
      auditorId: 'auditor-1',
    };

    it('should update finding if plan status = ongoing', async () => {
      const updateDto = {
        auditResult: '不符合',
        issueType: '需要修改',
        description: '文档内容需要修改',
        department: '生产部',
        assigneeId: 'user-1',
      };

      const mockUpdatedFinding = {
        ...mockFinding,
        ...updateDto,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.update.mockResolvedValue(mockUpdatedFinding);

      const result = await service.update('finding-1', updateDto, 'auditor-1');

      expect(result).toEqual(mockUpdatedFinding);
    });

    it('should throw error if plan status != ongoing (BR-125)', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'pending_rectification',
      });

      await expect(
        service.update('finding-1', { description: 'New description' }, 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('finding-1', { description: 'New description' }, 'auditor-1'),
      ).rejects.toThrow('Cannot modify findings when plan is not ongoing');
    });

    it('should throw error if user is not the auditor', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);

      await expect(
        service.update('finding-1', { description: 'New' }, 'different-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should re-calculate dueDate when changing to "不符合"', async () => {
      const updateDto = {
        auditResult: '不符合',
        issueType: '需要修改',
        description: '文档内容需要修改',
        department: '生产部',
        assigneeId: 'user-1',
      };

      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.update.mockResolvedValue({
        ...mockFinding,
        ...updateDto,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await service.update('finding-1', updateDto, 'auditor-1');

      expect(mockPrismaService.auditFinding.update).toHaveBeenCalledWith({
        where: { id: 'finding-1' },
        data: expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      });
    });
  });

  describe('getProgress', () => {
    const mockPlan = {
      id: 'plan-1',
      title: 'Q1 Audit',
      documentIds: ['doc-1', 'doc-2', 'doc-3'], // 3 total documents
    };

    it('should calculate progress correctly (BR-123)', async () => {
      const mockFindings = [
        { id: 'f1', documentId: 'doc-1', auditResult: '符合' },
        { id: 'f2', documentId: 'doc-2', auditResult: '不符合' },
      ];

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);
      mockPrismaService.auditFinding.count.mockResolvedValueOnce(1); // conforming
      mockPrismaService.auditFinding.count.mockResolvedValueOnce(1); // non-conforming

      const result = await service.getProgress('plan-1');

      expect(result.totalDocuments).toBe(3);
      expect(result.auditedDocuments).toBe(2);
      expect(result.progress).toBe(66.7); // 2/3 * 100 = 66.7%
      expect(result.conformingCount).toBe(1);
      expect(result.nonConformingCount).toBe(1);
      expect(result.pendingCount).toBe(1);
      expect(result.findings).toEqual(mockFindings);
    });

    it('should return correct conforming/non-conforming counts', async () => {
      const mockFindings = [
        { id: 'f1', auditResult: '符合' },
        { id: 'f2', auditResult: '符合' },
        { id: 'f3', auditResult: '不符合' },
      ];

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);
      mockPrismaService.auditFinding.count.mockResolvedValueOnce(2); // conforming
      mockPrismaService.auditFinding.count.mockResolvedValueOnce(1); // non-conforming

      const result = await service.getProgress('plan-1');

      expect(result.conformingCount).toBe(2);
      expect(result.nonConformingCount).toBe(1);
      expect(result.progress).toBe(100); // 3/3 * 100
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue(null);

      await expect(service.getProgress('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complete', () => {
    const mockPlan = {
      id: 'plan-1',
      status: 'pending_rectification',
      title: 'Q1 Audit',
      auditorId: 'auditor-1',
    };

    it('should complete plan if all non-conforming items verified', async () => {
      const mockFindings = [
        { id: 'f1', auditResult: '符合' },
        { id: 'f2', auditResult: '不符合', status: 'verified' },
        { id: 'f3', auditResult: '不符合', status: 'verified' },
      ];

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.complete('plan-1', 'auditor-1');

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
      expect(mockPrismaService.auditPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if plan not in pending_rectification status', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        status: 'ongoing',
      });

      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        'Plan must be in pending_rectification status to complete',
      );
    });

    it('should throw error if any non-conforming item not verified', async () => {
      const mockFindings = [
        { id: 'f1', auditResult: '不符合', status: 'verified' },
        { id: 'f2', auditResult: '不符合', status: 'rectifying' }, // Not verified!
      ];

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);

      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        'Cannot complete plan: 1 non-conforming items pending verification',
      );
    });

    it('should throw error if user is not the auditor', async () => {
      mockPrismaService.auditPlan.findUnique.mockResolvedValue({
        ...mockPlan,
        auditorId: 'different-user',
      });

      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.complete('plan-1', 'auditor-1')).rejects.toThrow(
        'Only the assigned auditor can complete the plan',
      );
    });

    it('should set completedAt timestamp', async () => {
      const mockFindings = [
        { id: 'f1', auditResult: '符合' },
      ];

      mockPrismaService.auditPlan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);
      mockPrismaService.auditPlan.update.mockResolvedValue({
        ...mockPlan,
        status: 'completed',
        completedAt: new Date(),
      });

      const result = await service.complete('plan-1', 'auditor-1');

      expect(result.completedAt).toBeDefined();
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });
});
