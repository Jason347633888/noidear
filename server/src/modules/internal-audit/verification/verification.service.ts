import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { VerifyRectificationDto, RejectRectificationDto } from './dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
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
    const updatedFinding = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        status: 'verified',
        verifiedBy: userId,
        verifiedAt: new Date(),
      },
    });

    // 6. Update TodoTask status (audit_rectification → completed)
    await this.prisma.todoTask.updateMany({
      where: {
        type: 'audit_rectification',
        relatedId: findingId,
      },
      data: {
        status: 'completed',
      },
    });

    // 7. Log operation
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
