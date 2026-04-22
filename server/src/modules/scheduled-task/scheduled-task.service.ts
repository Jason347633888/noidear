import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronExpressionParser } from 'cron-parser';

@Injectable()
export class ScheduledTaskService {
  constructor(private readonly prisma: PrismaService) {}

  isCronDueNow(expression: string): boolean {
    try {
      const interval = CronExpressionParser.parse(expression);
      const prev = interval.prev().toDate();
      const now = new Date();
      return now.getTime() - prev.getTime() < 60 * 1000;
    } catch {
      return false;
    }
  }

  async triggerDueTasks(): Promise<string[]> {
    const periodicRules = await this.prisma.recordTaskAssignment.findMany({
      where: { isPeriodic: true, cron_expression: { not: null } },
    });

    const triggered: string[] = [];

    for (const rule of periodicRules) {
      if (!rule.cron_expression) continue;
      if (!this.isCronDueNow(rule.cron_expression)) continue;

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);

      await this.prisma.recordTaskInstance.create({
        data: {
          assignmentId: rule.id,
          deadline,
          status: 'pending',
        },
      });

      await this.prisma.recordTaskAssignment.update({
        where: { id: rule.id },
        data: { last_triggered_at: new Date() },
      });

      triggered.push(rule.id);
    }

    return triggered;
  }
}
