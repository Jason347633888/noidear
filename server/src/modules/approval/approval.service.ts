import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';
import { CANONICAL_DOCUMENT_STATUS } from '../document/constants/document-control.constants';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 获取审批链（仅文档审批）
   */
  async getApprovalChain(documentId: string) {
    return this.prisma.approval.findMany({
      where: { documentId },
      include: {
        approver: {
          select: { id: true, name: true },
        },
      },
      orderBy: { level: 'asc' },
    });
  }

  // ========== Notification Operations ==========

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
        include: { roleObj: true },
      });

      const userRoleCode = user?.roleObj?.code;
      if (!user || userRoleCode !== 'admin') {
        throw new BusinessException(ErrorCode.FORBIDDEN, '无权审批此记录');
      }
    }

    return approval;
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
   * 获取当前用户的待审批列表（旧 Approval 表 + 统一审批任务）
   */
  async getPendingApprovals(approverId: string) {
    const legacyApprovals = await this.prisma.approval.findMany({
      where: { approverId, status: 'pending' },
      include: {
        approver: { select: { id: true, name: true } },
        document: { include: { creator: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 追加统一审批引擎中该用户的待办任务（兼容旧部署）
    let unifiedTasks: Array<{ source: 'unified'; task: any }> = [];
    try {
      const tasks = await this.prisma.approvalTask.findMany({
        where: { assigneeUserId: approverId, status: 'PENDING' },
        include: { instance: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      unifiedTasks = tasks.map((task: any) => ({ source: 'unified' as const, task }));
    } catch {
      // approvalTask 表在旧部署中可能不存在，静默跳过
    }

    return { legacy: legacyApprovals, unified: unifiedTasks };
  }

  // ========== Approval Detail ==========

  /**
   * 获取审批详情
   */
  async getApprovalDetail(approvalId: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        approver: { select: { id: true, name: true } },
        document: { include: { creator: { select: { id: true, name: true } } } },
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
          approver: { select: { id: true, name: true } },
          document: { include: { creator: { select: { id: true, name: true } } } },
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

    if (!approval.documentId) {
      throw new BusinessException(ErrorCode.VALIDATION_ERROR, '仅支持文档审批');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const document = await this.findDocumentForApprovalInTx(tx, approval.documentId!);
      this.validateDocumentStatus(document);

      if (action === 'approved') {
        return this.processDocumentApproval(tx, approval, document, commentOrReason);
      }
      return this.processDocumentRejection(tx, approval, document, commentOrReason!);
    });
  }

  // ========== Countersign (会签) ==========

  /**
   * 创建会签审批（多个审批人并行审批，全部通过才算通过）
   */
  async createCountersignApproval(documentId: string, approverIds: string[]) {
    const groupId = crypto.randomUUID();
    const chainId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx: any) => {
      const approvals: any[] = [];

      for (const approverId of approverIds) {
        const approval = await tx.approval.create({
          data: {
            id: crypto.randomUUID(),
            documentId,
            approverId,
            level: 1,
            status: 'pending',
            groupId,
            approvalChainId: chainId,
            sequence: 0,
          },
        });
        approvals.push(approval);
      }

      for (const approverId of approverIds) {
        await this.sendDocumentApprovalRequestNotification(approverId, documentId);
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
    return this.prisma.$transaction(async (tx: any) => {
      if (action === 'rejected') {
        const updatedApproval = await this.updateApprovalStatus(tx, approval.id, 'rejected', undefined, commentOrReason);
        await tx.approval.updateMany({
          where: { groupId: approval.groupId, id: { not: approval.id }, status: { in: ['pending', 'waiting'] } },
          data: { status: 'cancelled' },
        });
        if (approval.documentId) {
          await tx.document.update({ where: { id: approval.documentId }, data: { status: 'draft' } });
        }
        return updatedApproval;
      }

      const updatedApproval = await this.updateApprovalStatus(tx, approval.id, 'approved', commentOrReason, undefined);
      const remainingCount = await tx.approval.count({
        where: { groupId: approval.groupId, id: { not: approval.id }, status: { in: ['pending', 'waiting'] } },
      });
      if (remainingCount === 0 && approval.documentId) {
        await this.finalizeDocumentApproval(tx, approval.documentId);
      }
      return updatedApproval;
    });
  }

  private async finalizeDocumentApproval(tx: any, documentId: string) {
    const doc = await tx.document.findUnique({ where: { id: documentId } });
    if (!doc) return;
    await tx.document.update({
      where: { id: documentId },
      data: { status: CANONICAL_DOCUMENT_STATUS.EFFECTIVE, approvedAt: new Date() },
    });
    await this.sendDocumentApprovalNotification(doc.creatorId, doc.id, doc.title);
  }

  // ========== Sequential (顺签) ==========

  /**
   * 创建顺签审批（按顺序逐个审批）
   */
  async createSequentialApproval(documentId: string, approverIds: string[]) {
    const groupId = crypto.randomUUID();
    const chainId = crypto.randomUUID();

    return this.prisma.$transaction(async (tx: any) => {
      const approvals: any[] = [];

      for (let i = 0; i < approverIds.length; i++) {
        const approval = await tx.approval.create({
          data: {
            id: crypto.randomUUID(),
            documentId,
            approverId: approverIds[i],
            level: 1,
            status: i === 0 ? 'pending' : 'waiting',
            groupId,
            approvalChainId: chainId,
            sequence: i + 1,
          },
        });
        approvals.push(approval);
      }

      await this.sendDocumentApprovalRequestNotification(approverIds[0], documentId);
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
      data: { status: CANONICAL_DOCUMENT_STATUS.EFFECTIVE, approvedAt: new Date() },
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
    return this.prisma.$transaction(async (tx: any) => {
      if (action === 'rejected') {
        const updatedApproval = await this.updateApprovalStatus(tx, approval.id, 'rejected', undefined, commentOrReason);
        await tx.approval.updateMany({
          where: { groupId: approval.groupId, id: { not: approval.id }, status: { in: ['pending', 'waiting'] } },
          data: { status: 'cancelled' },
        });
        if (approval.documentId) {
          await tx.document.update({ where: { id: approval.documentId }, data: { status: 'draft' } });
        }
        return updatedApproval;
      }

      const updatedApproval = await this.updateApprovalStatus(tx, approval.id, 'approved', commentOrReason, undefined);
      const nextApproval = await tx.approval.findFirst({
        where: { groupId: approval.groupId, sequence: approval.sequence + 1, status: 'waiting' },
      });

      if (nextApproval) {
        await tx.approval.update({ where: { id: nextApproval.id }, data: { status: 'pending' } });
        if (approval.documentId) await this.sendDocumentApprovalRequestNotification(nextApproval.approverId, approval.documentId);
      } else if (approval.documentId) {
        await this.finalizeDocumentApproval(tx, approval.documentId);
      }

      return updatedApproval;
    });
  }

  private async sendDocumentApprovalRequestNotification(userId: string, documentId: string) {
    await this.notificationService.create({
      userId, type: 'approval_request', title: '您有新的文档待审批', content: `文档 ${documentId} 等待您的审批`,
    });
  }
}
