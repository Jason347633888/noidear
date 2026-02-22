import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationLogService } from '../../operation-log/operation-log.service';
import {
  CreateAuditPlanDto,
  UpdateAuditPlanDto,
  AuditPlanQueryDto,
} from './dto';

@Injectable()
export class AuditPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLogService: OperationLogService,
  ) {}

  async create(dto: CreateAuditPlanDto, userId: string) {
    // 1. Validate auditor exists and active
    const auditor = await this.prisma.user.findUnique({
      where: { id: dto.auditorId },
    });

    if (!auditor || auditor.status !== 'active') {
      throw new BadRequestException('Auditor must be active user');
    }

    // 2. Validate startDate < endDate
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // 3. Validate all documents exist and published
    const docs = await this.prisma.document.findMany({
      where: { id: { in: dto.documentIds } },
    });

    if (docs.length !== dto.documentIds.length) {
      throw new BadRequestException('Some documents not found');
    }

    const unpublished = docs.filter((d) => d.status !== 'published');
    if (unpublished.length > 0) {
      throw new BadRequestException(
        'Only published documents can be selected',
      );
    }

    // 4. Create plan
    const plan = await this.prisma.auditPlan.create({
      data: {
        title: dto.title,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        auditorId: dto.auditorId,
        documentIds: dto.documentIds,
        createdBy: userId,
        status: 'draft',
      },
      include: {
        auditor: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // 5. Log operation
    await this.operationLogService.log({
      userId,
      action: 'create_audit_plan',
      module: 'internal-audit',
      objectId: plan.id,
      objectType: 'audit_plan',
      details: { title: plan.title, type: plan.type },
    });

    return plan;
  }

  async findAll(query: AuditPlanQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.auditorId) {
      where.auditorId = filters.auditorId;
    }

    if (filters.startDate) {
      where.startDate = { gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.endDate = { lte: new Date(filters.endDate) };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditPlan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          auditor: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { findings: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditPlan.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id },
      include: {
        auditor: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        findings: { select: { id: true } },
      },
    });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    const auditedCount = plan.findings.length;
    const totalCount = plan.documentIds.length;
    const progress =
      totalCount > 0 ? Math.round((auditedCount / totalCount) * 1000) / 10 : 0;

    return {
      ...plan,
      auditedCount,
      totalCount,
      progress,
    };
  }

  async update(id: string, dto: UpdateAuditPlanDto, userId?: string) {
    const plan = await this.prisma.auditPlan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft plans can be updated');
    }

    // Validate if updating dates
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // Validate auditor if updating
    if (dto.auditorId) {
      const auditor = await this.prisma.user.findUnique({
        where: { id: dto.auditorId },
      });

      if (!auditor || auditor.status !== 'active') {
        throw new BadRequestException('Auditor must be active user');
      }
    }

    // Validate documents if updating
    if (dto.documentIds && dto.documentIds.length > 0) {
      const docs = await this.prisma.document.findMany({
        where: { id: { in: dto.documentIds } },
      });

      if (docs.length !== dto.documentIds.length) {
        throw new BadRequestException('Some documents not found');
      }

      const unpublished = docs.filter((d) => d.status !== 'published');
      if (unpublished.length > 0) {
        throw new BadRequestException(
          'Only published documents can be selected',
        );
      }
    }

    const updatedPlan = await this.prisma.auditPlan.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.type && { type: dto.type }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.auditorId && { auditorId: dto.auditorId }),
        ...(dto.documentIds && { documentIds: dto.documentIds }),
      },
      include: {
        auditor: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Log operation
    if (userId) {
      await this.operationLogService.log({
        userId,
        action: 'update_audit_plan',
        module: 'internal-audit',
        objectId: id,
        objectType: 'audit_plan',
        details: dto as any,
      });
    }

    return updatedPlan;
  }

  async remove(id: string, userId?: string) {
    const plan = await this.prisma.auditPlan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft plans can be deleted');
    }

    // Log operation before deletion
    if (userId) {
      await this.operationLogService.log({
        userId,
        action: 'delete_audit_plan',
        module: 'internal-audit',
        objectId: id,
        objectType: 'audit_plan',
      });
    }

    return this.prisma.auditPlan.delete({ where: { id } });
  }

  async execute(id: string, userId?: string) {
    const plan = await this.prisma.auditPlan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException('Audit plan not found');
    }

    if (plan.status !== 'draft') {
      throw new BadRequestException('Only draft plans can be executed');
    }

    const updatedPlan = await this.prisma.auditPlan.update({
      where: { id },
      data: {
        status: 'ongoing',
        startedAt: new Date(),
      },
      include: {
        auditor: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Log operation
    if (userId) {
      await this.operationLogService.log({
        userId,
        action: 'start_audit',
        module: 'internal-audit',
        objectId: id,
        objectType: 'audit_plan',
      });
    }

    return updatedPlan;
  }

  async getStatistics() {
    const [
      totalPlans,
      draftCount,
      ongoingCount,
      pendingRectificationCount,
      completedCount,
      quarterlyCount,
      semiannualCount,
      annualCount,
      recentPlans,
    ] = await Promise.all([
      this.prisma.auditPlan.count(),
      this.prisma.auditPlan.count({ where: { status: 'draft' } }),
      this.prisma.auditPlan.count({ where: { status: 'ongoing' } }),
      this.prisma.auditPlan.count({
        where: { status: 'pending_rectification' },
      }),
      this.prisma.auditPlan.count({ where: { status: 'completed' } }),
      this.prisma.auditPlan.count({ where: { type: 'quarterly' } }),
      this.prisma.auditPlan.count({ where: { type: 'semiannual' } }),
      this.prisma.auditPlan.count({ where: { type: 'annual' } }),
      this.prisma.auditPlan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          auditor: { select: { id: true, name: true } },
          _count: { select: { findings: true } },
        },
      }),
    ]);

    return {
      totalPlans,
      byStatus: {
        draft: draftCount,
        ongoing: ongoingCount,
        pending_rectification: pendingRectificationCount,
        completed: completedCount,
      },
      byType: {
        quarterly: quarterlyCount,
        semiannual: semiannualCount,
        annual: annualCount,
      },
      recentPlans,
    };
  }

  /**
   * Copy historical audit plan (BR-118)
   */
  async copyPlan(originalPlanId: string, userId: string) {
    const originalPlan = await this.prisma.auditPlan.findUnique({
      where: { id: originalPlanId },
    });

    if (!originalPlan) {
      throw new NotFoundException('Original audit plan not found');
    }

    const newPlan = await this.prisma.auditPlan.create({
      data: {
        title: `${originalPlan.title}（副本）`,
        type: originalPlan.type,
        documentIds: originalPlan.documentIds,
        status: 'draft',
        auditorId: userId,
        createdBy: userId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await this.operationLogService.log({
      userId,
      action: 'copy_audit_plan',
      module: 'internal-audit',
      objectId: newPlan.id,
      objectType: 'audit_plan',
      details: {
        originalPlanId,
        copiedFields: ['documentIds', 'type'],
      },
    });

    return newPlan;
  }
}
