import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('ApprovalService - Phase 10: Two-Level Approval', () => {
  let service: ApprovalService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
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
});
