import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('Approval Integration Tests', () => {
  let approvalService: ApprovalService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    user: { findUnique: jest.fn() },
    document: { findUnique: jest.fn(), update: jest.fn() },
    approval: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    approvalService = moduleRef.get<ApprovalService>(ApprovalService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('文档审批统一接口', () => {
    it('应该成功审批通过一个文档', async () => {
      const approvalId = 'approval-001';
      const approverId = 'approver-001';
      const documentId = 'doc-001';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1 };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-001', title: '测试文档' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'approved' });

      const result = await approvalService.approveUnified(approvalId, approverId, 'approved', '审批通过');

      expect(result).toBeDefined();
      expect(mockPrisma.approval.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: approvalId }, data: expect.objectContaining({ status: 'approved' }) }),
      );
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'approved' }) }),
      );
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'creator-001', type: 'approval_approved' }),
      );
    });

    it('应该成功驳回一个文档', async () => {
      const approvalId = 'approval-002';
      const approverId = 'approver-001';
      const documentId = 'doc-002';
      const rejectionReason = '需要修改内容，请补充完整资料';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1 };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-001', title: '测试文档2' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'rejected' });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'draft' });

      await approvalService.approveUnified(approvalId, approverId, 'rejected', rejectionReason);

      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'draft' }) }),
      );
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'creator-001', type: 'approval_rejected' }),
      );
    });

    it('驳回原因少于10个字符时应该抛出错误', async () => {
      await expect(
        approvalService.approveUnified('approval-id', 'approver-id', 'rejected', '太短'),
      ).rejects.toThrow('驳回原因至少10个字符');
    });

    it('审批不存在时应该抛出NOT_FOUND错误', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue(null);
      await expect(
        approvalService.approveUnified('nonexistent', 'approver-id', 'approved'),
      ).rejects.toThrow('审批记录不存在');
    });

    it('对非文档审批应该抛出错误', async () => {
      const mockApproval = { id: 'app-1', approverId: 'user-1', status: 'pending', documentId: null, level: 1 };
      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      await expect(
        approvalService.approveUnified('app-1', 'user-1', 'approved'),
      ).rejects.toThrow('仅支持文档审批');
    });
  });

  describe('会签审批', () => {
    it('应该成功创建会签审批', async () => {
      const documentId = 'doc-countersign-001';
      const approverIds = ['approver-1', 'approver-2', 'approver-3'];

      mockPrisma.approval.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `app-${Math.random()}`, ...args.data }),
      );

      const result = await approvalService.createCountersignApproval(documentId, approverIds);

      expect(result).toHaveLength(3);
      expect(mockNotificationService.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('顺签审批', () => {
    it('应该成功创建顺签审批', async () => {
      const documentId = 'doc-sequential-001';
      const approverIds = ['approver-1', 'approver-2'];

      mockPrisma.approval.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `app-${Math.random()}`, ...args.data }),
      );

      const result = await approvalService.createSequentialApproval(documentId, approverIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('status', 'pending');
      expect(result[1]).toHaveProperty('status', 'waiting');
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('审批查询', () => {
    it('应该返回待审批列表', async () => {
      const approverId = 'approver-001';
      mockPrisma.approval.findMany.mockResolvedValue([
        { id: 'app-1', approverId, status: 'pending', document: { id: 'doc-1', title: '文档1', creator: { id: 'u1', name: '用户1' } } },
      ]);

      const result = await approvalService.getPendingApprovals(approverId);
      expect(result).toHaveLength(1);
    });

    it('应该返回审批详情', async () => {
      const approvalId = 'app-detail-001';
      mockPrisma.approval.findUnique.mockResolvedValue({ id: approvalId, status: 'pending', document: {} });

      const result = await approvalService.getApprovalDetail(approvalId);
      expect(result).toBeDefined();
      expect(result.id).toBe(approvalId);
    });

    it('审批不存在时应该抛出错误', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue(null);
      await expect(approvalService.getApprovalDetail('nonexistent')).rejects.toThrow('审批记录不存在');
    });

    it('应该返回审批历史', async () => {
      mockPrisma.approval.findMany.mockResolvedValue([]);
      mockPrisma.approval.count.mockResolvedValue(0);

      const result = await approvalService.getApprovalHistory('approver-001', 1, 20);
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 0);
    });
  });
});
