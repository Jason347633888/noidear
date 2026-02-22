import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DocumentStatsQueryDto } from './dto/document-stats-query.dto';
import { TaskStatsQueryDto } from './dto/task-stats-query.dto';
import { ApprovalStatsQueryDto } from './dto/approval-stats-query.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { DocumentStatsResponse } from './interfaces/document-stats.interface';
import { TaskStatsResponse } from './interfaces/task-stats.interface';
import { ApprovalStatsResponse } from './interfaces/approval-stats.interface';
import * as crypto from 'crypto';

@Injectable()
export class StatisticsService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(prefix: string, filters: any): string {
    const sanitizedFilters = this.sanitizeFilters(filters);
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(this.sortObject(sanitizedFilters)))
      .digest('hex')
      .substring(0, 8);

    return `statistics:${prefix}:${hash}`;
  }

  private sanitizeFilters(filters: any): any {
    const { startDate, endDate, ...rest } = filters;
    return {
      ...rest,
      hasDateRange: !!(startDate || endDate),
    };
  }

  private sortObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = obj[key];
      });
    return sorted;
  }

  private async getCached<T>(
    cacheKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await fn();
    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));

    return result;
  }

  private buildDateWhere(startDate?: string, endDate?: string): any {
    if (!startDate && !endDate) return {};

    const dateWhere: any = {};
    if (startDate) dateWhere.gte = new Date(startDate);
    if (endDate) dateWhere.lte = new Date(endDate);

    return { createdAt: dateWhere };
  }

  private calculatePercentage(count: number, total: number): number {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  async getDocumentStatistics(
    filters: DocumentStatsQueryDto,
  ): Promise<DocumentStatsResponse> {
    const cacheKey = this.getCacheKey('documents', filters);

    return this.getCached(cacheKey, async () => {
      const where = this.buildDocumentWhere(filters);
      const total = await this.prisma.document.count({ where });

      const [byLevel, byStatus, byDepartment, trend, growthRate] =
        await Promise.all([
          this.getDocumentsByLevel(where, total),
          this.getDocumentsByStatus(where, total),
          this.getDocumentsByDepartment(where),
          this.getDocumentTrend(filters, where),
          this.calculateDocumentGrowthRate(filters, where, total),
        ]);

      return {
        total,
        byLevel,
        byDepartment,
        byStatus,
        trend,
        growthRate,
      };
    });
  }

  private buildDocumentWhere(filters: DocumentStatsQueryDto): any {
    const where: any = { deletedAt: null };

    if (filters.level) where.level = filters.level;
    if (filters.departmentId) {
      where.creator = {
        departmentId: filters.departmentId,
      };
    }
    if (filters.status) where.status = filters.status;

    return {
      ...where,
      ...this.buildDateWhere(filters.startDate, filters.endDate),
    };
  }

  private async getDocumentsByLevel(where: any, total: number) {
    const byLevelRaw = await this.prisma.document.groupBy({
      by: ['level'],
      _count: { id: true },
      where,
    });

    return byLevelRaw.map((item) => ({
      level: item.level,
      count: item._count.id,
      percentage: this.calculatePercentage(item._count.id, total),
    }));
  }

  private async getDocumentsByStatus(where: any, total: number) {
    const byStatusRaw = await this.prisma.document.groupBy({
      by: ['status'],
      _count: { id: true },
      where,
    });

    return byStatusRaw.map((item) => ({
      status: item.status,
      count: item._count.id,
      percentage: this.calculatePercentage(item._count.id, total),
    }));
  }

  private async getDocumentsByDepartment(where: any) {
    const byCreatorRaw = await this.prisma.document.groupBy({
      by: ['creatorId'],
      _count: { id: true },
      where,
    });

    const creatorIds = byCreatorRaw.map((item) => item.creatorId);

    const creators =
      creatorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, departmentId: true, department: { select: { id: true, name: true } } },
          })
        : [];

    const creatorToDept = new Map(creators.map((c) => [c.id, c.department]));

    const deptCountMap = new Map<string, number>();

    byCreatorRaw.forEach((item) => {
      const dept = creatorToDept.get(item.creatorId);
      const deptId = dept?.id || 'unassigned';
      const currentCount = deptCountMap.get(deptId) || 0;
      deptCountMap.set(deptId, currentCount + item._count.id);
    });

    return Array.from(deptCountMap.entries()).map(([deptId, count]) => {
      const dept = creators.find(c => c.department?.id === deptId)?.department;
      return {
        departmentId: deptId,
        name: dept?.name || '未分配',
        count,
      };
    });
  }

  private async getDocumentTrend(
    filters: DocumentStatsQueryDto,
    where: any,
  ) {
    if (!filters.startDate || !filters.endDate) return [];

    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const limitedDays = Math.min(days, 90);

    const trendPromises = [];
    for (let i = 0; i < limitedDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      trendPromises.push(
        this.getDailyDocumentCount(where, dateStr).then((count) => ({
          date: dateStr,
          count,
        })),
      );
    }

    return Promise.all(trendPromises);
  }

  private async getDailyDocumentCount(
    where: any,
    dateStr: string,
  ): Promise<number> {
    return this.prisma.document.count({
      where: {
        ...where,
        createdAt: {
          gte: new Date(dateStr),
          lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  private async calculateDocumentGrowthRate(
    filters: DocumentStatsQueryDto,
    where: any,
    currentTotal: number,
  ): Promise<number> {
    if (!filters.startDate || !filters.endDate) return 0;

    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const duration = end.getTime() - start.getTime();

    const previousStart = new Date(start.getTime() - duration);
    const previousEnd = start;

    const previousCount = await this.prisma.document.count({
      where: {
        ...where,
        createdAt: {
          gte: previousStart,
          lt: previousEnd,
        },
      },
    });

    if (previousCount === 0) return 0;

    return Math.round(
      ((currentTotal - previousCount) / previousCount) * 100,
    );
  }

  async getTaskStatistics(
    filters: TaskStatsQueryDto,
  ): Promise<TaskStatsResponse> {
    const cacheKey = this.getCacheKey('tasks', filters);

    return this.getCached(cacheKey, async () => {
      const where = this.buildTaskWhere(filters);
      const total = await this.prisma.task.count({ where });

      const [
        completed,
        overdue,
        avgCompletionTime,
        byDepartment,
        byTemplate,
        byStatus,
      ] = await Promise.all([
        this.getCompletedTaskCount(where),
        this.getOverdueTaskCount(where),
        this.getAvgTaskCompletionTime(where),
        this.getTasksByDepartment(where),
        this.getTasksByTemplate(where),
        this.getTasksByStatus(where),
      ]);

      return {
        total,
        completed,
        overdue,
        completionRate: this.calculatePercentage(completed, total),
        overdueRate: this.calculatePercentage(overdue, total),
        avgCompletionTime,
        byDepartment,
        byTemplate,
        byStatus,
        trend: [],
      };
    });
  }

  private buildTaskWhere(filters: TaskStatsQueryDto): any {
    const where: any = { deletedAt: null };

    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.templateId) where.templateId = filters.templateId;
    if (filters.status) where.status = filters.status;

    return {
      ...where,
      ...this.buildDateWhere(filters.startDate, filters.endDate),
    };
  }

  private async getCompletedTaskCount(where: any): Promise<number> {
    return this.prisma.task.count({
      where: { ...where, status: 'completed' },
    });
  }

  private async getOverdueTaskCount(where: any): Promise<number> {
    return this.prisma.task.count({
      where: {
        ...where,
        status: { not: 'completed' },
        deadline: { lt: new Date() },
      },
    });
  }

  /**
   * Calculate average task completion time.
   *
   * Note: Task completion time is calculated as the time from task creation
   * to the last record approval. This assumes that a task is considered
   * "complete" when its final record is approved.
   */
  private async getAvgTaskCompletionTime(where: any): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        records: {
          where: { status: 'approved' },
          orderBy: { approvedAt: 'desc' },
          take: 1,
          select: { approvedAt: true, createdAt: true },
        },
      },
    });

    const completionTimes = tasks
      .filter((t) => t.records.length > 0 && t.records[0].approvedAt)
      .map((t) => {
        const completedAt = t.records[0].approvedAt!;
        return completedAt.getTime() - t.createdAt.getTime();
      });

    if (completionTimes.length === 0) return 0;

    const avgMs =
      completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;

    return Math.round(avgMs / (1000 * 60 * 60));
  }

  private async getTasksByDepartment(where: any) {
    const byDepartmentRaw = await this.prisma.task.groupBy({
      by: ['departmentId'],
      _count: { id: true },
      where,
    });

    const departmentIds = byDepartmentRaw
      .map((item) => item.departmentId)
      .filter((id): id is string => id !== null);

    const departments =
      departmentIds.length > 0
        ? await this.prisma.department.findMany({
            where: { id: { in: departmentIds } },
            select: { id: true, name: true },
          })
        : [];

    const departmentMap = new Map(departments.map((d) => [d.id, d.name]));

    return Promise.all(
      byDepartmentRaw.map(async (item) => {
        const deptTotal = item._count.id;
        const deptCompleted = await this.prisma.task.count({
          where: {
            ...where,
            departmentId: item.departmentId,
            status: 'completed',
          },
        });

        return {
          departmentId: item.departmentId || '',
          name: departmentMap.get(item.departmentId || '') || '未分配',
          count: deptTotal,
          completionRate: this.calculatePercentage(deptCompleted, deptTotal),
        };
      }),
    );
  }

  private async getTasksByTemplate(where: any) {
    const byTemplateRaw = await this.prisma.task.groupBy({
      by: ['templateId'],
      _count: { id: true },
      where,
    });

    const templateIds = byTemplateRaw
      .map((item) => item.templateId)
      .filter((id): id is string => id !== null);

    const templates =
      templateIds.length > 0
        ? await this.prisma.template.findMany({
            where: { id: { in: templateIds } },
            select: { id: true, title: true },
          })
        : [];

    const templateMap = new Map(templates.map((t) => [t.id, t.title]));

    return byTemplateRaw.map((item) => ({
      templateId: item.templateId || '',
      name: templateMap.get(item.templateId || '') || '未知模板',
      count: item._count.id,
    }));
  }

  private async getTasksByStatus(where: any) {
    const byStatusRaw = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
      where,
    });

    return byStatusRaw.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async getApprovalStatistics(
    filters: ApprovalStatsQueryDto,
  ): Promise<ApprovalStatsResponse> {
    const cacheKey = this.getCacheKey('approvals', filters);

    return this.getCached(cacheKey, async () => {
      const where = this.buildApprovalWhere(filters);

      const [total, approved, rejected, pending, avgApprovalTime, byApprover] =
        await Promise.all([
          this.prisma.approval.count({ where }),
          this.getApprovedCount(where),
          this.getRejectedCount(where),
          this.getPendingCount(where),
          this.getAvgApprovalTime(where),
          this.getApprovalsByApprover(where),
        ]);

      const approvalRate =
        approved + rejected > 0
          ? Math.round((approved / (approved + rejected)) * 10000) / 100
          : 0;

      return {
        total,
        approved,
        rejected,
        pending,
        approvalRate,
        avgApprovalTime,
        byApprover,
        trend: [],
      };
    });
  }

  private buildApprovalWhere(filters: ApprovalStatsQueryDto): any {
    const where: any = {};

    if (filters.approverId) where.approverId = filters.approverId;
    if (filters.status) where.status = filters.status;

    return {
      ...where,
      ...this.buildDateWhere(filters.startDate, filters.endDate),
    };
  }

  private async getApprovedCount(where: any): Promise<number> {
    return this.prisma.approval.count({
      where: { ...where, status: 'approved' },
    });
  }

  private async getRejectedCount(where: any): Promise<number> {
    return this.prisma.approval.count({
      where: { ...where, status: 'rejected' },
    });
  }

  private async getPendingCount(where: any): Promise<number> {
    return this.prisma.approval.count({
      where: { ...where, status: 'pending' },
    });
  }

  private async getAvgApprovalTime(where: any): Promise<number> {
    const approvals = await this.prisma.approval.findMany({
      where: {
        ...where,
        status: { in: ['approved', 'rejected'] },
        // updatedAt always set by @updatedAt decorator, no need to filter
      },
      select: { createdAt: true, updatedAt: true },
    });

    if (approvals.length === 0) return 0;

    const totalMs = approvals.reduce(
      (sum, a) => sum + (a.updatedAt.getTime() - a.createdAt.getTime()),
      0,
    );

    return Math.round((totalMs / approvals.length / (1000 * 60 * 60)) * 100) / 100;
  }

  private async getApprovalsByApprover(where: any) {
    const byApproverRaw = await this.prisma.approval.groupBy({
      by: ['approverId'],
      _count: { id: true },
      where,
    });

    const approverIds = byApproverRaw.map((item) => item.approverId);

    const approvers =
      approverIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: approverIds } },
            select: { id: true, name: true },
          })
        : [];

    const approverMap = new Map(approvers.map((a) => [a.id, a.name]));

    return Promise.all(
      byApproverRaw.map(async (item) => {
        const [approverApproved, approverRejected, approverApprovals] =
          await Promise.all([
            this.prisma.approval.count({
              where: {
                ...where,
                approverId: item.approverId,
                status: 'approved',
              },
            }),
            this.prisma.approval.count({
              where: {
                ...where,
                approverId: item.approverId,
                status: 'rejected',
              },
            }),
            this.prisma.approval.findMany({
              where: {
                ...where,
                approverId: item.approverId,
                status: { in: ['approved', 'rejected'] },
                // updatedAt always set by @updatedAt decorator, no need to filter
              },
              select: { createdAt: true, updatedAt: true },
            }),
          ]);

        let avgTime = 0;
        if (approverApprovals.length > 0) {
          const totalMs = approverApprovals.reduce(
            (sum, a) => sum + (a.updatedAt.getTime() - a.createdAt.getTime()),
            0,
          );
          avgTime =
            Math.round((totalMs / approverApprovals.length / (1000 * 60 * 60)) * 100) / 100;
        }

        return {
          approverId: item.approverId,
          name: approverMap.get(item.approverId) || '未知用户',
          approved: approverApproved,
          rejected: approverRejected,
          avgTime,
        };
      }),
    );
  }

  async getOverviewStatistics(filters: OverviewQueryDto) {
    const cacheKey = this.getCacheKey('overview', filters);

    return this.getCached(cacheKey, async () => {
      const dateWhere = this.buildDateWhere(
        filters.startDate,
        filters.endDate,
      );

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        documentsTotal,
        tasksTotal,
        approvalsTotal,
        monthlyDocuments,
        monthlyTasks,
        monthlyApprovals,
        completedTasks,
        approvedCount,
        rejectedCount,
      ] = await Promise.all([
        this.prisma.document.count({
          where: { deletedAt: null, ...dateWhere },
        }),
        this.prisma.task.count({
          where: { deletedAt: null, ...dateWhere },
        }),
        this.prisma.approval.count({ where: dateWhere }),
        this.prisma.document.count({
          where: {
            deletedAt: null,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.task.count({
          where: {
            deletedAt: null,
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.approval.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        this.prisma.task.count({
          where: { deletedAt: null, status: 'completed', ...dateWhere },
        }),
        this.prisma.approval.count({
          where: { status: 'approved', ...dateWhere },
        }),
        this.prisma.approval.count({
          where: { status: 'rejected', ...dateWhere },
        }),
      ]);

      const taskCompletionRate = this.calculatePercentage(
        completedTasks,
        tasksTotal,
      );

      const approvalPassRate =
        approvedCount + rejectedCount > 0
          ? Math.round(
              (approvedCount / (approvedCount + rejectedCount)) * 10000,
            ) / 100
          : 0;

      return {
        totals: {
          documents: documentsTotal,
          tasks: tasksTotal,
          approvals: approvalsTotal,
        },
        monthly: {
          documents: monthlyDocuments,
          tasks: monthlyTasks,
          approvals: monthlyApprovals,
        },
        metrics: {
          taskCompletionRate,
          approvalPassRate,
          deviationRate: 0,
        },
        trends: {
          documents: [],
          tasks: [],
          approvals: [],
        },
      };
    });
  }

  async getUserStats(query: { startDate?: string; endDate?: string }) {
    const cacheKey = this.getCacheKey('users', query);
    return this.getCached(cacheKey, async () => {
      const activeWhere = { status: 'active', deletedAt: null };

      const [byDepartmentRaw, byRole, total] = await Promise.all([
        this.prisma.user.groupBy({
          by: ['departmentId'],
          _count: { id: true },
          where: activeWhere,
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          _count: { id: true },
          where: activeWhere,
        }),
        this.prisma.user.count({ where: activeWhere }),
      ]);

      const departmentIds = byDepartmentRaw
        .map((item) => item.departmentId)
        .filter((id): id is string => id !== null);

      const departments =
        departmentIds.length > 0
          ? await this.prisma.department.findMany({
              where: { id: { in: departmentIds } },
              select: { id: true, name: true },
            })
          : [];

      const deptMap = new Map(departments.map((d) => [d.id, d.name]));

      const byDepartment = byDepartmentRaw.map((item) => ({
        departmentId: item.departmentId || 'unassigned',
        name: item.departmentId ? (deptMap.get(item.departmentId) || '未知部门') : '未分配',
        count: item._count.id,
      }));

      return {
        total,
        byDepartment,
        byRole: byRole.map((item) => ({
          role: item.role,
          count: item._count.id,
        })),
      };
    });
  }

  async getWorkflowStats(query: { startDate?: string; endDate?: string }) {
    const cacheKey = this.getCacheKey('workflow', query);
    return this.getCached(cacheKey, async () => {
      const dateWhere = this.buildDateWhere(query.startDate, query.endDate);
      const where = { deletedAt: null, ...dateWhere };

      const [total, completed, cancelled, instances] = await Promise.all([
        this.prisma.workflowInstance.count({ where }),
        this.prisma.workflowInstance.count({ where: { ...where, status: 'completed' } }),
        this.prisma.workflowInstance.count({ where: { ...where, status: 'cancelled' } }),
        this.prisma.workflowInstance.findMany({
          where: { ...where, status: 'completed' },
          select: { createdAt: true, updatedAt: true },
          take: 1000,
        }),
      ]);

      const passRate = total > 0
        ? Math.round((completed / total) * 10000) / 100
        : 0;

      const cancelRate = total > 0
        ? Math.round((cancelled / total) * 10000) / 100
        : 0;

      let avgDurationHours = 0;
      if (instances.length > 0) {
        const totalMs = instances.reduce(
          (sum, inst) => sum + (inst.updatedAt.getTime() - inst.createdAt.getTime()),
          0,
        );
        avgDurationHours =
          Math.round((totalMs / instances.length / (1000 * 60 * 60)) * 100) / 100;
      }

      return {
        total,
        completed,
        cancelled,
        passRate,
        cancelRate,
        avgDurationHours,
      };
    });
  }

  async getEquipmentStats(query: { startDate?: string; endDate?: string }) {
    const cacheKey = this.getCacheKey('equipment', query);
    return this.getCached(cacheKey, async () => {
      const dateWhere = this.buildDateWhere(query.startDate, query.endDate);
      const where = { deletedAt: null, ...dateWhere };

      const [total, active, inactive, scrapped] = await Promise.all([
        this.prisma.equipment.count({ where }),
        this.prisma.equipment.count({ where: { ...where, status: 'active' } }),
        this.prisma.equipment.count({ where: { ...where, status: 'inactive' } }),
        this.prisma.equipment.count({ where: { ...where, status: 'scrapped' } }),
      ]);

      const intactRate = total > 0
        ? Math.round((active / total) * 10000) / 100
        : 0;

      const maintenanceRate = total > 0
        ? Math.round((inactive / total) * 10000) / 100
        : 0;

      const scrapRate = total > 0
        ? Math.round((scrapped / total) * 10000) / 100
        : 0;

      return {
        total,
        active,
        inactive,
        scrapped,
        intactRate,
        maintenanceRate,
        scrapRate,
      };
    });
  }

  async clearCaches() {
    await this.redis.del('statistics:documents:*');
    await this.redis.del('statistics:tasks:*');
    await this.redis.del('statistics:approvals:*');
    await this.redis.del('statistics:overview:*');
    await this.redis.del('statistics:users:*');
    await this.redis.del('statistics:workflow:*');
    await this.redis.del('statistics:equipment:*');
  }
}
