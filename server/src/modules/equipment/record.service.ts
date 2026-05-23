import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';
import {
  CreateRecordDto,
  UpdateRecordDto,
  QueryRecordDto,
} from './dto/record.dto';
import { PlanService } from './plan.service';
import { StatsService } from './stats.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly statsService: StatsService,
    @Optional() private readonly approvalEngine?: ApprovalEngineService,
  ) {}

  async create(dto: CreateRecordDto) {
    const recordNumber = await this.generateRecordNumber();
    const optional: Record<string, any> = {};
    this.applyOptionalFields(optional, dto);

    const record = await this.prisma.maintenanceRecord.create({
      data: {
        recordNumber,
        equipmentId: dto.equipmentId,
        maintenanceLevel: dto.maintenanceLevel as any,
        maintenanceDate: new Date(dto.maintenanceDate),
        status: 'draft',
        ...optional,
      },
    });
    this.logger.log(`Maintenance record created: ${recordNumber}`);

    // Clear maintenance stats cache
    await this.statsService.clearCache(['maintenance']).catch(() => {});

    return record;
  }

  async findAll(query: QueryRecordDto, ownership?: OwnershipContext) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(query);

    // Ownership scoping — MaintenanceRecord uses performerId / reviewerId
    if (ownership && ownership.roleCode !== 'admin') {
      if (ownership.roleCode === 'user') {
        (where as any)['OR'] = [
          { performerId: ownership.userId },
          { reviewerId: ownership.userId },
        ];
      } else if (ownership.roleCode === 'leader') {
        const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
        if (memberIds.length === 0) return { data: [], total: 0, page, limit };
        (where as any)['OR'] = [
          { performerId: { in: memberIds } },
          { reviewerId: { in: memberIds } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          equipment: { select: { id: true, code: true, name: true } },
        },
        orderBy: { maintenanceDate: 'desc' },
      }),
      this.prisma.maintenanceRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const record = await this.prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { equipment: true, plan: true },
    });

    if (!record || record.deletedAt) {
      throw new NotFoundException('Maintenance record not found');
    }
    return record;
  }

  async update(id: string, dto: UpdateRecordDto) {
    const record = await this.findOne(id);
    this.assertDraftStatus(record.status, 'updated');

    const data: Record<string, any> = {};
    const fields = [
      'content', 'beforeStatus', 'afterStatus', 'photos',
      'performerSignature', 'performerId', 'cost',
    ] as const;

    for (const field of fields) {
      if ((dto as any)[field] !== undefined) data[field] = (dto as any)[field];
    }

    return this.prisma.maintenanceRecord.update({ where: { id }, data });
  }

  async submit(id: string, userId?: string) {
    const record = await this.findOne(id);
    this.assertDraftStatus(record.status, 'submitted');

    const updated = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    if (userId) {
      try {
        const approval = await this.approvalEngine?.startApproval({
          resourceType: 'maintenance_record',
          resourceId: id,
          resourceStep: 'submit',
          triggerKey: 'submit',
          title: `设备维护记录审批：${record.recordNumber}`,
          createdById: userId,
        });
        if (approval) {
          await this.prisma.maintenanceRecord.update({ where: { id }, data: { approvalInstanceId: approval.id } });
        }
      } catch { /* no definition = skip */ }
    }

    return updated;
  }

  // --- Private helpers ---

  private assertDraftStatus(status: string, action: string) {
    if (status !== 'draft') {
      throw new BadRequestException(`Only draft records can be ${action}`);
    }
  }

  private assertSubmittedStatus(status: string, action: string) {
    if (status !== 'submitted') {
      throw new BadRequestException(`Only submitted records can be ${action}`);
    }
  }

  private applyOptionalFields(data: Record<string, any>, dto: CreateRecordDto) {
    const optionalFields = [
      'planId', 'content', 'beforeStatus', 'afterStatus',
      'photos', 'performerSignature', 'performerId',
    ] as const;

    for (const field of optionalFields) {
      if (dto[field] !== undefined) data[field] = dto[field];
    }
    if (dto.cost !== undefined) data.cost = dto.cost;
  }

  private async generateRecordNumber(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `MAINT-${dateStr}-`;

    const last = await this.prisma.maintenanceRecord.findFirst({
      where: { recordNumber: { startsWith: prefix } },
      orderBy: { recordNumber: 'desc' },
    });

    const lastSeq = last
      ? parseInt(last.recordNumber.split('-').pop() ?? '0', 10) || 0
      : 0;

    return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
  }

  private buildWhereClause(query: QueryRecordDto) {
    const where: any = { deletedAt: null };

    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.maintenanceLevel) where.maintenanceLevel = query.maintenanceLevel;
    if (query.status) where.status = query.status;
    if (query.performerId) where.performerId = query.performerId;

    if (query.startDate || query.endDate) {
      where.maintenanceDate = {};
      if (query.startDate) where.maintenanceDate.gte = new Date(query.startDate);
      if (query.endDate) where.maintenanceDate.lte = new Date(query.endDate);
    }

    return where;
  }
}
