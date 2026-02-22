import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import { CreateAuditFindingDto, UpdateAuditFindingDto } from './dto';

@Injectable()
export class AuditExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
  ) {}

  async create(dto: CreateAuditFindingDto, userId: string) {
    // 1. Validate plan exists and status = ongoing
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.status !== 'ongoing') {
      throw new BadRequestException(
        'Can only create findings when plan status is ongoing',
      );
    }

    // 2. Validate user is the auditor
    if (plan.auditorId !== userId) {
      throw new ForbiddenException('Only the assigned auditor can create findings');
    }

    // 3. Validate documentId is in plan.documentIds
    if (!plan.documentIds.includes(dto.documentId)) {
      throw new BadRequestException(
        'Document not included in this audit plan',
      );
    }

    // 4. Check for duplicate finding (planId + documentId unique)
    const existingFinding = await this.prisma.auditFinding.findFirst({
      where: {
        planId: dto.planId,
        documentId: dto.documentId,
      },
    });

    if (existingFinding) {
      throw new BadRequestException('Document already audited in this plan');
    }

    // 5. Validate required fields for "不符合" result (BR-121)
    if (dto.auditResult === '不符合') {
      if (
        !dto.issueType ||
        !dto.description ||
        !dto.department ||
        !dto.assigneeId
      ) {
        throw new BadRequestException(
          'issueType, description, department, assigneeId required for non-conforming results',
        );
      }
    }

    // 6. Calculate dueDate for "不符合" (audit date + 30 days, BR-121)
    let dueDate: Date | null = null;
    if (dto.auditResult === '不符合') {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
    }

    // 7. Create finding
    const finding = await this.prisma.auditFinding.create({
      data: {
        planId: dto.planId,
        documentId: dto.documentId,
        auditResult: dto.auditResult,
        issueType: dto.auditResult === '不符合' ? dto.issueType : null,
        description: dto.auditResult === '不符合' ? dto.description : null,
        department: dto.auditResult === '不符合' ? dto.department : null,
        assigneeId: dto.auditResult === '不符合' ? dto.assigneeId : null,
        dueDate,
      },
    });

    // 8. Create TodoTask for "不符合" findings (BR-121)
    if (dto.auditResult === '不符合' && dto.assigneeId) {
      const title = `整改任务: ${(dto.description ?? '').substring(0, 50)}`;
      await this.prisma.todoTask.create({
        data: {
          userId: dto.assigneeId,
          type: 'audit_rectification' as any,
          relatedId: finding.id,
          title,
          status: 'pending' as any,
          priority: 'normal' as any,
          dueDate: finding.dueDate,
        },
      });
    }

    // 9. Log operation
    await this.operationLogService.log({
      userId,
      action: 'create_audit_finding',
      module: 'internal-audit',
      objectId: finding.id,
      objectType: 'audit_finding',
      details: {
        planId: dto.planId,
        documentId: dto.documentId,
        auditResult: dto.auditResult,
      },
    });

    return finding;
  }

  async update(id: string, dto: UpdateAuditFindingDto, userId: string) {
    // 1. Validate finding exists
    const finding = await this.prisma.auditFinding.findUnique({
      where: { id },
    });

    if (!finding) {
      throw new NotFoundException('Audit finding not found');
    }

    // 2. Validate plan exists and status = ongoing (BR-125)
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id: finding.planId },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.status !== 'ongoing') {
      throw new BadRequestException(
        'Cannot modify findings when plan is not ongoing',
      );
    }

    // 3. Validate user is the auditor
    if (plan.auditorId !== userId) {
      throw new ForbiddenException('Only the assigned auditor can update findings');
    }

    // 4. Validate required fields if changing to "不符合"
    if (dto.auditResult === '不符合') {
      const issueType = dto.issueType ?? finding.issueType;
      const description = dto.description ?? finding.description;
      const department = dto.department ?? finding.department;
      const assigneeId = dto.assigneeId ?? finding.assigneeId;

      if (!issueType || !description || !department || !assigneeId) {
        throw new BadRequestException(
          'issueType, description, department, assigneeId required for non-conforming results',
        );
      }
    }

    // 5. Calculate dueDate if changing to "不符合"
    let dueDate: Date | null | undefined = undefined;
    if (dto.auditResult === '不符合') {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
    } else if (dto.auditResult === '符合') {
      dueDate = null;
    }

    // 6. Update finding
    const updatedFinding = await this.prisma.auditFinding.update({
      where: { id },
      data: {
        ...(dto.auditResult && { auditResult: dto.auditResult }),
        ...(dto.issueType && { issueType: dto.issueType }),
        ...(dto.description && { description: dto.description }),
        ...(dto.department && { department: dto.department }),
        ...(dto.assigneeId && { assigneeId: dto.assigneeId }),
        ...(dueDate !== undefined && { dueDate }),
      },
    });

    // 7. Log operation
    await this.operationLogService.log({
      userId,
      action: 'update_audit_finding',
      module: 'internal-audit',
      objectId: id,
      objectType: 'audit_finding',
      details: {
        auditResult: dto.auditResult,
        issueType: dto.issueType,
        description: dto.description,
        department: dto.department,
        assigneeId: dto.assigneeId,
      },
    });

    return updatedFinding;
  }

  async getProgress(planId: string) {
    // 1. Validate plan exists
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    // 2. Get all findings for this plan
    const findings = await this.prisma.auditFinding.findMany({
      where: { planId },
    });

    // 3. Calculate statistics (BR-123)
    const totalDocuments = plan.documentIds.length;
    const auditedDocuments = findings.length;
    const progress =
      totalDocuments > 0
        ? Math.round((auditedDocuments / totalDocuments) * 1000) / 10
        : 0;

    // 4. Count conforming vs non-conforming (from already-fetched findings array)
    const conformingCount = findings.filter((f) => f.auditResult === '符合').length;
    const nonConformingCount = findings.filter((f) => f.auditResult === '不符合').length;
    const pendingCount = totalDocuments - auditedDocuments;

    return {
      planId,
      totalDocuments,
      auditedDocuments,
      progress,
      conformingCount,
      nonConformingCount,
      pendingCount,
      findings,
    };
  }

  async complete(planId: string, userId: string) {
    // 1. Validate plan exists
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    // 2. Validate user is the auditor
    if (plan.auditorId !== userId) {
      throw new ForbiddenException('Only the assigned auditor can complete the plan');
    }

    // 3. Validate plan status = pending_rectification (BR-130)
    if (plan.status !== 'pending_rectification') {
      throw new BadRequestException(
        'Plan must be in pending_rectification status to complete',
      );
    }

    // 4. Get all findings
    const findings = await this.prisma.auditFinding.findMany({
      where: { planId },
    });

    // 5. Validate all non-conforming items are verified (BR-130)
    const nonConformingFindings = findings.filter(
      (f) => f.auditResult === '不符合',
    );
    const unverified = nonConformingFindings.filter(
      (f) => f.status !== 'verified',
    );

    if (unverified.length > 0) {
      throw new BadRequestException(
        `Cannot complete plan: ${unverified.length} non-conforming items pending verification`,
      );
    }

    // 6. Update plan status to completed
    const updatedPlan = await this.prisma.auditPlan.update({
      where: { id: planId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // 7. Log operation
    await this.operationLogService.log({
      userId,
      action: 'complete_audit_plan',
      module: 'internal-audit',
      objectId: planId,
      objectType: 'audit_plan',
      details: {
        completedAt: updatedPlan.completedAt?.toISOString(),
      },
    });

    return updatedPlan;
  }
}
