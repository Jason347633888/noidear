import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建审批链
   */
  async createApprovalChain(recordId: string, userId: string) {
    const record = await this.findTaskRecord(recordId);
    const submitter = await this.findAndValidateSubmitter(record.submitterId!, userId);
    const hasDeviation = record.hasDeviation || false;

    if (!hasDeviation) {
      return this.createSingleLevelApproval(recordId, submitter.superiorId!);
    }

    return this.createTwoLevelApproval(recordId, submitter);
  }

  /**
   * 一级审批
   */
  async approveLevel1(
    approvalId: string,
    approverId: string,
    action: string,
    commentOrReason?: string,
  ) {
    this.validateComment(action, commentOrReason);
    const approval = await this.validateApproval(approvalId, approverId);

    return this.prisma.$transaction(async (tx) => {
      const record = await this.findTaskRecordInTx(tx, approval.recordId!);

      if (action === 'approved') {
        return this.processLevel1Approval(tx, approval, commentOrReason);
      }

      return this.processLevel1Rejection(tx, approval, record, commentOrReason!);
    });
  }

  /**
   * 二级审批
   */
  async approveLevel2(
    approvalId: string,
    approverId: string,
    action: string,
    commentOrReason?: string,
  ) {
    this.validateComment(action, commentOrReason);
    const approval = await this.validateApproval(approvalId, approverId);
    await this.validateLevel1Completed(approval.previousLevel);

    return this.prisma.$transaction(async (tx) => {
      const record = await this.findTaskRecordInTx(tx, approval.recordId!);

      if (action === 'approved') {
        return this.processLevel2Approval(tx, approval, record, commentOrReason);
      }

      return this.processLevel2Rejection(tx, approval, record, commentOrReason!);
    });
  }

  /**
   * 获取审批链
   */
  async getApprovalChain(recordId: string) {
    return this.prisma.approval.findMany({
      where: { recordId },
      include: {
        approver: {
          select: { id: true, name: true },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  // ========== Task Record Operations ==========

  private async findTaskRecord(recordId: string) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务记录不存在');
    }

    return record;
  }

  private async findTaskRecordInTx(tx: any, recordId: string) {
    const record = await tx.taskRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '任务记录不存在');
    }

    return record;
  }

  private async updateTaskRecordStatus(tx: any, recordId: string, status: string) {
    return tx.taskRecord.update({
      where: { id: recordId },
      data: { status },
    });
  }

  // ========== Submitter Validation ==========

  private async findAndValidateSubmitter(submitterId: string, userId: string) {
    const submitter = await this.prisma.user.findUnique({
      where: { id: submitterId },
    });

    if (!submitter || !submitter.superiorId) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '未配置直属上级，无法发起审批',
      );
    }

    if (submitter.superiorId === userId) {
      throw new BusinessException(
        ErrorCode.FORBIDDEN,
        '审批人不能是创建人本人',
      );
    }

    return submitter;
  }

  // ========== Single Level Approval ==========

  private async createSingleLevelApproval(recordId: string, approverId: string) {
    const approvalChainId = crypto.randomUUID();

    const approval = await this.prisma.approval.create({
      data: {
        id: crypto.randomUUID(),
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalChainId,
      },
    });

    await this.sendApprovalNotification(approverId, recordId, false);

    return approval;
  }

  // ========== Two Level Approval ==========

  private async createTwoLevelApproval(recordId: string, submitter: any) {
    return this.prisma.$transaction(async (tx) => {
      const department = await this.findDepartmentWithManager(tx, submitter.departmentId!);

      const chainId = crypto.randomUUID();
      const level1Id = crypto.randomUUID();
      const level2Id = crypto.randomUUID();

      const level1 = await this.createLevel1InTx(
        tx,
        level1Id,
        recordId,
        submitter.superiorId!,
        chainId,
        level2Id,
      );

      const level2 = await this.createLevel2InTx(
        tx,
        level2Id,
        recordId,
        department.managerId!,
        chainId,
        level1Id,
      );

      await this.sendApprovalNotification(submitter.superiorId!, recordId, true);

      return { level1, level2 };
    });
  }

  private async findDepartmentWithManager(tx: any, departmentId: string) {
    const department = await tx.department.findUnique({
      where: { id: departmentId },
    });

    if (!department || !department.managerId) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '未配置部门经理，无法发起二级审批',
      );
    }

    return department;
  }

  private async createLevel1InTx(
    tx: any,
    id: string,
    recordId: string,
    approverId: string,
    chainId: string,
    nextLevelId: string,
  ) {
    return tx.approval.create({
      data: {
        id,
        recordId,
        approverId,
        level: 1,
        status: 'pending',
        approvalChainId: chainId,
        nextLevel: nextLevelId,
      },
    });
  }

  private async createLevel2InTx(
    tx: any,
    id: string,
    recordId: string,
    approverId: string,
    chainId: string,
    previousLevelId: string,
  ) {
    return tx.approval.create({
      data: {
        id,
        recordId,
        approverId,
        level: 2,
        status: 'waiting',
        approvalChainId: chainId,
        previousLevel: previousLevelId,
      },
    });
  }

  // ========== Notification Operations ==========

  private async sendApprovalNotification(
    userId: string,
    recordId: string,
    isDeviation: boolean,
  ) {
    const title = isDeviation ? '您有新的偏离记录待审批' : '您有新的任务记录待审批';
    const recordType = isDeviation ? '偏离' : '任务';

    await this.notificationService.create({
      userId,
      type: 'approval_request',
      title,
      content: `${recordType}记录 ${recordId} 等待您的审批`,
    });
  }

  private async sendLevel2Notification(approverId: string, recordId: string) {
    await this.notificationService.create({
      userId: approverId,
      type: 'approval_request',
      title: '您有新的二级审批待处理',
      content: `偏离记录 ${recordId} 已通过一级审批，等待您的审批`,
    });
  }

  private async sendRejectionNotification(
    userId: string,
    recordId: string,
    reason: string,
    level: number,
  ) {
    const levelText = level === 2 ? '在二级审批时' : '';

    await this.notificationService.create({
      userId,
      type: 'approval_rejected',
      title: '任务记录被驳回',
      content: `您的任务记录 ${recordId} ${levelText}已被驳回，原因：${reason}`,
    });
  }

  private async sendApprovalCompleteNotification(userId: string, recordId: string) {
    await this.notificationService.create({
      userId,
      type: 'approval_approved',
      title: '任务记录已审批通过',
      content: `您的任务记录 ${recordId} 已通过全部审批，已归档`,
    });
  }

  // ========== Validation Operations ==========

  private validateComment(action: string, commentOrReason?: string) {
    if (action === 'rejected' && (!commentOrReason || commentOrReason.length < 10)) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '驳回原因至少10个字符',
      );
    }

    if (commentOrReason && commentOrReason.length > 500) {
      throw new BusinessException(
        ErrorCode.VALIDATION_ERROR,
        '审批意见不能超过500个字符',
      );
    }
  }

  private async validateApproval(approvalId: string, approverId: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '审批记录不存在');
    }

    if (approval.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '该审批已完成，不可修改',
      );
    }

    if (approval.approverId !== approverId) {
      // Admin 角色可以覆盖审批权限
      const user = await this.prisma.user.findUnique({
        where: { id: approverId },
      });

      if (!user || user.role !== 'admin') {
        throw new BusinessException(ErrorCode.FORBIDDEN, '无权审批此记录');
      }
    }

    return approval;
  }

  private async validateLevel1Completed(previousLevelId?: string | null) {
    if (!previousLevelId) {
      return;
    }

    const level1Approval = await this.prisma.approval.findFirst({
      where: { id: previousLevelId },
    });

    if (!level1Approval) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '一级审批记录不存在');
    }

    if (level1Approval.status !== 'approved') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '必须先通过一级审批',
      );
    }
  }

  // ========== Level 1 Approval Processing ==========

  private async processLevel1Approval(tx: any, approval: any, comment?: string) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'approved',
      comment,
      undefined,
    );

    if (approval.nextLevel) {
      await this.triggerLevel2Approval(tx, approval);
    } else {
      await this.updateTaskRecordStatus(tx, approval.recordId, 'archived');
    }

    return updatedApproval;
  }

  private async triggerLevel2Approval(tx: any, approval: any) {
    await tx.approval.update({
      where: { id: approval.nextLevel },
      data: { status: 'pending' },
    });

    await this.updateTaskRecordStatus(tx, approval.recordId, 'pending_level2');

    const level2Approval = await tx.approval.findFirst({
      where: { id: approval.nextLevel },
    });

    if (!level2Approval) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '二级审批记录不存在');
    }

    await this.sendLevel2Notification(level2Approval.approverId, approval.recordId);
  }

  private async processLevel1Rejection(tx: any, approval: any, record: any, reason: string) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'rejected',
      undefined,
      reason,
    );

    await this.updateTaskRecordStatus(tx, approval.recordId, 'draft');
    await this.sendRejectionNotification(record.submitterId!, approval.recordId, reason, 1);

    return updatedApproval;
  }

  // ========== Level 2 Approval Processing ==========

  private async processLevel2Approval(tx: any, approval: any, record: any, comment?: string) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'approved',
      comment,
      undefined,
    );

    await this.updateTaskRecordStatus(tx, approval.recordId, 'archived');
    await this.sendApprovalCompleteNotification(record.submitterId!, approval.recordId);

    return updatedApproval;
  }

  private async processLevel2Rejection(tx: any, approval: any, record: any, reason: string) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'rejected',
      undefined,
      reason,
    );

    await this.updateTaskRecordStatus(tx, approval.recordId, 'draft');
    await this.sendRejectionNotification(record.submitterId!, approval.recordId, reason, 2);

    return updatedApproval;
  }

  // ========== Approval Update Operations ==========

  private async updateApprovalStatus(
    tx: any,
    approvalId: string,
    status: string,
    comment?: string,
    rejectionReason?: string,
  ) {
    return tx.approval.update({
      where: { id: approvalId },
      data: {
        status,
        comment,
        rejectionReason,
        approvedAt: new Date(),
      },
    });
  }

  // ========== Pending Approvals Query ==========

  /**
   * 获取当前用户的待审批列表
   */
  async getPendingApprovals(approverId: string) {
    return this.prisma.approval.findMany({
      where: { approverId, status: 'pending' },
      include: {
        approver: {
          select: { id: true, name: true },
        },
        record: {
          include: {
            submitter: {
              select: { id: true, name: true },
            },
            task: {
              select: { id: true },
            },
          },
        },
        document: {
          include: {
            creator: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== Approval Detail ==========

  /**
   * 获取审批详情
   */
  async getApprovalDetail(approvalId: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        approver: {
          select: { id: true, name: true },
        },
        record: {
          include: {
            submitter: {
              select: { id: true, name: true },
            },
            task: {
              include: {
                template: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
        document: {
          include: {
            creator: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '审批记录不存在');
    }

    return approval;
  }

  // ========== Approval History ==========

  /**
   * 获取当前用户的审批历史（已处理）
   */
  async getApprovalHistory(approverId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where = {
      approverId,
      status: { in: ['approved', 'rejected'] },
    };

    const [list, total] = await Promise.all([
      this.prisma.approval.findMany({
        where,
        include: {
          approver: {
            select: { id: true, name: true },
          },
          record: {
            include: {
              submitter: {
                select: { id: true, name: true },
              },
            },
          },
          document: {
            include: {
              creator: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { approvedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.approval.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  // ========== Unified Approve/Reject ==========

  /**
   * 统一审批接口（自动路由到对应级别的处理逻辑）
   */
  async approveUnified(
    approvalId: string,
    approverId: string,
    action: string,
    commentOrReason?: string,
  ) {
    this.validateComment(action, commentOrReason);
    const approval = await this.validateApproval(approvalId, approverId);

    // 文档审批路由（documentId 存在且 recordId 为空）
    if (approval.documentId && !approval.recordId) {
      return this.prisma.$transaction(async (tx) => {
        const document = await this.findDocumentForApprovalInTx(tx, approval.documentId!);
        this.validateDocumentStatus(document);

        if (action === 'approved') {
          return this.processDocumentApproval(tx, approval, document, commentOrReason);
        }
        return this.processDocumentRejection(tx, approval, document, commentOrReason!);
      });
    }

    // 根据审批类型路由到对应逻辑
    // TODO: Uncomment after database migration for approvalType field
    // if (approval.approvalType === 'countersign') {
    //   return this.processCountersignApproval(approval, action, commentOrReason);
    // }

    // if (approval.approvalType === 'sequential') {
    //   return this.processSequentialApproval(approval, action, commentOrReason);
    // }

    // 默认单人审批，根据级别路由
    if (approval.level === 2) {
      await this.validateLevel1Completed(approval.previousLevel);
      return this.prisma.$transaction(async (tx) => {
        const record = await this.findTaskRecordInTx(tx, approval.recordId!);
        if (action === 'approved') {
          return this.processLevel2Approval(tx, approval, record, commentOrReason);
        }
        return this.processLevel2Rejection(tx, approval, record, commentOrReason!);
      });
    }

    // Level 1
    return this.prisma.$transaction(async (tx) => {
      const record = await this.findTaskRecordInTx(tx, approval.recordId!);
      if (action === 'approved') {
        return this.processLevel1Approval(tx, approval, commentOrReason);
      }
      return this.processLevel1Rejection(tx, approval, record, commentOrReason!);
    });
  }

  // ========== Countersign (会签) ==========

  /**
   * 创建会签审批（多个审批人并行审批，全部通过才算通过）
   */
  async createCountersignApproval(recordId: string, approverIds: string[]) {
    const groupId = crypto.randomUUID();
    const chainId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const approvals = [];

      for (const approverId of approverIds) {
        const approval = await tx.approval.create({
          data: {
            id: crypto.randomUUID(),
            recordId,
            approverId,
            level: 1,
            status: 'pending',
            // approvalType: 'countersign', // TODO: Uncomment after database migration
            groupId,
            approvalChainId: chainId,
            sequence: 0,
          },
        });
        approvals.push(approval);
      }

      // 发送通知给所有审批人
      for (const approverId of approverIds) {
        await this.sendApprovalNotification(approverId, recordId, false);
      }

      return approvals;
    });
  }

  /**
   * 处理会签审批
   */
  async approveCountersign(
    approvalId: string,
    approverId: string,
    action: string,
    commentOrReason?: string,
  ) {
    this.validateComment(action, commentOrReason);
    const approval = await this.validateApproval(approvalId, approverId);

    return this.processCountersignApproval(approval, action, commentOrReason);
  }

  private async processCountersignApproval(
    approval: any,
    action: string,
    commentOrReason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const record = await this.findTaskRecordInTx(tx, approval.recordId!);

      if (action === 'rejected') {
        // 会签中任一人驳回，整个流程驳回
        const updatedApproval = await this.updateApprovalStatus(
          tx,
          approval.id,
          'rejected',
          undefined,
          commentOrReason,
        );

        // 取消其他未完成的审批
        await tx.approval.updateMany({
          where: {
            groupId: approval.groupId,
            id: { not: approval.id },
            status: { in: ['pending', 'waiting'] },
          },
          data: { status: 'cancelled' },
        });

        await this.updateTaskRecordStatus(tx, approval.recordId!, 'draft');
        await this.sendRejectionNotification(
          record.submitterId!,
          approval.recordId!,
          commentOrReason!,
          1,
        );

        return updatedApproval;
      }

      // 通过当前审批
      const updatedApproval = await this.updateApprovalStatus(
        tx,
        approval.id,
        'approved',
        commentOrReason,
        undefined,
      );

      // 检查同组其他审批是否全部通过
      const remainingApprovals = await tx.approval.findMany({
        where: {
          groupId: approval.groupId,
          id: { not: approval.id },
          status: { in: ['pending', 'waiting'] },
        },
      });

      if (remainingApprovals.length === 0) {
        // 全部通过，归档记录
        await this.updateTaskRecordStatus(tx, approval.recordId!, 'archived');
        await this.sendApprovalCompleteNotification(record.submitterId!, approval.recordId!);
      }

      return updatedApproval;
    });
  }

  // ========== Sequential (顺签) ==========

  /**
   * 创建顺签审批（按顺序逐个审批）
   */
  async createSequentialApproval(recordId: string, approverIds: string[]) {
    const groupId = crypto.randomUUID();
    const chainId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const approvals = [];

      for (let i = 0; i < approverIds.length; i++) {
        const approval = await tx.approval.create({
          data: {
            id: crypto.randomUUID(),
            recordId,
            approverId: approverIds[i],
            level: 1,
            status: i === 0 ? 'pending' : 'waiting',
            // approvalType: 'sequential', // TODO: Uncomment after database migration
            groupId,
            approvalChainId: chainId,
            sequence: i + 1,
          },
        });
        approvals.push(approval);
      }

      // 只发送通知给第一个审批人
      await this.sendApprovalNotification(approverIds[0], recordId, false);

      return approvals;
    });
  }

  /**
   * 处理顺签审批
   */
  async approveSequential(
    approvalId: string,
    approverId: string,
    action: string,
    commentOrReason?: string,
  ) {
    this.validateComment(action, commentOrReason);
    const approval = await this.validateApproval(approvalId, approverId);

    return this.processSequentialApproval(approval, action, commentOrReason);
  }

  // ========== Document Approval Processing ==========

  private async findDocumentForApprovalInTx(tx: any, documentId: string) {
    const document = await tx.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new BusinessException(ErrorCode.NOT_FOUND, '文档不存在');
    }

    return document;
  }

  private validateDocumentStatus(document: any) {
    if (document.status !== 'pending') {
      throw new BusinessException(
        ErrorCode.CONFLICT,
        '文档当前状态不允许审批',
      );
    }
  }

  private async processDocumentApproval(
    tx: any,
    approval: any,
    document: any,
    comment?: string,
  ) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'approved',
      comment,
      undefined,
    );

    await tx.document.update({
      where: { id: document.id },
      data: { status: 'approved', approvedAt: new Date() },
    });

    await this.sendDocumentApprovalNotification(document.creatorId, document.id, document.title);

    return updatedApproval;
  }

  private async processDocumentRejection(
    tx: any,
    approval: any,
    document: any,
    reason: string,
  ) {
    const updatedApproval = await this.updateApprovalStatus(
      tx,
      approval.id,
      'rejected',
      undefined,
      reason,
    );

    await tx.document.update({
      where: { id: document.id },
      data: { status: 'draft' },
    });

    await this.sendDocumentRejectionNotification(
      document.creatorId,
      document.id,
      document.title,
      reason,
    );

    return updatedApproval;
  }

  private async sendDocumentApprovalNotification(
    userId: string,
    documentId: string,
    documentTitle: string,
  ) {
    await this.notificationService.create({
      userId,
      type: 'approval_approved',
      title: '文档审批通过',
      content: `您的文档「${documentTitle}」(${documentId}) 已通过审批`,
    });
  }

  private async sendDocumentRejectionNotification(
    userId: string,
    documentId: string,
    documentTitle: string,
    reason: string,
  ) {
    await this.notificationService.create({
      userId,
      type: 'approval_rejected',
      title: '文档审批被驳回',
      content: `您的文档「${documentTitle}」(${documentId}) 已被驳回，原因：${reason}`,
    });
  }

  private async processSequentialApproval(
    approval: any,
    action: string,
    commentOrReason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const record = await this.findTaskRecordInTx(tx, approval.recordId!);

      if (action === 'rejected') {
        // 顺签中驳回，终止整个流程
        const updatedApproval = await this.updateApprovalStatus(
          tx,
          approval.id,
          'rejected',
          undefined,
          commentOrReason,
        );

        // 取消后续未完成的审批
        await tx.approval.updateMany({
          where: {
            groupId: approval.groupId,
            id: { not: approval.id },
            status: { in: ['pending', 'waiting'] },
          },
          data: { status: 'cancelled' },
        });

        await this.updateTaskRecordStatus(tx, approval.recordId!, 'draft');
        await this.sendRejectionNotification(
          record.submitterId!,
          approval.recordId!,
          commentOrReason!,
          1,
        );

        return updatedApproval;
      }

      // 通过当前审批
      const updatedApproval = await this.updateApprovalStatus(
        tx,
        approval.id,
        'approved',
        commentOrReason,
        undefined,
      );

      // 查找下一个顺签审批
      const nextApproval = await tx.approval.findFirst({
        where: {
          groupId: approval.groupId,
          sequence: approval.sequence + 1,
          status: 'waiting',
        },
      });

      if (nextApproval) {
        // 激活下一个审批人
        await tx.approval.update({
          where: { id: nextApproval.id },
          data: { status: 'pending' },
        });
        await this.sendApprovalNotification(nextApproval.approverId, approval.recordId!, false);
      } else {
        // 所有顺签审批完成，归档记录
        await this.updateTaskRecordStatus(tx, approval.recordId!, 'archived');
        await this.sendApprovalCompleteNotification(record.submitterId!, approval.recordId!);
      }

      return updatedApproval;
    });
  }
}
