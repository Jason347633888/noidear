import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('ApprovalService', () => {
  let service: ApprovalService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
    jest.clearAllMocks();
  });

  describe('getApprovalChain', () => {
    it('应该返回文档审批链', async () => {
      const documentId = 'doc-123';
      const mockApprovals = [
        { id: 'approval-1', documentId, level: 1, status: 'approved', approver: { id: 'u1', name: '张三' } },
      ];

      mockPrisma.approval.findMany.mockResolvedValue(mockApprovals);

      const result = await service.getApprovalChain(documentId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('level', 1);
      expect(mockPrisma.approval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId } }),
      );
    });

    it('应该在文档无审批时返回空数组', async () => {
      mockPrisma.approval.findMany.mockResolvedValue([]);

      const result = await service.getApprovalChain('non-exist');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPendingApprovals', () => {
    it('应该返回待审批列表', async () => {
      const approverId = 'approver-001';
      mockPrisma.approval.findMany.mockResolvedValue([
        { id: 'app-1', approverId, status: 'pending', document: { id: 'doc-1', title: '文档1', creator: { id: 'u1', name: '用户1' } } },
      ]);

      const result = await service.getPendingApprovals(approverId);

      expect(result.legacy).toHaveLength(1);
      expect(result.unified).toHaveLength(0);
      expect(mockPrisma.approval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { approverId, status: 'pending' } }),
      );
    });

    it('应该在没有待审批时返回空数组', async () => {
      mockPrisma.approval.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals('user-no-approvals');

      expect(result.legacy).toHaveLength(0);
      expect(result.unified).toHaveLength(0);
    });
  });

  describe('getApprovalDetail', () => {
    it('应该返回审批详情', async () => {
      const approvalId = 'app-detail-001';
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: approvalId,
        status: 'pending',
        document: { id: 'doc-1', title: '测试文档' },
      });

      const result = await service.getApprovalDetail(approvalId);

      expect(result).toBeDefined();
      expect(result.id).toBe(approvalId);
    });

    it('审批不存在时应该抛出NOT_FOUND错误', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue(null);

      await expect(service.getApprovalDetail('nonexistent')).rejects.toThrow('审批记录不存在');
    });
  });

  describe('getApprovalHistory', () => {
    it('应该返回审批历史', async () => {
      mockPrisma.approval.findMany.mockResolvedValue([]);
      mockPrisma.approval.count.mockResolvedValue(0);

      const result = await service.getApprovalHistory('approver-001', 1, 20);

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 0);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
    });

    it('应该支持分页', async () => {
      mockPrisma.approval.findMany.mockResolvedValue([]);
      mockPrisma.approval.count.mockResolvedValue(0);

      const result = await service.getApprovalHistory('approver-001', 2, 10);

      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 10);
    });
  });

  describe('approveUnified', () => {
    it('应该成功审批通过一个文档', async () => {
      const approvalId = 'approval-001';
      const approverId = 'approver-001';
      const documentId = 'doc-001';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1 };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-001', title: '测试文档' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'effective' });

      const result = await service.approveUnified(approvalId, approverId, 'approved', '审批通过');

      expect(result).toBeDefined();
      expect(mockPrisma.approval.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: approvalId }, data: expect.objectContaining({ status: 'approved' }) }),
      );
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'effective' }) }),
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

      await service.approveUnified(approvalId, approverId, 'rejected', rejectionReason);

      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'draft' }) }),
      );
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'creator-001', type: 'approval_rejected' }),
      );
    });

    it('驳回原因少于10个字符时应该抛出错误', async () => {
      await expect(
        service.approveUnified('approval-id', 'approver-id', 'rejected', '太短'),
      ).rejects.toThrow('驳回原因至少10个字符');
    });

    it('审批不存在时应该抛出NOT_FOUND错误', async () => {
      mockPrisma.approval.findUnique.mockResolvedValue(null);

      await expect(
        service.approveUnified('nonexistent', 'approver-id', 'approved'),
      ).rejects.toThrow('审批记录不存在');
    });

    it('对非文档审批应该抛出错误', async () => {
      const mockApproval = { id: 'app-1', approverId: 'user-1', status: 'pending', documentId: null, level: 1 };
      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveUnified('app-1', 'user-1', 'approved'),
      ).rejects.toThrow('仅支持文档审批');
    });

    it('应该在审批意见超过500字时拒绝', async () => {
      const mockApproval = { id: 'app-1', approverId: 'user-1', status: 'pending', documentId: 'doc-1', level: 1 };
      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);

      const longComment = 'a'.repeat(501);

      await expect(
        service.approveUnified('app-1', 'user-1', 'approved', longComment),
      ).rejects.toThrow('审批意见不能超过500个字符');
    });

    it('审批已完成时应该抛出冲突错误', async () => {
      const mockApproval = { id: 'app-1', approverId: 'user-1', status: 'approved', documentId: 'doc-1', level: 1 };
      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveUnified('app-1', 'user-1', 'approved'),
      ).rejects.toThrow('该审批已完成，不可修改');
    });

    it('非授权用户应该被拒绝（非admin）', async () => {
      const mockApproval = { id: 'app-1', approverId: 'correct-user', status: 'pending', documentId: 'doc-1', level: 1 };
      const mockUser = { id: 'wrong-user', role: 'operator' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.approveUnified('app-1', 'wrong-user', 'approved'),
      ).rejects.toThrow('无权审批此记录');
    });

    it('Admin 角色可以覆盖审批权限', async () => {
      const mockApproval = { id: 'app-1', approverId: 'correct-user', status: 'pending', documentId: 'doc-1', level: 1 };
      const mockAdmin = { id: 'admin-user', role: 'admin' };
      const mockDocument = { id: 'doc-1', status: 'pending', creatorId: 'creator-001', title: '测试文档' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'effective' });

      const result = await service.approveUnified('app-1', 'admin-user', 'approved', '管理员审批');

      expect(result).toBeDefined();
    });
  });

  describe('createCountersignApproval', () => {
    it('应该成功创建会签审批', async () => {
      const documentId = 'doc-countersign-001';
      const approverIds = ['approver-1', 'approver-2', 'approver-3'];

      mockPrisma.approval.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `app-${Math.random()}`, ...args.data }),
      );

      const result = await service.createCountersignApproval(documentId, approverIds);

      expect(result).toHaveLength(3);
      expect(mockNotificationService.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('createSequentialApproval', () => {
    it('应该成功创建顺签审批', async () => {
      const documentId = 'doc-sequential-001';
      const approverIds = ['approver-1', 'approver-2'];

      mockPrisma.approval.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `app-${Math.random()}`, ...args.data }),
      );

      const result = await service.createSequentialApproval(documentId, approverIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('status', 'pending');
      expect(result[1]).toHaveProperty('status', 'waiting');
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('approveCountersign', () => {
    it('应该成功处理会签审批通过', async () => {
      const approvalId = 'cs-approval-1';
      const approverId = 'approver-1';
      const groupId = 'group-cs-1';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId: 'doc-1', level: 1, groupId };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.approval.count.mockResolvedValue(1);

      const result = await service.approveCountersign(approvalId, approverId, 'approved', '同意');

      expect(result).toBeDefined();
      expect(result.status).toBe('approved');
    });

    it('应该在会签全部通过后归档文档', async () => {
      const approvalId = 'cs-approval-last';
      const approverId = 'approver-3';
      const groupId = 'group-cs-2';
      const documentId = 'doc-cs-2';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1, groupId };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-1', title: '会签文档' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.approval.count.mockResolvedValue(0);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'effective' });

      const result = await service.approveCountersign(approvalId, approverId, 'approved', '同意');

      expect(result).toBeDefined();
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'effective' }) }),
      );
    });

    it('应该在会签中任一人驳回时终止整个流程', async () => {
      const approvalId = 'cs-reject-1';
      const approverId = 'approver-2';
      const groupId = 'group-cs-3';
      const documentId = 'doc-cs-3';
      const reason = '会签审批不同意，数据需要重新核实';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1, groupId };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-1', title: '会签文档3' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'rejected' });
      mockPrisma.approval.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'draft' });

      const result = await service.approveCountersign(approvalId, approverId, 'rejected', reason);

      expect(result).toBeDefined();
      expect(mockPrisma.approval.updateMany).toHaveBeenCalled();
    });
  });

  describe('approveSequential', () => {
    it('应该在顺签中当前人通过后激活下一个审批人', async () => {
      const approvalId = 'seq-approval-1';
      const approverId = 'approver-1';
      const groupId = 'group-seq-1';
      const documentId = 'doc-seq-1';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1, groupId, sequence: 1 };
      const nextApproval = { id: 'seq-approval-2', approverId: 'approver-2', status: 'waiting', groupId, sequence: 2 };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.approval.findFirst.mockResolvedValue(nextApproval);

      const result = await service.approveSequential(approvalId, approverId, 'approved', '同意');

      expect(result).toBeDefined();
      expect(mockPrisma.approval.update).toHaveBeenCalled();
    });

    it('应该在顺签最后一人通过时归档文档', async () => {
      const approvalId = 'seq-approval-last';
      const approverId = 'approver-3';
      const groupId = 'group-seq-2';
      const documentId = 'doc-seq-2';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1, groupId, sequence: 3 };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-1', title: '顺签文档' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'approved' });
      mockPrisma.approval.findFirst.mockResolvedValue(null);
      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'effective' });

      const result = await service.approveSequential(approvalId, approverId, 'approved', '同意');

      expect(result).toBeDefined();
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: documentId }, data: expect.objectContaining({ status: 'effective' }) }),
      );
    });

    it('应该在顺签中驳回时终止整个流程', async () => {
      const approvalId = 'seq-reject-1';
      const approverId = 'approver-2';
      const groupId = 'group-seq-3';
      const documentId = 'doc-seq-3';
      const reason = '顺签流程中发现问题，需要重新提交';

      const mockApproval = { id: approvalId, approverId, status: 'pending', documentId, level: 1, groupId, sequence: 2 };
      const mockDocument = { id: documentId, status: 'pending', creatorId: 'creator-1', title: '顺签文档3' };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.update.mockResolvedValue({ ...mockApproval, status: 'rejected' });
      mockPrisma.approval.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.document.update.mockResolvedValue({ ...mockDocument, status: 'draft' });

      const result = await service.approveSequential(approvalId, approverId, 'rejected', reason);

      expect(result).toBeDefined();
      expect(mockPrisma.approval.updateMany).toHaveBeenCalled();
    });
  });
});
