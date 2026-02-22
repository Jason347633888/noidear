import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { VerifyRectificationDto, RejectRectificationDto } from './dto';

describe('VerificationService', () => {
  let service: VerificationService;
  let mockPrismaService: any;
  let mockOperationLogService: any;

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
  };

  beforeEach(async () => {
    mockPrismaService = {
      auditFinding: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      todoTask: {
        updateMany: jest.fn(),
      },
    };

    mockOperationLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OperationLogService, useValue: mockOperationLogService },
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
      const updatedFinding = { ...mockFinding, status: 'verified' };
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.auditFinding.update.mockResolvedValue(updatedFinding);
      mockPrismaService.todoTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyRectification(
        'finding-1',
        verifyDto,
        'auditor-1',
      );

      expect(result).toEqual(updatedFinding);
      expect(mockPrismaService.auditFinding.update).toHaveBeenCalledWith({
        where: { id: 'finding-1' },
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
    });

    it('should throw NotFoundException if finding not found', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the auditor', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        plan: { ...mockFinding.plan, auditorId: 'different-auditor' },
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if status is not pending_verification', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        status: 'verified',
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no rectification evidence', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        rectificationDocumentId: null,
      });

      await expect(
        service.verifyRectification('finding-1', verifyDto, 'auditor-1'),
      ).rejects.toThrow(BadRequestException);
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
