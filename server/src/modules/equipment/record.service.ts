import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRecordDto,
  UpdateRecordDto,
  ApproveRecordDto,
  RejectRecordDto,
  QueryRecordDto,
} from './dto/record.dto';
import { PlanService } from './plan.service';
import { StatsService } from './stats.service';

@Injectable()
export class RecordService {
  private readonly logger = new Logger(RecordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PlanService,
    private readonly statsService: StatsService,
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

  async findAll(query: QueryRecordDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(query);

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

  async submit(id: string) {
    const record = await this.findOne(id);
    this.assertDraftStatus(record.status, 'submitted');

    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: { status: 'submitted', submittedAt: new Date() },
    });
  }

  async approve(id: string, dto: ApproveRecordDto) {
    const record = await this.findOne(id);
    this.assertSubmittedStatus(record.status, 'approved');

    const updated = await this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        reviewerSignature: dto.reviewerSignature,
        reviewerId: dto.reviewerId,
      },
    });

    await this.planService.generateNextPlan(
      record.equipmentId,
      record.maintenanceLevel,
      record.maintenanceDate,
    );

    this.logger.log(`Maintenance record approved: ${record.recordNumber}`);

    // Clear maintenance and cost stats cache
    const year = record.maintenanceDate.getFullYear();
    await this.statsService.clearCache(['maintenance', `cost-${year}`]).catch(() => {});

    return updated;
  }

  async reject(id: string, dto: RejectRecordDto) {
    const record = await this.findOne(id);
    this.assertSubmittedStatus(record.status, 'rejected');

    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectReason: dto.rejectReason,
        reviewerId: dto.reviewerId,
      },
    });
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
