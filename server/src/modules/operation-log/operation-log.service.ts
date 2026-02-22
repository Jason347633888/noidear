import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OperationLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId: string;
    action: string;
    module: string;
    objectId?: string;
    objectType?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 清理7天前的日志
    await this.prisma.operationLog.deleteMany({
      where: { createdAt: { lt: sevenDaysAgo } },
    });

    return this.prisma.operationLog.create({
      data: {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId,
        action: params.action,
        module: params.module,
        objectId: params.objectId || '',
        objectType: params.objectType || '',
        details: params.details,
        ip: params.ip || 'unknown',
      },
    } as any);
  }

  async findPermissionLogs(params: {
    page?: number;
    limit?: number;
    username?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, username, action, startDate, endDate } = params;
    const where: Record<string, unknown> = {};

    if (username) {
      where.operatorName = { contains: username };
    }
    if (action) {
      where.action = action;
    }
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(`${endDate}T23:59:59`) } : {}),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.permissionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          operator: { select: { id: true, name: true, username: true } },
          targetUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.permissionLog.count({ where }),
    ]);

    const list = logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      operator: log.operator,
      action: log.action,
      targetUser: log.targetUser,
      targetDept: null,
      resource: (log.afterValue as Record<string, string> | null)?.resource ?? null,
      permissionAction: (log.afterValue as Record<string, string> | null)?.action ?? null,
      detail: log.reason || JSON.stringify(log.afterValue ?? log.beforeValue ?? {}),
      result: 'success' as const,
    }));

    return { list, total, page, limit };
  }

  async exportPermissionLogs(params: {
    username?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    const result = await this.findPermissionLogs({ ...params, limit: 10000 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('权限审计日志');
    sheet.columns = [
      { header: '时间', key: 'createdAt', width: 22 },
      { header: '操作人', key: 'operator', width: 16 },
      { header: '操作类型', key: 'action', width: 14 },
      { header: '目标用户', key: 'targetUser', width: 16 },
      { header: '详情', key: 'detail', width: 40 },
      { header: '结果', key: 'result', width: 8 },
    ];

    for (const log of result.list) {
      sheet.addRow({
        createdAt: new Date(log.createdAt).toLocaleString('zh-CN'),
        operator: log.operator?.name ?? log.operator?.username ?? '-',
        action: log.action,
        targetUser: log.targetUser?.name ?? '-',
        detail: log.detail,
        result: log.result === 'success' ? '成功' : '失败',
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async findAll(page = 1, limit = 20) {
    const [list, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.operationLog.count(),
    ]);

    return { list, total, page, limit };
  }
}
