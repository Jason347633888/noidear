import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { CorrectiveActionService } from '../../corrective-action/corrective-action.service';
import { VerifyRectificationDto, RejectRectificationDto } from './dto';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockPrismaService: any;
  let mockOperationLogService: any;
  let correctiveActionService: any;

  const mockAuditor = {
    userId: 'auditor-1',
    username: 'auditor',
    role: 'auditor',
  };

  const mockFinding = {
    id: 'finding-1',
    planId: 'plan-1',
    documentId: 'doc-1',
    auditResult: '不符合',
    issueType: '需要修改',
    description: 'Test issue',
    department: 'Engineering',
    assigneeId: 'user-1',
    dueDate: new Date(),
    status: 'pending_verification',
    rectificationDocumentId: 'rectified-doc-1',
    rectificationVersion: '2.0',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: {
      id: 'plan-1',
      title: 'Q1 2024 Internal Audit',
      auditorId: 'auditor-1',
    },
    document: { id: 'doc-1', title: '内审文件', number: 'DOC-001' },
  };

  beforeEach(async () => {
    mockPrismaService = {
      $transaction: jest.fn(async (callback) => callback(mockPrismaService)),
      auditFinding: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      todoTask: {
        updateMany: jest.fn(),
      },
      correctiveAction: {
        findFirst: jest.fn(),
      },
    };

    mockOperationLogService = {
      log: jest.fn(),
    };

    correctiveActionService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
        { provide: CorrectiveActionService, useValue: correctiveActionService },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPendingVerifications', () => {
    it('should return findings with status=pending_verification', async () => {
      const mockFindings = [mockFinding];
      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);

      const result = await service.getPendingVerifications('auditor-1');

      expect(result).toEqual(mockFindings);
      expect(mockPrismaService.auditFinding.findMany).toHaveBeenCalledWith({
        where: { status: 'pending_verification' },
        include: {
          plan: { select: { id: true, title: true, auditorId: true } },
          document: { select: { id: true, title: true, number: true } },
          assignee: { select: { id: true, username: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      });
    });

    it('should return empty array if no findings found', async () => {
      mockPrismaService.auditFinding.findMany.mockResolvedValue([]);

      const result = await service.getPendingVerifications('auditor-1');

      expect(result).toEqual([]);
    });
  });

  describe('verifyRectification', () => {
    const verifyDto: VerifyRectificationDto = {
      comment: 'Verification complete',
    };

    it('should verify rectification successfully', async () => {
      const compliantFinding = { ...mockFinding, auditResult: '符合' };
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(compliantFinding);
      mockPrismaService.todoTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyRectification(
        'finding-1',
        verifyDto,
        'auditor-1',
        'company-1',
      );

      expect(result).toMatchObject({
        id: 'finding-1',
        status: 'verified',
        verifiedBy: 'auditor-1',
        verifiedAt: expect.any(Date),
      });
      expect(mockPrismaService.auditFinding.updateMany).toHaveBeenCalledWith({
        where: { id: 'finding-1', status: 'pending_verification' },
        data: {
          status: 'verified',
          verifiedBy: 'auditor-1',
          verifiedAt: expect.any(Date),
        },
      });
      expect(mockPrismaService.todoTask.updateMany).toHaveBeenCalledWith({
        where: {
          type: 'audit_rectification',
          relatedId: 'finding-1',
        },
        data: {
          status: 'completed',
        },
      });
      expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
      expect(correctiveActionService.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if finding not found', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the auditor', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        plan: { ...mockFinding.plan, auditorId: 'different-auditor' },
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status is not pending_verification', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        status: 'verified',
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no rectification evidence', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        rectificationDocumentId: null,
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates CAPA for verified non-conforming audit finding', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '不符合',
        issueType: '需要修改',
        description: '受控文件培训记录缺少签字确认',
        assigneeId: 'assignee-1',
        dueDate: new Date('2026-05-31T00:00:00.000Z'),
        document: { id: 'doc-1', title: '培训记录控制程序', number: 'DOC-001' },
        plan: { auditorId: 'auditor-1' },
      });
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue(null);
      correctiveActionService.create.mockResolvedValue({ id: 'capa-1' });

      await service.verifyRectification(
        'finding-1',
        verifyDto,
        'auditor-1',
        'company-1',
      );

      expect(mockPrismaService.correctiveAction.findFirst).toHaveBeenCalledWith({
        where: {
          company_id: 'company-1',
          trigger_type: 'internal_audit',
          trigger_id: 'finding-1',
        },
        select: { id: true },
      });
      expect(correctiveActionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger_type: 'internal_audit',
          trigger_id: 'finding-1',
          description: expect.stringContaining('受控文件培训记录缺少签字确认'),
          responsible_id: 'assignee-1',
          due_date: '2026-05-31',
        }),
        'auditor-1',
        'company-1',
        mockPrismaService,
      );
    });

    it('does not create duplicate CAPA when one already exists for the finding (serial safety net)', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '不符合',
        description: '内审发现项已有关联 CAPA',
        document: { id: 'doc-1', title: '内审文件', number: 'DOC-002' },
        plan: { auditorId: 'auditor-1' },
      });
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue({ id: 'existing-capa' });

      await service.verifyRectification(
        'finding-1',
        verifyDto,
        'auditor-1',
        'company-1',
      );

      expect(correctiveActionService.create).not.toHaveBeenCalled();
    });

    it('concurrent second call does not create duplicate CAPA when updateMany returns count=0', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '不符合',
        description: '并发第二个请求不得创建第二条 CAPA',
        document: { id: 'doc-1', title: '内审文件', number: 'DOC-002' },
        plan: { auditorId: 'auditor-1' },
      });
      // Simulate the concurrent case: the atomic updateMany wins for the first caller
      // but returns count=0 for the second caller (finding status already changed)
      mockPrismaService.auditFinding.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
      expect(correctiveActionService.create).not.toHaveBeenCalled();
      expect(mockPrismaService.todoTask.updateMany).not.toHaveBeenCalled();
    });

    it('does not create CAPA for compliant audit finding', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '符合',
        document: { id: 'doc-1', title: '内审文件', number: 'DOC-003' },
        plan: { auditorId: 'auditor-1' },
      });
      await service.verifyRectification(
        'finding-1',
        verifyDto,
        'auditor-1',
        'company-1',
      );

      expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
      expect(correctiveActionService.create).not.toHaveBeenCalled();
    });

    it('requires companyId before creating audit-triggered CAPA', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '不符合',
        description: '缺少内审整改证据复核记录',
        document: { id: 'doc-1', title: '内审文件', number: 'DOC-004' },
        plan: { auditorId: 'auditor-1' },
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', undefined as any),
      ).rejects.toThrow('Missing companyId for audit CAPA creation');

      // updateMany ran to atomically claim the finding, but the transaction rolls back
      expect(mockPrismaService.auditFinding.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.todoTask.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaService.correctiveAction.findFirst).not.toHaveBeenCalled();
      expect(correctiveActionService.create).not.toHaveBeenCalled();
    });

    it('does not complete todo when CAPA creation fails (transaction rolls back)', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        auditResult: '不符合',
        description: 'CAPA 创建失败时不能完成内审验证',
        document: { id: 'doc-1', title: '内审文件', number: 'DOC-005' },
        plan: { auditorId: 'auditor-1' },
      });
      mockPrismaService.correctiveAction.findFirst.mockResolvedValue(null);
      correctiveActionService.create.mockRejectedValue(new BadRequestException('内审发现项不存在'));

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1', 'company-1'),
      ).rejects.toThrow('内审发现项不存在');

      // todoTask.updateMany is never reached because CAPA creation throws first
      expect(mockPrismaService.todoTask.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('rejectRectification', () => {
    const rejectDto: RejectRectificationDto = {
      rejectionReason: 'The rectification does not address the root cause',
    };

    it('should reject rectification successfully', async () => {
      const updatedFinding = { ...mockFinding, status: 'rectifying' };
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditFinding.update.mockResolvedValue(updatedFinding);
      mockPrismaService.todoTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.rejectRectification(
        'finding-1',
        rejectDto,
        'auditor-1',
      );

      expect(result).toEqual(updatedFinding);
      expect(mockPrismaService.auditFinding.update).toHaveBeenCalledWith({
        where: { id: 'finding-1' },
        data: {
          status: 'rectifying',
          rejectionReason: rejectDto.rejectionReason,
        },
      });
      expect(mockPrismaService.todoTask.updateMany).toHaveBeenCalledWith({
        where: {
          type: 'audit_rectification',
          relatedId: 'finding-1',
        },
        data: {
          status: 'pending',
        },
      });
    });

    it('should throw NotFoundException if finding not found', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectRectification('finding-1', rejectDto, 'auditor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the auditor', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        plan: { ...mockFinding.plan, auditorId: 'different-auditor' },
      });

      await expect(
        service.rejectRectification('finding-1', rejectDto, 'auditor-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status is not pending_verification', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        status: 'verified',
      });

      await expect(
        service.rejectRectification('finding-1', rejectDto, 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
