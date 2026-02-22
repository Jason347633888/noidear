import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('ApprovalService - Phase 10: Two-Level Approval', () => {
  let service: ApprovalService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService: any = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    taskRecord: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    approval: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockNotificationService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  describe('createApprovalChain', () => {
    it('应该为正常记录创建一级审批（主管审批）', async () => {
      const recordId = 'record-123';
      const userId = 'user-123';
      const supervisorId = 'supervisor-456';

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        deviationCount: 0,
        submitterId: userId,
      };

      const mockSubmitter = {
        id: userId,
        superiorId: supervisorId,
        departmentId: 'dept-001',
      };

      mockPrismaService.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrismaService.approval.create.mockResolvedValue({
        id: 'approval-1',
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
        approvalChainId: 'chain-1',
      });

      const result = await service.createApprovalChain(recordId, userId);

      expect(result).toHaveProperty('level', 1);
      expect(result).toHaveProperty('approverId', supervisorId);
      expect(result).toHaveProperty('status', 'pending');
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: supervisorId,
          type: 'approval_request',
          title: expect.stringContaining('待审批'),
        }),
      );
    });

    it('应该为偏离记录创建两级审批链（主管 → 经理）', async () => {
      const recordId = 'record-456';
      const userId = 'user-123';
      const supervisorId = 'supervisor-456';
      const managerId = 'manager-789';

      const mockRecord = {
        id: recordId,
        hasDeviation: true,
        deviationCount: 2,
        submitterId: userId,
      };

      const mockSubmitter = {
        id: userId,
        superiorId: supervisorId,
        departmentId: 'dept-001',
      };

      const mockDepartment = {
        id: 'dept-001',
        managerId,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: mockPrismaService.taskRecord,
          user: mockPrismaService.user,
          department: mockPrismaService.department,
          approval: mockPrismaService.approval,
        };
        return callback(tx);
      });

      mockPrismaService.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);
      mockPrismaService.approval.create
        .mockResolvedValueOnce({
          id: 'approval-level1',
          recordId,
          approverId: supervisorId,
          level: 1,
          status: 'pending',
          approvalChainId: 'chain-1',
          nextLevel: 'approval-level2',
        })
        .mockResolvedValueOnce({
          id: 'approval-level2',
          recordId,
          approverId: managerId,
          level: 2,
          status: 'waiting',
          approvalChainId: 'chain-1',
          previousLevel: 'approval-level1',
        });

      const result: any = await service.createApprovalChain(recordId, userId);

      expect(result).toHaveProperty('level1');
      expect(result).toHaveProperty('level2');
      expect(result.level1).toHaveProperty('approverId', supervisorId);
      expect(result.level2).toHaveProperty('approverId', managerId);
      expect(mockPrismaService.approval.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });

    it('应该在提交人未配置直属上级时抛出错误（BR-032）', async () => {
      const recordId = 'record-789';
      const userId = 'user-123';

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        submitterId: userId,
      };

      const mockSubmitter = {
        id: userId,
        superiorId: null,
        departmentId: 'dept-001',
      };

      mockPrismaService.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.user.findUnique.mockResolvedValue(mockSubmitter);

      await expect(service.createApprovalChain(recordId, userId)).rejects.toThrow(
        BusinessException,
      );
      await expect(service.createApprovalChain(recordId, userId)).rejects.toThrow(
        '未配置直属上级',
      );
    });

    it('应该在偏离记录未配置部门经理时抛出错误（BR-032）', async () => {
      const recordId = 'record-101';
      const userId = 'user-123';
      const supervisorId = 'supervisor-456';

      const mockRecord = {
        id: recordId,
        hasDeviation: true,
        deviationCount: 1,
        submitterId: userId,
      };

      const mockSubmitter = {
        id: userId,
        superiorId: supervisorId,
        departmentId: 'dept-001',
      };

      const mockDepartment = {
        id: 'dept-001',
        managerId: null,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: mockPrismaService.taskRecord,
          user: mockPrismaService.user,
          department: mockPrismaService.department,
        };
        return callback(tx);
      });

      mockPrismaService.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrismaService.department.findUnique.mockResolvedValue(mockDepartment);

      await expect(service.createApprovalChain(recordId, userId)).rejects.toThrow(
        '未配置部门经理',
      );
    });
  });

  describe('approveLevel1', () => {
    it('应该允许主管通过一级审批，并自动创建二级审批（偏离记录）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';
      const recordId = 'record-123';
      const level2ApproverId = 'manager-789';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        nextLevel: 'approval-2',
      };

      const mockRecord = {
        id: recordId,
        hasDeviation: true,
        submitterId: 'user-123',
        status: 'pending_level1',
      };

      const mockLevel2Approval = {
        id: 'approval-2',
        approverId: level2ApproverId,
        level: 2,
        status: 'waiting',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'pending_level2' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
            findFirst: jest.fn().mockResolvedValue(mockLevel2Approval),
          },
        };
        return callback(tx);
      });

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      const result = await service.approveLevel1(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: level2ApproverId,
          type: 'approval_request',
          title: expect.stringContaining('二级审批'),
        }),
      );
    });

    it('应该允许主管通过一级审批，无二级时直接归档（正常记录）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';
      const recordId = 'record-123';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        nextLevel: null,
      };

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        submitterId: 'user-123',
        status: 'pending_level1',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      const result = await service.approveLevel1(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该允许主管驳回一级审批，记录回到草稿状态（BR-036）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';
      const recordId = 'record-123';
      const submitterId = 'user-123';
      const rejectionReason = '数据填写不规范，请重新填写';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        nextLevel: null,
      };

      const mockRecord = {
        id: recordId,
        submitterId,
        status: 'pending_level1',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected' }),
          },
        };
        return callback(tx);
      });

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      const result = await service.approveLevel1(approvalId, approverId, 'rejected', rejectionReason);

      expect(result.status).toBe('rejected');
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_rejected',
          content: expect.stringContaining(rejectionReason),
        }),
      );
    });

    it('应该拒绝非主管用户审批', async () => {
      const approvalId = 'approval-1';
      const wrongUserId = 'wrong-user-999';
      const correctApproverId = 'supervisor-456';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId: correctApproverId,
        level: 1,
        status: 'pending',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveLevel1(approvalId, wrongUserId, 'approved', '同意'),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.approveLevel1(approvalId, wrongUserId, 'approved', '同意'),
      ).rejects.toThrow('无权审批此记录');
    });

    it('应该在审批记录不存在时报错', async () => {
      mockPrismaService.approval.findUnique.mockResolvedValue(null);

      await expect(
        service.approveLevel1('non-exist-id', 'user-123', 'approved', '同意'),
      ).rejects.toThrow('审批记录不存在');
    });

    it('应该在重复审批时报错（BR-034）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 1,
        status: 'approved',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveLevel1(approvalId, approverId, 'approved', '同意'),
      ).rejects.toThrow('该审批已完成，不可修改');
    });

    it('应该在驳回原因少于10字时拒绝（BR-035）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 1,
        status: 'pending',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveLevel1(approvalId, approverId, 'rejected', '太短'),
      ).rejects.toThrow('驳回原因至少10个字符');
    });

    it('应该在审批意见超过500字时拒绝（BR-034）', async () => {
      const approvalId = 'approval-1';
      const approverId = 'supervisor-456';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 1,
        status: 'pending',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      const longComment = 'a'.repeat(501);

      await expect(
        service.approveLevel1(approvalId, approverId, 'approved', longComment),
      ).rejects.toThrow('审批意见不能超过500个字符');
    });
  });

  describe('approveLevel2', () => {
    it('应该允许经理通过二级审批，任务记录归档', async () => {
      const approvalId = 'approval-2';
      const approverId = 'manager-789';
      const recordId = 'record-123';
      const submitterId = 'user-123';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-1',
      };

      const mockLevel1Approval = {
        id: 'approval-1',
        status: 'approved',
      };

      const mockRecord = {
        id: recordId,
        submitterId,
        status: 'pending_level2',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockLevel1Approval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveLevel2(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_approved',
          title: expect.stringContaining('审批通过'),
        }),
      );
    });

    it('应该允许经理驳回二级审批，任务记录回到草稿状态（BR-036）', async () => {
      const approvalId = 'approval-2';
      const approverId = 'manager-789';
      const recordId = 'record-123';
      const submitterId = 'user-123';
      const rejectionReason = '偏离理由不充分，请重新填写';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-1',
      };

      const mockLevel1Approval = {
        id: 'approval-1',
        status: 'approved',
      };

      const mockRecord = {
        id: recordId,
        submitterId,
        status: 'pending_level2',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockLevel1Approval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveLevel2(approvalId, approverId, 'rejected', rejectionReason);

      expect(result.status).toBe('rejected');
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_rejected',
          content: expect.stringContaining(rejectionReason),
        }),
      );
    });

    it('应该拒绝非经理用户审批', async () => {
      const approvalId = 'approval-2';
      const wrongUserId = 'wrong-user-999';
      const correctApproverId = 'manager-789';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId: correctApproverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-1',
      };

      const mockLevel1Approval = {
        id: 'approval-1',
        status: 'approved',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockLevel1Approval);

      await expect(
        service.approveLevel2(approvalId, wrongUserId, 'approved', '同意'),
      ).rejects.toThrow('无权审批此记录');
    });

    it('应该在一级审批未通过时拒绝二级审批（BR-037）', async () => {
      const approvalId = 'approval-2';
      const approverId = 'manager-789';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-1',
      };

      const mockLevel1Approval = {
        id: 'approval-1',
        status: 'pending',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockLevel1Approval);

      await expect(
        service.approveLevel2(approvalId, approverId, 'approved', '同意'),
      ).rejects.toThrow('必须先通过一级审批');
    });

    it('应该在重复审批时报错', async () => {
      const approvalId = 'approval-2';
      const approverId = 'manager-789';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 2,
        status: 'approved',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveLevel2(approvalId, approverId, 'approved', '同意'),
      ).rejects.toThrow('该审批已完成，不可修改');
    });

    it('应该在驳回原因少于10字时拒绝', async () => {
      const approvalId = 'approval-2';
      const approverId = 'manager-789';

      const mockApproval = {
        id: approvalId,
        recordId: 'record-123',
        approverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-1',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      await expect(
        service.approveLevel2(approvalId, approverId, 'rejected', '太短'),
      ).rejects.toThrow('驳回原因至少10个字符');
    });
  });

  describe('getApprovalChain', () => {
    it('应该返回单级审批链', async () => {
      const recordId = 'record-123';

      const mockApprovals = [
        {
          id: 'approval-1',
          recordId,
          level: 1,
          status: 'approved',
          approver: { id: 'supervisor-456', name: '主管张三' },
        },
      ];

      mockPrismaService.approval.findMany.mockResolvedValue(mockApprovals);

      const result = await service.getApprovalChain(recordId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('level', 1);
      expect(result[0].approver).toHaveProperty('name', '主管张三');
    });

    it('应该返回二级审批链', async () => {
      const recordId = 'record-456';

      const mockApprovals = [
        {
          id: 'approval-1',
          recordId,
          level: 1,
          status: 'approved',
          approver: { id: 'supervisor-456', name: '主管张三' },
        },
        {
          id: 'approval-2',
          recordId,
          level: 2,
          status: 'approved',
          approver: { id: 'manager-789', name: '经理李四' },
        },
      ];

      mockPrismaService.approval.findMany.mockResolvedValue(mockApprovals);

      const result = await service.getApprovalChain(recordId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('level', 1);
      expect(result[1]).toHaveProperty('level', 2);
    });

    it('应该在任务记录不存在时返回空数组', async () => {
      const recordId = 'non-exist-record';

      mockPrismaService.approval.findMany.mockResolvedValue([]);

      const result = await service.getApprovalChain(recordId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getPendingApprovals', () => {
    it('应该返回当前用户的所有待审批记录', async () => {
      const approverId = 'supervisor-456';

      const mockPendingApprovals = [
        {
          id: 'approval-1',
          recordId: 'record-1',
          documentId: null,
          approverId,
          level: 1,
          status: 'pending',
          approvalType: 'single',
          createdAt: new Date('2026-01-01'),
          record: {
            id: 'record-1',
            task: { id: 'task-1' },
            submitter: { id: 'user-1', name: '张三' },
          },
          document: null,
        },
        {
          id: 'approval-2',
          documentId: 'doc-1',
          recordId: null,
          approverId,
          level: 1,
          status: 'pending',
          approvalType: 'single',
          createdAt: new Date('2026-01-02'),
          record: null,
          document: {
            id: 'doc-1',
            title: '测试文档',
            number: 'DOC-001',
            creator: { id: 'user-2', name: '李四' },
          },
        },
      ];

      mockPrismaService.approval.findMany.mockResolvedValue(mockPendingApprovals);

      const result = await service.getPendingApprovals(approverId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'approval-1');
      expect(result[1]).toHaveProperty('id', 'approval-2');
      expect(mockPrismaService.approval.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { approverId, status: 'pending' },
        }),
      );
    });

    it('应该在没有待审批记录时返回空数组', async () => {
      const approverId = 'user-no-approvals';

      mockPrismaService.approval.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(approverId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getApprovalDetail', () => {
    it('应该返回审批详情（包含关联的记录和文档信息）', async () => {
      const approvalId = 'approval-detail-1';

      const mockDetail = {
        id: approvalId,
        recordId: 'record-1',
        documentId: null,
        approverId: 'supervisor-456',
        level: 1,
        status: 'pending',
        approvalType: 'single',
        comment: null,
        rejectionReason: null,
        approvedAt: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        approver: { id: 'supervisor-456', name: '主管王五' },
        record: {
          id: 'record-1',
          dataJson: { field1: 'value1' },
          status: 'pending_level1',
          submitter: { id: 'user-1', name: '张三' },
          task: { id: 'task-1', template: { id: 'tpl-1', title: '模板A' } },
        },
        document: null,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockDetail);

      const result = await service.getApprovalDetail(approvalId);

      expect(result).toHaveProperty('id', approvalId);
      expect(result).toHaveProperty('approver');
      expect(result.approver).toHaveProperty('name', '主管王五');
      expect(result).toHaveProperty('record');
      expect(result.record).toHaveProperty('submitter');
    });

    it('应该在审批记录不存在时抛出错误', async () => {
      mockPrismaService.approval.findUnique.mockResolvedValue(null);

      await expect(
        service.getApprovalDetail('non-exist-id'),
      ).rejects.toThrow('审批记录不存在');
    });
  });

  describe('getApprovalHistory', () => {
    it('应该返回当前用户已处理的审批记录', async () => {
      const approverId = 'supervisor-456';

      const mockHistory = [
        {
          id: 'approval-h1',
          recordId: 'record-h1',
          approverId,
          level: 1,
          status: 'approved',
          comment: '同意',
          approvedAt: new Date('2026-01-03'),
          record: {
            id: 'record-h1',
            submitter: { id: 'user-1', name: '张三' },
          },
        },
        {
          id: 'approval-h2',
          recordId: 'record-h2',
          approverId,
          level: 1,
          status: 'rejected',
          rejectionReason: '数据有误，请重新填写后再提交',
          approvedAt: new Date('2026-01-02'),
          record: {
            id: 'record-h2',
            submitter: { id: 'user-2', name: '李四' },
          },
        },
      ];

      mockPrismaService.approval.findMany.mockResolvedValue(mockHistory);
      mockPrismaService.approval.count = jest.fn().mockResolvedValue(2);

      const result = await service.getApprovalHistory(approverId, 1, 20);

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 2);
      expect(result.list).toHaveLength(2);
      expect(result.list[0]).toHaveProperty('status', 'approved');
      expect(result.list[1]).toHaveProperty('status', 'rejected');
    });

    it('应该支持分页查询', async () => {
      const approverId = 'supervisor-456';

      mockPrismaService.approval.findMany.mockResolvedValue([]);
      mockPrismaService.approval.count = jest.fn().mockResolvedValue(0);

      const result = await service.getApprovalHistory(approverId, 2, 10);

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total', 0);
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 10);
    });
  });

  describe('approveUnified', () => {
    it('应该通过审批ID自动识别审批级别并处理通过操作', async () => {
      const approvalId = 'approval-unified-1';
      const approverId = 'supervisor-456';
      const recordId = 'record-unified-1';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        nextLevel: null,
        approvalType: 'single',
      };

      const mockRecord = {
        id: recordId,
        submitterId: 'user-1',
        status: 'pending_level1',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该通过审批ID自动识别审批级别并处理驳回操作', async () => {
      const approvalId = 'approval-unified-2';
      const approverId = 'supervisor-456';
      const recordId = 'record-unified-2';
      const reason = '数据填写不规范，请重新填写';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        nextLevel: null,
        approvalType: 'single',
      };

      const mockRecord = {
        id: recordId,
        submitterId: 'user-1',
        status: 'pending_level1',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected', rejectionReason: reason }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, approverId, 'rejected', reason);

      expect(result.status).toBe('rejected');
    });

    it('应该自动路由到二级审批处理逻辑', async () => {
      const approvalId = 'approval-unified-3';
      const approverId = 'manager-789';
      const recordId = 'record-unified-3';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 2,
        status: 'pending',
        previousLevel: 'approval-prev-1',
        approvalType: 'single',
      };

      const mockLevel1 = {
        id: 'approval-prev-1',
        status: 'approved',
      };

      const mockRecord = {
        id: recordId,
        submitterId: 'user-1',
        status: 'pending_level2',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findFirst.mockResolvedValue(mockLevel1);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });
  });

  describe('countersign - 会签逻辑', () => {
    it('应该为会签创建多个审批记录（同一组）', async () => {
      const recordId = 'record-cs-1';
      const userId = 'user-cs-1';
      const approverIds = ['approver-1', 'approver-2', 'approver-3'];

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        submitterId: userId,
      };

      const mockSubmitter = {
        id: userId,
        superiorId: 'supervisor-cs',
        departmentId: 'dept-cs',
      };

      mockPrismaService.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.user.findUnique.mockResolvedValue(mockSubmitter);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: mockPrismaService.taskRecord,
          user: mockPrismaService.user,
          department: mockPrismaService.department,
          approval: {
            create: jest.fn().mockImplementation((args) =>
              Promise.resolve({
                id: `cs-${Math.random()}`,
                ...args.data,
              }),
            ),
          },
        };
        return callback(tx);
      });

      const result = await service.createCountersignApproval(recordId, approverIds);

      expect(result).toHaveLength(3);
      result.forEach((approval: any) => {
        // TODO: Uncomment after database migration for approvalType field
        // expect(approval).toHaveProperty('approvalType', 'countersign');
        expect(approval).toHaveProperty('groupId');
        expect(approval).toHaveProperty('status', 'pending');
      });
    });

    it('应该在会签中一人通过时不改变记录状态', async () => {
      const groupId = 'group-cs-1';
      const approvalId = 'cs-approval-1';
      const approverId = 'approver-1';
      const recordId = 'record-cs-2';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'countersign',
        groupId,
      };

      const mockOtherApprovals = [
        { id: 'cs-approval-2', status: 'pending', approvalType: 'countersign', groupId },
        { id: 'cs-approval-3', status: 'pending', approvalType: 'countersign', groupId },
      ];

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.approval.findMany.mockResolvedValue(mockOtherApprovals);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn(),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
            findMany: jest.fn().mockResolvedValue(mockOtherApprovals),
          },
        };
        return callback(tx);
      });

      const result = await service.approveCountersign(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该在会签全部通过时归档记录', async () => {
      const groupId = 'group-cs-2';
      const approvalId = 'cs-approval-last';
      const approverId = 'approver-3';
      const recordId = 'record-cs-3';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'countersign',
        groupId,
      };

      const allApproved = [
        { id: 'cs-a1', status: 'approved', approvalType: 'countersign', groupId },
        { id: 'cs-a2', status: 'approved', approvalType: 'countersign', groupId },
      ];

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn().mockResolvedValue({ id: recordId, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
            findMany: jest.fn().mockResolvedValue(allApproved),
          },
        };
        return callback(tx);
      });

      const result = await service.approveCountersign(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该在会签中任一人驳回时驳回整个流程', async () => {
      const groupId = 'group-cs-3';
      const approvalId = 'cs-reject-1';
      const approverId = 'approver-2';
      const recordId = 'record-cs-4';
      const reason = '会签审批不同意，数据需要重新核实';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'countersign',
        groupId,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn().mockResolvedValue({ id: recordId, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected' }),
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return callback(tx);
      });

      const result = await service.approveCountersign(approvalId, approverId, 'rejected', reason);

      expect(result.status).toBe('rejected');
    });
  });

  describe('sequential - 顺签逻辑', () => {
    it('应该为顺签创建有序审批记录', async () => {
      const recordId = 'record-seq-1';
      const approverIds = ['approver-1', 'approver-2', 'approver-3'];

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          approval: {
            create: jest.fn().mockImplementation((args) =>
              Promise.resolve({
                id: `seq-${args.data.sequence}`,
                ...args.data,
              }),
            ),
          },
        };
        return callback(tx);
      });

      const result = await service.createSequentialApproval(recordId, approverIds);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('sequence', 1);
      expect(result[0]).toHaveProperty('status', 'pending');
      expect(result[1]).toHaveProperty('sequence', 2);
      expect(result[1]).toHaveProperty('status', 'waiting');
      expect(result[2]).toHaveProperty('sequence', 3);
      expect(result[2]).toHaveProperty('status', 'waiting');
    });

    it('应该在顺签中当前人通过后激活下一个审批人', async () => {
      const groupId = 'group-seq-1';
      const approvalId = 'seq-approval-1';
      const approverId = 'approver-1';
      const recordId = 'record-seq-2';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'sequential',
        groupId,
        sequence: 1,
      };

      const nextApproval = {
        id: 'seq-approval-2',
        recordId,
        approverId: 'approver-2',
        level: 1,
        status: 'waiting',
        approvalType: 'sequential',
        groupId,
        sequence: 2,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn(),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
            findFirst: jest.fn().mockResolvedValue(nextApproval),
          },
        };
        return callback(tx);
      });

      const result = await service.approveSequential(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该在顺签最后一人通过时归档记录', async () => {
      const groupId = 'group-seq-2';
      const approvalId = 'seq-approval-last';
      const approverId = 'approver-3';
      const recordId = 'record-seq-3';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'sequential',
        groupId,
        sequence: 3,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn().mockResolvedValue({ id: recordId, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      const result = await service.approveSequential(approvalId, approverId, 'approved', '同意');

      expect(result.status).toBe('approved');
    });

    it('应该在顺签中驳回时终止整个流程', async () => {
      const groupId = 'group-seq-3';
      const approvalId = 'seq-reject-1';
      const approverId = 'approver-2';
      const recordId = 'record-seq-4';
      const reason = '顺签流程中发现问题，需要重新提交';

      const mockApproval = {
        id: approvalId,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'sequential',
        groupId,
        sequence: 2,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue({ id: recordId, submitterId: 'user-1' }),
            update: jest.fn().mockResolvedValue({ id: recordId, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected' }),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveSequential(approvalId, approverId, 'rejected', reason);

      expect(result.status).toBe('rejected');
    });
  });

  // ========== Phase TASK-055: Document Approval Tests ==========

  describe('approveUnified - document approval routing', () => {
    it('应该在文档审批通过时更新文档状态为 approved', async () => {
      const approvalId = 'doc-approval-1';
      const approverId = 'approver-doc-1';
      const documentId = 'doc-001';

      const mockApproval = {
        id: approvalId,
        documentId,
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      const mockDocument = {
        id: documentId,
        title: '测试文档',
        number: 'DOC-001',
        status: 'pending',
        creatorId: 'creator-001',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(mockDocument),
            update: jest.fn().mockResolvedValue({ ...mockDocument, status: 'approved' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, approverId, 'approved', '文档审批通过');

      expect(result.status).toBe('approved');
    });

    it('应该在文档审批驳回时更新文档状态为 draft', async () => {
      const approvalId = 'doc-approval-2';
      const approverId = 'approver-doc-2';
      const documentId = 'doc-002';
      const reason = '文档内容需要修改，格式不符合规范要求';

      const mockApproval = {
        id: approvalId,
        documentId,
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      const mockDocument = {
        id: documentId,
        title: '测试文档2',
        number: 'DOC-002',
        status: 'pending',
        creatorId: 'creator-002',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(mockDocument),
            update: jest.fn().mockResolvedValue({ ...mockDocument, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected', rejectionReason: reason }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, approverId, 'rejected', reason);

      expect(result.status).toBe('rejected');
    });

    it('应该在文档不存在时抛出错误', async () => {
      const approvalId = 'doc-approval-3';
      const approverId = 'approver-doc-3';

      const mockApproval = {
        id: approvalId,
        documentId: 'doc-not-exist',
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          approval: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.approveUnified(approvalId, approverId, 'approved', '通过'),
      ).rejects.toThrow('文档不存在');
    });

    it('应该在文档状态不是 pending 时拒绝审批', async () => {
      const approvalId = 'doc-approval-4';
      const approverId = 'approver-doc-4';

      const mockApproval = {
        id: approvalId,
        documentId: 'doc-004',
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      const mockDocument = {
        id: 'doc-004',
        title: '已通过文档',
        status: 'approved',
        creatorId: 'creator-004',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(mockDocument),
            update: jest.fn(),
          },
          approval: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await expect(
        service.approveUnified(approvalId, approverId, 'approved', '通过'),
      ).rejects.toThrow('文档当前状态不允许审批');
    });

    it('应该在文档审批通过后发送通知给文档创建人', async () => {
      const approvalId = 'doc-approval-5';
      const approverId = 'approver-doc-5';
      const documentId = 'doc-005';
      const creatorId = 'creator-005';

      const mockApproval = {
        id: approvalId,
        documentId,
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      const mockDocument = {
        id: documentId,
        title: '通知测试文档',
        number: 'DOC-005',
        status: 'pending',
        creatorId,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(mockDocument),
            update: jest.fn().mockResolvedValue({ ...mockDocument, status: 'approved' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      await service.approveUnified(approvalId, approverId, 'approved', '同意');

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: creatorId,
          type: 'approval_approved',
          title: expect.stringContaining('审批通过'),
        }),
      );
    });

    it('应该在文档审批驳回后发送驳回通知给文档创建人', async () => {
      const approvalId = 'doc-approval-6';
      const approverId = 'approver-doc-6';
      const documentId = 'doc-006';
      const creatorId = 'creator-006';
      const reason = '文档格式不符合要求，内容存在错误需要修改';

      const mockApproval = {
        id: approvalId,
        documentId,
        recordId: null,
        approverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
        previousLevel: null,
        groupId: null,
      };

      const mockDocument = {
        id: documentId,
        title: '驳回通知测试文档',
        number: 'DOC-006',
        status: 'pending',
        creatorId,
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          document: {
            findUnique: jest.fn().mockResolvedValue(mockDocument),
            update: jest.fn().mockResolvedValue({ ...mockDocument, status: 'draft' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'rejected', rejectionReason: reason }),
          },
        };
        return callback(tx);
      });

      await service.approveUnified(approvalId, approverId, 'rejected', reason);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: creatorId,
          type: 'approval_rejected',
          content: expect.stringContaining(reason),
        }),
      );
    });
  });

  describe('validateApproval - Admin override', () => {
    it('应该允许 Admin 角色审批任何记录（即使不是指定审批人）', async () => {
      const approvalId = 'admin-override-1';
      const adminId = 'admin-user-001';
      const originalApproverId = 'original-approver';
      const recordId = 'record-admin-1';

      const mockApproval = {
        id: approvalId,
        recordId,
        documentId: null,
        approverId: originalApproverId,
        level: 1,
        status: 'pending',
        approvalType: 'single',
        nextLevel: null,
      };

      const mockAdmin = {
        id: adminId,
        role: 'admin',
      };

      const mockRecord = {
        id: recordId,
        submitterId: 'user-1',
        status: 'pending_level1',
      };

      mockPrismaService.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin);

      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          taskRecord: {
            findUnique: jest.fn().mockResolvedValue(mockRecord),
            update: jest.fn().mockResolvedValue({ ...mockRecord, status: 'archived' }),
          },
          approval: {
            update: jest.fn().mockResolvedValue({ ...mockApproval, status: 'approved' }),
          },
        };
        return callback(tx);
      });

      const result = await service.approveUnified(approvalId, adminId, 'approved', '管理员审批通过');

      expect(result.status).toBe('approved');
    });
  });
});
