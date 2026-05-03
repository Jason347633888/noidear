import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { ApprovalEngineService } from '../../unified-approval/approval-engine.service';
import { CorrectiveActionService } from '../../corrective-action/corrective-action.service';
import { VerifyRectificationDto, RejectRectificationDto } from './dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
    private readonly correctiveActionService: CorrectiveActionService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async getPendingVerifications(userId: string) {
    return this.prisma.auditFinding.findMany({
      where: {
        status: 'pending_verification',
      },
      include: {
        plan: { select: { id: true, title: true, auditorId: true } },
        document: { select: { id: true, title: true, number: true } },
        assignee: { select: { id: true, username: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async verifyRectification(
    findingId: string,
    dto: VerifyRectificationDto,
    userId: string,
    companyId: string,
  ) {
    // 1. Validate finding exists
    const finding = await this.prisma.auditFinding.findUnique({
      where: { id: findingId },
      include: {
        plan: { select: { auditorId: true } },
        document: { select: { id: true, title: true, number: true } },
      },
    });

    if (!finding) {
      throw new NotFoundException('Audit finding not found');
    }

    // 2. Validate user is the auditor (BR-128)
    if (finding.plan.auditorId !== userId) {
      throw new ForbiddenException(
        'Only the assigned auditor can verify rectification',
      );
    }

    // 3. Validate finding status
    if (finding.status !== 'pending_verification') {
      throw new BadRequestException(
        'Finding must be in pending_verification status to verify',
      );
    }

    // 4. Validate rectification evidence exists
    if (!finding.rectificationDocumentId) {
      throw new BadRequestException('No rectification evidence found');
    }

    // 5. Update finding status and record verification
    try {
      const approval = await this.approvalEngine?.startApproval({
        resourceType: 'audit_finding',
        resourceId: findingId,
        resourceStep: 'verify',
        triggerKey: 'verify',
        title: `审计发现核查审批：${findingId}`,
        createdById: userId,
      });
      if (approval) {
        await this.prisma.auditFinding.update({ where: { id: findingId }, data: { approvalInstanceId: approval.id } });
      }
    } catch { /* no definition = skip */ }

    const now = new Date();
    const updatedFinding = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Atomically claim the finding by conditionally updating its status.
      // Only one concurrent caller can win this update; the loser gets count=0.
      const { count } = await tx.auditFinding.updateMany({
        where: {
          id: findingId,
          status: 'pending_verification',
        },
        data: {
          status: 'verified',
          verifiedBy: userId,
          verifiedAt: now,
        },
      });

      if (count === 0) {
        throw new BadRequestException(
          'Finding has already been verified or is no longer pending verification',
        );
      }

      await this.createCapaForVerifiedFinding(finding, userId, companyId, tx);

      await tx.todoTask.updateMany({
        where: {
          type: 'audit_rectification',
          relatedId: findingId,
        },
        data: {
          status: 'completed',
        },
      });

      return { ...finding, status: 'verified' as const, verifiedBy: userId, verifiedAt: now };
    });

    // 6. Log operation
    await this.operationLogService.log({
      userId,
      action: 'verify_rectification',
      module: 'internal-audit',
      objectId: findingId,
      objectType: 'audit_finding',
      details: {
        comment: dto.comment,
      },
    });

    return updatedFinding;
  }

  private async createCapaForVerifiedFinding(
    finding: any,
    userId: string,
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (finding.auditResult !== '不符合') {
      return;
    }

    if (!companyId) {
      throw new BadRequestException('Missing companyId for audit CAPA creation');
    }

    const existing = await tx.correctiveAction.findFirst({
      where: {
        company_id: companyId,
        trigger_type: 'internal_audit',
        trigger_id: finding.id,
      },
      select: { id: true },
    });

    if (existing) {
      return;
    }

    const documentLabel = [finding.document?.number, finding.document?.title]
      .filter(Boolean)
      .join(' ');
    const descriptionParts = [
      '内审不符合项CAPA',
      finding.issueType ? `问题类型：${finding.issueType}` : undefined,
      documentLabel ? `文件：${documentLabel}` : undefined,
      finding.description ? `描述：${finding.description}` : undefined,
    ].filter(Boolean);

    await this.correctiveActionService.create(
      {
        trigger_type: 'internal_audit',
        trigger_id: finding.id,
        description: descriptionParts.join('；'),
        responsible_id: finding.assigneeId ?? undefined,
        due_date: finding.dueDate
          ? finding.dueDate.toISOString().slice(0, 10)
          : undefined,
      },
      userId,
      companyId,
      tx,
    );
  }

  async rejectRectification(
    findingId: string,
    dto: RejectRectificationDto,
    userId: string,
  ) {
    // 1. Validate finding exists
    const finding = await this.prisma.auditFinding.findUnique({
      where: { id: findingId },
      include: {
        plan: { select: { auditorId: true } },
      },
    });

    if (!finding) {
      throw new NotFoundException('Audit finding not found');
    }

    // 2. Validate user is the auditor (BR-128)
    if (finding.plan.auditorId !== userId) {
      throw new ForbiddenException(
        'Only the assigned auditor can reject rectification',
      );
    }

    // 3. Validate finding status
    if (finding.status !== 'pending_verification') {
      throw new BadRequestException(
        'Finding must be in pending_verification status to reject',
      );
    }

    // 4. Update finding status and record rejection reason
    const updatedFinding = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        status: 'rectifying',
        rejectionReason: dto.rejectionReason,
      },
    });

    // 5. Update TodoTask status (audit_rectification → pending for reassignment)
    await this.prisma.todoTask.updateMany({
      where: {
        type: 'audit_rectification',
        relatedId: findingId,
      },
      data: {
        status: 'pending',
      },
    });

    // 6. Log operation
    await this.operationLogService.log({
      userId,
      action: 'reject_rectification',
      module: 'internal-audit',
      objectId: findingId,
      objectType: 'audit_finding',
      details: {
        rejectionReason: dto.rejectionReason,
      },
    });

    return updatedFinding;
  }
}
