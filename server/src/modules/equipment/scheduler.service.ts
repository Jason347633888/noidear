import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TodoService } from './todo.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly todoService: TodoService,
  ) {}

  /**
   * Daily check at 2:00 AM: upcoming maintenance plans with reminder days
   */
  @Cron('0 2 * * *')
  async checkDuePlans() {
    this.logger.log('Running scheduled task: checkDuePlans');

    try {
      const plans = await this.findUpcomingPlans();
      await this.createTodosForPlans(plans);
      this.logger.log(`Processed ${plans.length} upcoming maintenance plans`);
    } catch (error) {
      this.logger.error('Failed to check due plans', error?.stack);
    }
  }

  /**
   * Daily check at 2:15 AM: overdue maintenance plans
   */
  @Cron('0 15 2 * * *')
  async checkOverduePlans() {
    this.logger.log('Running scheduled task: checkOverduePlans');

    try {
      const plans = await this.findOverduePlans();
      await this.createOverdueNotifications(plans);
      this.logger.log(`Found ${plans.length} overdue maintenance plans`);
    } catch (error) {
      this.logger.error('Failed to check overdue plans', error?.stack);
    }
  }

  /**
   * Daily check at 2:30 AM: warranty expiry within 30 days
   */
  @Cron('0 30 2 * * *')
  async checkWarrantyExpiry() {
    this.logger.log('Running scheduled task: checkWarrantyExpiry');

    try {
      const equipment = await this.findExpiringWarranties();
      await this.createWarrantyNotifications(equipment);
      this.logger.log(`Found ${equipment.length} equipment with expiring warranty`);
    } catch (error) {
      this.logger.error('Failed to check warranty expiry', error?.stack);
    }
  }

  // --- Private helpers ---

  private async findUpcomingPlans() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.maintenancePlan.findMany({
      where: {
        status: 'pending',
        todoTaskId: null,
        deletedAt: null,
      },
      include: { equipment: true },
    });
  }

  private async createTodosForPlans(plans: any[]) {
    for (const plan of plans) {
      const daysUntilDue = this.daysBetween(new Date(), plan.plannedDate);
      if (daysUntilDue > plan.reminderDays) continue;
      if (!plan.responsiblePerson) continue;

      await this.todoService.createTodo({
        type: 'maintenance_plan',
        title: `Maintenance due: ${plan.equipment.name} (${plan.maintenanceLevel})`,
        description: `Plan ${plan.planNumber} is due on ${plan.plannedDate.toISOString().slice(0, 10)}`,
        assigneeId: plan.responsiblePerson,
        relatedId: plan.id,
      });

      await this.prisma.maintenancePlan.update({
        where: { id: plan.id },
        data: { todoTaskId: plan.id },
      });
    }
  }

  private async findOverduePlans() {
    return this.prisma.maintenancePlan.findMany({
      where: {
        plannedDate: { lt: new Date() },
        status: { in: ['pending', 'in_progress'] },
        deletedAt: null,
      },
      include: { equipment: true },
    });
  }

  private async createOverdueNotifications(plans: any[]) {
    for (const plan of plans) {
      if (!plan.responsiblePerson) continue;

      await this.todoService.createTodo({
        type: 'maintenance_plan',
        title: `OVERDUE: ${plan.equipment.name} (${plan.maintenanceLevel})`,
        description: `Plan ${plan.planNumber} was due on ${plan.plannedDate.toISOString().slice(0, 10)}`,
        assigneeId: plan.responsiblePerson,
        urgency: 'urgent',
        relatedId: plan.id,
      });
    }
  }

  private async findExpiringWarranties() {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    return this.prisma.equipment.findMany({
      where: {
        warrantyExpiry: { lte: thirtyDaysLater, gte: new Date() },
        status: 'active',
        deletedAt: null,
      },
    });
  }

  private async createWarrantyNotifications(equipmentList: any[]) {
    for (const eq of equipmentList) {
      if (!eq.responsiblePerson) continue;

      await this.todoService.createTodo({
        type: 'maintenance_plan',
        title: `Warranty expiring: ${eq.name}`,
        description: `Equipment ${eq.code} warranty expires on ${eq.warrantyExpiry.toISOString().slice(0, 10)}`,
        assigneeId: eq.responsiblePerson,
        relatedId: eq.id,
      });
    }
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diffMs = date2.getTime() - date1.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
