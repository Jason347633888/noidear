import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto, QueryPlanDto, CalendarQueryDto } from './dto/plan.dto';

interface MaintenanceLevelConfig {
  enabled: boolean;
  cycle: number;
  reminderDays: number;
}

interface MaintenanceConfig {
  daily?: MaintenanceLevelConfig;
  weekly?: MaintenanceLevelConfig;
  monthly?: MaintenanceLevelConfig;
  quarterly?: MaintenanceLevelConfig;
  annual?: MaintenanceLevelConfig;
}

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePlansForEquipment(equipmentId: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment || equipment.deletedAt) {
      throw new NotFoundException('Equipment not found');
    }

    const config = equipment.maintenanceConfig as MaintenanceConfig | null;
    if (!config) return [];

    const baseDate = equipment.activationDate ?? new Date();
    const levels = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as const;
    const plans: any[] = [];

    for (const level of levels) {
      const levelConfig = config[level];
      if (!levelConfig?.enabled) continue;

      const plannedDate = new Date(baseDate);
      plannedDate.setDate(plannedDate.getDate() + levelConfig.cycle);

      const planNumber = await this.generatePlanNumber();
      const plan = await this.prisma.maintenancePlan.create({
        data: {
          planNumber,
          equipmentId,
          maintenanceLevel: level,
          plannedDate,
          responsiblePerson: equipment.responsiblePerson,
          reminderDays: levelConfig.reminderDays,
        },
      });
      plans.push(plan);
    }

    this.logger.log(
      `Generated ${plans.length} maintenance plans for equipment: ${equipment.code}`,
    );
    return plans;
  }

  async generateNextPlan(
    equipmentId: string,
    level: string,
    completedDate: Date,
  ) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment || equipment.deletedAt) return null;
    if (equipment.status !== 'active') return null;

    const config = equipment.maintenanceConfig as MaintenanceConfig | null;
    const levelConfig = config?.[level as keyof MaintenanceConfig];
    if (!levelConfig?.enabled) return null;

    const plannedDate = new Date(completedDate);
    plannedDate.setDate(plannedDate.getDate() + levelConfig.cycle);

    const planNumber = await this.generatePlanNumber();
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        planNumber,
        equipmentId,
        maintenanceLevel: level as any,
        plannedDate,
        responsiblePerson: equipment.responsiblePerson,
        reminderDays: levelConfig.reminderDays,
      },
    });

    this.logger.log(
      `Generated next ${level} plan ${planNumber} for equipment: ${equipment.code}`,
    );
    return plan;
  }

  async findAll(query: QueryPlanDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 10));
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(query);

    const [data, total] = await Promise.all([
      this.prisma.maintenancePlan.findMany({
        where,
        skip,
        take: limit,
        include: { equipment: { select: { id: true, code: true, name: true } } },
        orderBy: { plannedDate: 'asc' },
      }),
      this.prisma.maintenancePlan.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        equipment: true,
        maintenanceRecords: { where: { deletedAt: null } },
      },
    });

    if (!plan || plan.deletedAt) {
      throw new NotFoundException('Maintenance plan not found');
    }
    return plan;
  }

  async getCalendarData(query: CalendarQueryDto) {
    const { year, month, equipmentId } = query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const where: any = {
      plannedDate: { gte: startDate, lte: endDate },
      deletedAt: null,
    };
    if (equipmentId) where.equipmentId = equipmentId;

    const plans = await this.prisma.maintenancePlan.findMany({
      where,
      include: { equipment: { select: { id: true, code: true, name: true } } },
      orderBy: { plannedDate: 'asc' },
    });

    const calendar: Record<string, any[]> = {};
    for (const plan of plans) {
      const dateKey = plan.plannedDate.toISOString().slice(0, 10);
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(plan);
    }

    return calendar;
  }

  async startPlan(id: string) {
    const plan = await this.findOne(id);

    if (plan.status !== 'pending') {
      throw new BadRequestException('Only pending plans can be started');
    }

    return this.prisma.maintenancePlan.update({
      where: { id },
      data: { status: 'in_progress' },
    });
  }

  async completePlan(id: string) {
    const plan = await this.findOne(id);

    if (plan.status !== 'in_progress') {
      throw new BadRequestException('Only in-progress plans can be completed');
    }

    const updated = await this.prisma.maintenancePlan.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
    });

    await this.generateNextPlan(
      plan.equipmentId,
      plan.maintenanceLevel,
      new Date(),
    );

    return updated;
  }

  async cancelPlan(id: string) {
    const plan = await this.findOne(id);

    if (plan.status === 'completed' || plan.status === 'cancelled') {
      throw new BadRequestException('Cannot cancel a completed or already cancelled plan');
    }

    return this.prisma.maintenancePlan.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  async getDuePlans(daysAhead: number = 0) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    return this.prisma.maintenancePlan.findMany({
      where: {
        plannedDate: { lte: targetDate },
        status: 'pending',
        deletedAt: null,
      },
      include: { equipment: true },
    });
  }

  async getOverduePlans() {
    return this.prisma.maintenancePlan.findMany({
      where: {
        plannedDate: { lt: new Date() },
        status: { in: ['pending', 'in_progress'] },
        deletedAt: null,
      },
      include: { equipment: true },
    });
  }

  // --- Private helpers ---

  private async generatePlanNumber(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `MP-${dateStr}-`;

    const last = await this.prisma.maintenancePlan.findFirst({
      where: { planNumber: { startsWith: prefix } },
      orderBy: { planNumber: 'desc' },
    });

    const lastSeq = last
      ? parseInt(last.planNumber.split('-').pop() ?? '0', 10) || 0
      : 0;

    return `${prefix}${String(lastSeq + 1).padStart(3, '0')}`;
  }

  private buildWhereClause(query: QueryPlanDto) {
    const where: any = { deletedAt: null };

    if (query.equipmentId) where.equipmentId = query.equipmentId;
    if (query.maintenanceLevel) where.maintenanceLevel = query.maintenanceLevel;
    if (query.status) where.status = query.status;
    if (query.responsiblePerson) where.responsiblePerson = query.responsiblePerson;

    if (query.startDate || query.endDate) {
      where.plannedDate = {};
      if (query.startDate) where.plannedDate.gte = new Date(query.startDate);
      if (query.endDate) where.plannedDate.lte = new Date(query.endDate);
    }

    return where;
  }
}
