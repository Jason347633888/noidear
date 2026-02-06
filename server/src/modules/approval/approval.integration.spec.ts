import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ApprovalModule } from './approval.module';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('Approval Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notificationService: NotificationService;
  let approvalService: ApprovalService;

  const mockPrisma: any = {
    $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    user: { findUnique: jest.fn() },
    department: { findUnique: jest.fn() },
    taskRecord: { findUnique: jest.fn(), update: jest.fn() },
    approval: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApprovalModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(NotificationService)
      .useValue(mockNotificationService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    notificationService = moduleRef.get<NotificationService>(NotificationService);
    approvalService = moduleRef.get<ApprovalService>(ApprovalService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常任务一级审批流程', () => {
    it('应该完成创建审批链→主管审批通过→任务归档的完整流程', async () => {
      const recordId = 'record-normal-001';
      const submitterId = 'user-001';
      const supervisorId = 'supervisor-001';

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        submitterId,
        status: 'pending_level1',
      };

      const mockSubmitter = {
        id: submitterId,
        superiorId: supervisorId,
        departmentId: 'dept-001',
      };

      const approvalId = 'approval-001';

      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrisma.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrisma.approval.create.mockResolvedValue({
        id: approvalId,
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
        approvalChainId: 'chain-001',
      });

      // Step 1: 创建审批链
      const result = await approvalService.createApprovalChain(recordId, submitterId);

      // 验证通知已发送
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: supervisorId,
          type: 'approval_request',
        }),
      );

      expect(result).toBeDefined();

      // Step 2: 主管审批通过
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: approvalId,
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
        nextLevel: null,
      });

      mockPrisma.approval.update.mockResolvedValue({
        id: approvalId,
        status: 'approved',
        approvedAt: new Date(),
      });

      mockPrisma.taskRecord.update.mockResolvedValue({
        ...mockRecord,
        status: 'archived',
      });

      await approvalService.approveLevel1(approvalId, supervisorId, 'approved');

      // 验证任务已归档
      expect(mockPrisma.taskRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: { status: 'archived' },
      });
    });
  });

  describe('偏离任务二级审批流程（通过）', () => {
    it('应该完成创建审批链→主管通过→经理通过→任务归档的完整流程', async () => {
      const recordId = 'record-deviation-001';
      const submitterId = 'user-002';
      const supervisorId = 'supervisor-002';
      const managerId = 'manager-002';

      const mockRecord = {
        id: recordId,
        hasDeviation: true,
        deviationCount: 2,
        submitterId,
        status: 'pending_level1',
      };

      const mockSubmitter = {
        id: submitterId,
        superiorId: supervisorId,
        departmentId: 'dept-002',
      };

      const mockDepartment = {
        id: 'dept-002',
        managerId,
      };

      const level1Id = 'approval-level1-002';
      const level2Id = 'approval-level2-002';

      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrisma.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrisma.department.findUnique.mockResolvedValue(mockDepartment);

      mockPrisma.approval.create
        .mockResolvedValueOnce({
          id: level1Id,
          recordId,
          approverId: supervisorId,
          level: 1,
          status: 'pending',
          nextLevel: level2Id,
        })
        .mockResolvedValueOnce({
          id: level2Id,
          recordId,
          approverId: managerId,
          level: 2,
          status: 'waiting',
          previousLevel: level1Id,
        });

      // Step 1: 创建二级审批链
      const result = await approvalService.createApprovalChain(recordId, submitterId);

      // 验证创建了两级审批
      expect(mockPrisma.approval.create).toHaveBeenCalledTimes(2);

      // 验证通知已发送给一级审批人
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: supervisorId,
          type: 'approval_request',
        }),
      );

      // Step 2: 一级审批通过
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: level1Id,
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
        nextLevel: level2Id,
      });

      mockPrisma.approval.findFirst.mockResolvedValue({
        id: level2Id,
        approverId: managerId,
      });

      mockPrisma.approval.update.mockResolvedValue({
        id: level1Id,
        status: 'approved',
      });

      mockPrisma.taskRecord.update.mockResolvedValue({
        ...mockRecord,
        status: 'pending_level2',
      });

      await approvalService.approveLevel1(level1Id, supervisorId, 'approved');

      // 验证通知已发送给二级审批人
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: managerId,
          type: 'approval_request',
        }),
      );

      // Step 3: 二级审批通过
      mockPrisma.approval.findUnique.mockResolvedValue({
        id: level2Id,
        recordId,
        approverId: managerId,
        level: 2,
        status: 'pending',
        previousLevel: level1Id,
      });

      mockPrisma.approval.findFirst.mockResolvedValue({
        id: level1Id,
        status: 'approved',
      });

      mockPrisma.approval.update.mockResolvedValue({
        id: level2Id,
        status: 'approved',
      });

      mockPrisma.taskRecord.update.mockResolvedValue({
        ...mockRecord,
        status: 'archived',
      });

      await approvalService.approveLevel2(level2Id, managerId, 'approved');

      // 验证任务已归档
      expect(mockPrisma.taskRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: { status: 'archived' },
      });

      // 验证通知已发送给提交人
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_approved',
        }),
      );
    });
  });

  describe('一级驳回场景', () => {
    it('应该在主管驳回后，任务记录回到草稿状态', async () => {
      const recordId = 'record-reject-001';
      const submitterId = 'user-003';
      const supervisorId = 'supervisor-003';
      const rejectionReason = '数据填写不规范，请重新填写后再提交审批';

      const mockApproval = {
        id: 'approval-reject-001',
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
        nextLevel: null,
      };

      const mockRecord = {
        id: recordId,
        submitterId,
        status: 'pending_level1',
      };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);

      mockPrisma.approval.update.mockResolvedValue({
        ...mockApproval,
        status: 'rejected',
        rejectionReason,
      });

      mockPrisma.taskRecord.update.mockResolvedValue({
        ...mockRecord,
        status: 'draft',
      });

      await approvalService.approveLevel1(mockApproval.id, supervisorId, 'rejected', rejectionReason);

      // 验证任务回到草稿状态
      expect(mockPrisma.taskRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: { status: 'draft' },
      });

      // 验证通知已发送给提交人
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_rejected',
        }),
      );
    });
  });

  describe('二级驳回场景', () => {
    it('应该在经理驳回后，任务记录回到草稿状态', async () => {
      const recordId = 'record-reject-002';
      const submitterId = 'user-004';
      const managerId = 'manager-004';
      const rejectionReason = '偏离理由不充分，请补充详细说明后重新提交';

      const level1Id = 'approval-level1-004';
      const level2Id = 'approval-level2-004';

      const mockApproval = {
        id: level2Id,
        recordId,
        approverId: managerId,
        level: 2,
        status: 'pending',
        previousLevel: level1Id,
      };

      const mockRecord = {
        id: recordId,
        submitterId,
        status: 'pending_level2',
      };

      const mockLevel1 = {
        id: level1Id,
        status: 'approved',
      };

      mockPrisma.approval.findUnique.mockResolvedValue(mockApproval);
      mockPrisma.approval.findFirst.mockResolvedValue(mockLevel1);
      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);

      mockPrisma.approval.update.mockResolvedValue({
        ...mockApproval,
        status: 'rejected',
        rejectionReason,
      });

      mockPrisma.taskRecord.update.mockResolvedValue({
        ...mockRecord,
        status: 'draft',
      });

      await approvalService.approveLevel2(level2Id, managerId, 'rejected', rejectionReason);

      // 验证任务回到草稿状态
      expect(mockPrisma.taskRecord.update).toHaveBeenCalledWith({
        where: { id: recordId },
        data: { status: 'draft' },
      });

      // 验证通知已发送给提交人
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: submitterId,
          type: 'approval_rejected',
        }),
      );
    });
  });

  describe('通知发送验证', () => {
    it('应该在一级审批创建时发送通知给主管', async () => {
      const recordId = 'record-notif-001';
      const submitterId = 'user-005';
      const supervisorId = 'supervisor-005';

      const mockRecord = {
        id: recordId,
        hasDeviation: false,
        submitterId,
      };

      const mockSubmitter = {
        id: submitterId,
        superiorId: supervisorId,
      };

      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrisma.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrisma.approval.create.mockResolvedValue({
        id: 'approval-notif-001',
        recordId,
        approverId: supervisorId,
        level: 1,
        status: 'pending',
      });

      await approvalService.createApprovalChain(recordId, submitterId);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: supervisorId,
          type: 'approval_request',
          title: expect.stringContaining('待审批'),
        }),
      );
    });
  });

  describe('审批链查询验证', () => {
    it('应该返回完整的审批链信息（包含审批人姓名）', async () => {
      const recordId = 'record-query-001';
      const level1Id = 'approval-level1-query';
      const level2Id = 'approval-level2-query';

      mockPrisma.approval.findMany.mockResolvedValue([
        {
          id: level1Id,
          recordId,
          approverId: 'user-001',
          approver: { id: 'user-001', name: '张三' },
          level: 1,
          status: 'approved',
          nextLevel: level2Id,
        },
        {
          id: level2Id,
          recordId,
          approverId: 'user-002',
          approver: { id: 'user-002', name: '李四' },
          level: 2,
          status: 'pending',
          previousLevel: level1Id,
        },
      ]);

      const result = await approvalService.getApprovalChain(recordId);

      expect(result).toHaveLength(2);
      expect(result[0].approver.name).toBe('张三');
      expect(result[1].approver.name).toBe('李四');
    });
  });

  describe('事务回滚验证', () => {
    it('应该在二级审批创建失败时回滚整个事务', async () => {
      const recordId = 'record-rollback-001';
      const submitterId = 'user-rollback';
      const supervisorId = 'supervisor-rollback';

      const mockRecord = {
        id: recordId,
        hasDeviation: true,
        submitterId,
      };

      const mockSubmitter = {
        id: submitterId,
        superiorId: supervisorId,
        departmentId: 'dept-rollback',
      };

      mockPrisma.taskRecord.findUnique.mockResolvedValue(mockRecord);
      mockPrisma.user.findUnique.mockResolvedValue(mockSubmitter);
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'dept-rollback',
        managerId: null, // 缺少部门经理
      });

      await expect(
        approvalService.createApprovalChain(recordId, submitterId),
      ).rejects.toThrow();

      // 验证事务回滚：没有创建任何审批记录
      expect(mockPrisma.approval.create).not.toHaveBeenCalled();
    });
  });
});
