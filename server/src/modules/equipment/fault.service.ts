import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFaultDto,
  AcceptFaultDto,
  CompleteFaultDto,
  QueryFaultDto,
} from './dto/fault.dto';
import { StatsService } from './stats.service';

@Injectable()
export class FaultService {
  private readonly logger = new Logger(FaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  async create(dto: CreateFaultDto) {
    const faultNumber = await this.generateFaultNumber();

    const fault = await this.prisma.equipmentFault.create({
      data: {
        faultNumber,
        equipmentId: dto.equipmentId,
        reporterId: dto.reporterId,
        urgencyLevel: (dto.urgencyLevel as any) ?? 'normal',
        faultDescription: dto.faultDescription,
        faultPhotos: dto.faultPhotos ?? [],
      },
    });

    this.logger.log(`Equipment fault reported: ${faultNumber}`);

    // Clear fault-rate stats cache
    await this.statsService.clearCache(['fault-rate']).catch(() => {});

    return fault;
  }

  async findAll(query: QueryFaultDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(query);

    const [data, total] = await Promise.all([
      this.prisma.equipmentFault.findMany({
        where,
        skip,
        take: limit,
        include: {
          equipment: { select: { id: true, code: true, name: true, location: true } },
        },
        orderBy: [{ urgencyLevel: 'asc' }, { reportTime: 'desc' }],
      }),
      this.prisma.equipmentFault.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findMyFaults(reporterId: string, query: QueryFaultDto) {
    return this.findAll({ ...query, reporterId });
  }

  async findOne(id: string) {
    const fault = await this.prisma.equipmentFault.findUnique({
      where: { id },
      include: { equipment: true },
    });

    if (!fault || fault.deletedAt) {
      throw new NotFoundException('Equipment fault not found');
    }
    return fault;
  }

  async accept(id: string, dto: AcceptFaultDto) {
    const fault = await this.findOne(id);

    if (fault.status !== 'pending') {
      throw new BadRequestException('Only pending faults can be accepted');
    }

    return this.prisma.equipmentFault.update({
      where: { id },
      data: {
        status: 'in_progress',
        assigneeId: dto.assigneeId,
        acceptedAt: new Date(),
      },
    });
  }

  async complete(id: string, dto: CompleteFaultDto) {
    const fault = await this.findOne(id);

    if (fault.status !== 'in_progress') {
      throw new BadRequestException('Only in-progress faults can be completed');
    }

    const data: Record<string, any> = {
      status: 'completed',
      completedAt: new Date(),
    };

    if (dto.repairDescription) data.repairDescription = dto.repairDescription;
    if (dto.repairPhotos) data.repairPhotos = dto.repairPhotos;
    if (dto.repairSignature) data.repairSignature = dto.repairSignature;
    if (dto.faultCause) data.faultCause = dto.faultCause;
    if (dto.solution) data.solution = dto.solution;

    const updated = await this.prisma.equipmentFault.update({
      where: { id },
      data,
    });

    this.logger.log(`Equipment fault completed: ${fault.faultNumber}`);

    // Clear fault-rate and repair stats cache
    const year = fault.reportTime.getFullYear();
    await this.statsService.clearCache(['fault-rate', `repair-${year}`]).catch(() => {});

    return updated;
  }

  async cancel(id: string) {
    const fault = await this.findOne(id);

    if (fault.status === 'completed' || fault.status === 'cancelled') {
      throw new BadRequestException('Cannot cancel a completed or already cancelled fault');
    }

    return this.prisma.equipmentFault.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getStats() {
    const [total, pending, inProgress, completed] = await Promise.all([
      this.prisma.equipmentFault.count({ where: { deletedAt: null } }),
      this.prisma.equipmentFault.count({ where: { status: 'pending', deletedAt: null } }),
      this.prisma.equipmentFault.count({ where: { status: 'in_progress', deletedAt: null } }),
      this.prisma.equipmentFault.count({ where: { status: 'completed', deletedAt: null } }),
    ]);

    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

    const completedFaults = await this.prisma.equipmentFault.findMany({
      where: {
        status: 'completed',
        acceptedAt: { not: null },
        completedAt: { not: null },
        deletedAt: null,
      },
      select: { acceptedAt: true, completedAt: true },
    });

    const avgResponseTimeHours = this.calcAvgResponseTime(completedFaults);

    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate: `${completionRate}%`,
      avgResponseTimeHours,
    };
  }

  // --- Private helpers ---

  private calcAvgResponseTime(
    faults: { acceptedAt: Date | null; completedAt: Date | null }[],
  ): number {
    if (faults.length === 0) return 0;

    const totalMs = faults.reduce((sum, f) => {
      const diff = f.completedAt!.getTime() - f.acceptedAt!.getTime();
      return sum + diff;
    }, 0);

    return Math.round((totalMs / faults.length / 3600000) * 10) / 10;
  }

  private async generateFaultNumber(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `FR-${dateStr}-`;

    const last = await this.prisma.equipmentFault.findFirst({
      where: { faultNumber: { startsWith: prefix } },
      orderBy: { faultNumber: 'desc' },
    });

    const lastSeq = last
      ? parseInt(last.faultNumber.split('-').pop() ?? '0', 10) || 0
      : 0;

    return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
  }

  private buildWhereClause(query: QueryFaultDto) {
    const where: any = { deletedAt: null };

    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.status) where.status = query.status;
    if (query.urgencyLevel) where.urgencyLevel = query.urgencyLevel;
    if (query.reporterId) where.reporterId = query.reporterId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;

    return where;
  }
}
