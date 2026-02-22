import { Test, TestingModule } from '@nestjs/testing';
import { RectificationService } from './rectification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('RectificationService', () => {
  let service: RectificationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditFinding: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    document: {
      findUnique: jest.fn(),
    },
    todoTask: {
      updateMany: jest.fn(),
    },
  };

  const mockOperationLogService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RectificationService,
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

    service = module.get<RectificationService>(RectificationService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyRectifications', () => {
    it('should return rectification tasks for the current user', async () => {
      const userId = 'user-1';
      const mockFindings = [
        {
          id: 'finding-1',
          planId: 'plan-1',
          documentId: 'doc-1',
          auditResult: '不符合',
          issueType: '需要修改',
          description: 'Test issue',
          department: '生产部',
          assigneeId: userId,
          dueDate: new Date('2024-12-31'),
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.auditFinding.findMany.mockResolvedValue(mockFindings);

      const result = await service.getMyRectifications(userId);

      expect(result).toEqual(mockFindings);
      expect(mockPrismaService.auditFinding.findMany).toHaveBeenCalledWith({
        where: {
          assigneeId: userId,
          status: { in: ['pending', 'rectifying'] },
        },
        include: {
          plan: { select: { id: true, title: true } },
          document: { select: { id: true, title: true, number: true } },
        },
        orderBy: { dueDate: 'asc' },
      });
    });

    it('should return empty array if no rectification tasks found', async () => {
      mockPrismaService.auditFinding.findMany.mockResolvedValue([]);

      const result = await service.getMyRectifications('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('submitRectification', () => {
    const submitDto = {
      documentId: 'doc-new',
      version: '2.0',
      comment: 'Fixed all issues',
    };

    const mockFinding = {
      id: 'finding-1',
      planId: 'plan-1',
      documentId: 'doc-1',
      auditResult: '不符合',
      assigneeId: 'user-1',
      status: 'pending',
      dueDate: new Date('2024-12-31'),
    };

    const mockDocument = {
      id: 'doc-new',
      version: 2.0,
      status: 'published',
    };

    it('should submit rectification successfully', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      mockPrismaService.auditFinding.update.mockResolvedValue({
        ...mockFinding,
        rectificationDocumentId: submitDto.documentId,
        rectificationVersion: submitDto.version,
        status: 'pending_verification',
      });
      mockPrismaService.todoTask.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.submitRectification(
        'finding-1',
        submitDto,
        'user-1',
      );

      expect(result.status).toBe('pending_verification');
      expect(result.rectificationDocumentId).toBe(submitDto.documentId);
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
        service.submitRectification('nonexistent', submitDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.submitRectification('nonexistent', submitDto, 'user-1'),
      ).rejects.toThrow('Audit finding not found');
    });

    it('should throw ForbiddenException if user is not the assignee', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        assigneeId: 'different-user',
      });

      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow('Only the assignee can submit rectification');
    });

    it('should throw BadRequestException if finding status is not pending or rectifying', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue({
        ...mockFinding,
        status: 'verified',
      });

      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow(
        'Finding must be in pending or rectifying status to submit',
      );
    });

    it('should throw NotFoundException if rectification document not found', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow('Rectification document not found');
    });

    it('should throw BadRequestException if document version mismatch', async () => {
      mockPrismaService.auditFinding.findUnique.mockResolvedValue(mockFinding);
      mockPrismaService.document.findUnique.mockResolvedValue({
        ...mockDocument,
        version: 1.5,
      });

      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitRectification('finding-1', submitDto, 'user-1'),
      ).rejects.toThrow('Document version mismatch');
    });
  });
});
