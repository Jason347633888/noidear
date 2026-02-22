import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { SubmitRectificationDto } from './dto';

@Injectable()
export class RectificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
  ) {}

  async getMyRectifications(userId: string) {
    return this.prisma.auditFinding.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['pending', 'rectifying'] },
      },
      include: {
        plan: { select: { id: true, title: true } },
        document: { select: { id: true, title: true, number: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async submitRectification(
    findingId: string,
    dto: SubmitRectificationDto,
    userId: string,
  ) {
    // 1. Validate finding exists
    const finding = await this.prisma.auditFinding.findUnique({
      where: { id: findingId },
    });

    if (!finding) {
      throw new NotFoundException('Audit finding not found');
    }

    // 2. Validate user is the assignee (BR-127)
    if (finding.assigneeId !== userId) {
      throw new ForbiddenException('Only the assignee can submit rectification');
    }

    // 3. Validate finding status
    if (!['pending', 'rectifying'].includes(finding.status)) {
      throw new BadRequestException(
        'Finding must be in pending or rectifying status to submit',
      );
    }

    // 4. Validate rectification document exists
    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });

    if (!document) {
      throw new NotFoundException('Rectification document not found');
    }

    // 5. Validate document version matches (BR-127)
    const documentVersion = Number(document.version);
    const expectedVersion = Number(dto.version);
    if (documentVersion !== expectedVersion) {
      throw new BadRequestException('Document version mismatch');
    }

    // 6. Update finding status and record rectification evidence
    const updatedFinding = await this.prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        rectificationDocumentId: dto.documentId,
        rectificationVersion: dto.version,
        status: 'pending_verification',
      },
    });

    // 7. Update TodoTask status (audit_rectification → pending for verifier)
    await this.prisma.todoTask.updateMany({
      where: {
        type: 'audit_rectification',
        relatedId: findingId,
      },
      data: {
        status: 'pending',
      },
    });

    // 8. Log operation
    await this.operationLogService.log({
      userId,
      action: 'submit_rectification',
      module: 'internal-audit',
      objectId: findingId,
      objectType: 'audit_finding',
      details: {
        documentId: dto.documentId,
        version: dto.version,
        comment: dto.comment,
      },
    });

    return updatedFinding;
  }
}
