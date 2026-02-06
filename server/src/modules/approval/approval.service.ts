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
      throw new BusinessException(ErrorCode.FORBIDDEN, '无权审批此记录');
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
}
