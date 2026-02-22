import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLoginLogDto,
  CreatePermissionLogDto,
  CreateSensitiveLogDto,
  QueryLoginLogDto,
  QueryPermissionLogDto,
  QuerySensitiveLogDto,
} from './dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录登录日志
   * BR-269: 登录日志保留 90 天
   * BRCGS 3.5.4: 登录日志记录
   */
  async createLoginLog(dto: CreateLoginLogDto) {
    try {
      return await this.prisma.loginLog.create({
        data: {
          userId: dto.userId,
          username: dto.username,
          action: dto.action,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent || 'unknown',
          location: dto.location,
          loginTime:
            dto.action === 'login' || dto.action === 'login_failed'
              ? new Date()
              : undefined,
          logoutTime: dto.action === 'logout' ? new Date() : undefined,
          status: dto.status || (dto.action === 'login_failed' ? 'failed' : 'success'),
          failReason: dto.failReason,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create login log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 记录权限变更日志
   * BR-269: 权限变更日志永久保留
   * BRCGS 3.5.3: 权限变更记录
   */
  async createPermissionLog(dto: CreatePermissionLogDto) {
    try {
      return await this.prisma.permissionLog.create({
        data: {
          operatorId: dto.operatorId,
          operatorName: dto.operatorName,
          targetUserId: dto.targetUserId,
          targetUsername: dto.targetUsername,
          action: dto.action,
          beforeValue: dto.beforeValue,
          afterValue: dto.afterValue,
          reason: dto.reason,
          approvedBy: dto.approvedBy,
          approvedByName: dto.approvedByName,
          ipAddress: dto.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create permission log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 记录敏感操作日志
   * BR-270: 所有敏感操作必须记录审计日志
   * BRCGS 3.5.2: 记录修改历史
   */
  async createSensitiveLog(dto: CreateSensitiveLogDto) {
    try {
      return await this.prisma.sensitiveLog.create({
        data: {
          userId: dto.userId,
          username: dto.username,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          resourceName: dto.resourceName,
          details: dto.details,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create sensitive log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 批量记录登录日志
   */
  async createLoginLogs(dtos: CreateLoginLogDto[]) {
    try {
      return await this.prisma.loginLog.createMany({
        data: dtos.map((dto) => ({
          userId: dto.userId,
          username: dto.username,
          action: dto.action,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent || 'unknown',
          location: dto.location,
          loginTime:
            dto.action === 'login' || dto.action === 'login_failed'
              ? new Date()
              : undefined,
          logoutTime: dto.action === 'logout' ? new Date() : undefined,
          status: dto.status || (dto.action === 'login_failed' ? 'failed' : 'success'),
          failReason: dto.failReason,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create login logs in batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 批量记录权限变更日志
   */
  async createPermissionLogs(dtos: CreatePermissionLogDto[]) {
    try {
      return await this.prisma.permissionLog.createMany({
        data: dtos.map((dto) => ({
          operatorId: dto.operatorId,
          operatorName: dto.operatorName,
          targetUserId: dto.targetUserId,
          targetUsername: dto.targetUsername,
          action: dto.action,
          beforeValue: dto.beforeValue,
          afterValue: dto.afterValue,
          reason: dto.reason,
          approvedBy: dto.approvedBy,
          approvedByName: dto.approvedByName,
          ipAddress: dto.ipAddress,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create permission logs in batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 批量记录敏感操作日志
   */
  async createSensitiveLogs(dtos: CreateSensitiveLogDto[]) {
    try {
      return await this.prisma.sensitiveLog.createMany({
        data: dtos.map((dto) => ({
          userId: dto.userId,
          username: dto.username,
          action: dto.action,
          resourceType: dto.resourceType,
          resourceId: dto.resourceId,
          resourceName: dto.resourceName,
          details: dto.details,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to create sensitive logs in batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询登录日志
   * TASK-362: Query login logs with pagination
   */
  async queryLoginLogs(dto: QueryLoginLogDto) {
    try {
      const where: any = {};
      if (dto.userId) where.userId = dto.userId;
      if (dto.action) where.action = dto.action;
      if (dto.status) where.status = dto.status;
      if (dto.ipAddress) where.ipAddress = { contains: dto.ipAddress };
      if (dto.startTime || dto.endTime) {
        where.loginTime = {};
        if (dto.startTime) where.loginTime.gte = new Date(dto.startTime);
        if (dto.endTime) where.loginTime.lte = new Date(dto.endTime);
      }

      const page = dto.page || 1;
      const limit = dto.limit || 20;

      const [total, data] = await Promise.all([
        this.prisma.loginLog.count({ where }),
        this.prisma.loginLog.findMany({
          where,
          include: { user: { select: { id: true, username: true, name: true } } },
          orderBy: { loginTime: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to query login logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询权限变更日志
   * TASK-362: Query permission logs with pagination
   */
  async queryPermissionLogs(dto: QueryPermissionLogDto) {
    try {
      const where: any = {};
      if (dto.operatorId) where.operatorId = dto.operatorId;
      if (dto.targetUserId) where.targetUserId = dto.targetUserId;
      if (dto.action) where.action = dto.action;
      if (dto.startDate || dto.endDate) {
        where.createdAt = {};
        if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
        if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
      }

      const page = dto.page || 1;
      const limit = dto.limit || 20;

      const [total, data] = await Promise.all([
        this.prisma.permissionLog.count({ where }),
        this.prisma.permissionLog.findMany({
          where,
          include: {
            operator: { select: { id: true, username: true, name: true } },
            targetUser: { select: { id: true, username: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to query permission logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询敏感操作日志
   * TASK-362: Query sensitive logs with pagination
   */
  async querySensitiveLogs(dto: QuerySensitiveLogDto) {
    try {
      const where: any = {};
      if (dto.userId) where.userId = dto.userId;
      if (dto.action) where.action = dto.action;
      if (dto.resourceType) where.resourceType = dto.resourceType;
      if (dto.resourceId) where.resourceId = dto.resourceId;
      if (dto.startDate || dto.endDate) {
        where.createdAt = {};
        if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
        if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
      }

      const page = dto.page || 1;
      const limit = dto.limit || 20;

      const [total, data] = await Promise.all([
        this.prisma.sensitiveLog.count({ where }),
        this.prisma.sensitiveLog.findMany({
          where,
          include: { user: { select: { id: true, username: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to query sensitive logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 导出登录日志为 Excel
   * TASK-362: Export login logs to Excel
   */
  async exportLoginLogs(dto: QueryLoginLogDto): Promise<Buffer> {
    try {
      const { data } = await this.queryLoginLogs({ ...dto, page: 1, limit: 10000 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('登录日志');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '用户名', key: 'username', width: 20 },
        { header: '操作', key: 'action', width: 15 },
        { header: 'IP地址', key: 'ipAddress', width: 20 },
        { header: '登录时间', key: 'loginTime', width: 25 },
        { header: '登出时间', key: 'logoutTime', width: 25 },
        { header: '状态', key: 'status', width: 10 },
        { header: '失败原因', key: 'failReason', width: 30 },
      ];

      data.forEach((log) => {
        worksheet.addRow({
          id: log.id.toString(),
          username: log.username,
          action: log.action,
          ipAddress: log.ipAddress || '-',
          loginTime: log.loginTime?.toISOString() || '-',
          logoutTime: log.logoutTime?.toISOString() || '-',
          status: log.status,
          failReason: log.failReason || '-',
        });
      });

      return await workbook.xlsx.writeBuffer() as unknown as Buffer;
    } catch (error) {
      this.logger.error(
        `Failed to export login logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 导出权限变更日志为 Excel
   * TASK-362: Export permission logs to Excel
   */
  async exportPermissionLogs(dto: QueryPermissionLogDto): Promise<Buffer> {
    try {
      const { data } = await this.queryPermissionLogs({ ...dto, page: 1, limit: 10000 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('权限变更日志');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '操作人', key: 'operatorName', width: 20 },
        { header: '目标用户', key: 'targetUsername', width: 20 },
        { header: '操作类型', key: 'action', width: 20 },
        { header: '变更前', key: 'beforeValue', width: 30 },
        { header: '变更后', key: 'afterValue', width: 30 },
        { header: '原因', key: 'reason', width: 30 },
        { header: '审批人', key: 'approvedByName', width: 20 },
        { header: '创建时间', key: 'createdAt', width: 25 },
      ];

      data.forEach((log) => {
        worksheet.addRow({
          id: log.id.toString(),
          operatorName: log.operatorName,
          targetUsername: log.targetUsername,
          action: log.action,
          beforeValue: log.beforeValue ? JSON.stringify(log.beforeValue) : '-',
          afterValue: log.afterValue ? JSON.stringify(log.afterValue) : '-',
          reason: log.reason || '-',
          approvedByName: log.approvedByName || '-',
          createdAt: log.createdAt.toISOString(),
        });
      });

      return await workbook.xlsx.writeBuffer() as unknown as Buffer;
    } catch (error) {
      this.logger.error(
        `Failed to export permission logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 导出敏感操作日志为 Excel
   * TASK-362: Export sensitive logs to Excel
   */
  async exportSensitiveLogs(dto: QuerySensitiveLogDto): Promise<Buffer> {
    try {
      const { data } = await this.querySensitiveLogs({ ...dto, page: 1, limit: 10000 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('敏感操作日志');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '用户名', key: 'username', width: 20 },
        { header: '操作类型', key: 'action', width: 20 },
        { header: '资源类型', key: 'resourceType', width: 15 },
        { header: '资源ID', key: 'resourceId', width: 20 },
        { header: '资源名称', key: 'resourceName', width: 30 },
        { header: '详情', key: 'details', width: 40 },
        { header: 'IP地址', key: 'ipAddress', width: 20 },
        { header: '创建时间', key: 'createdAt', width: 25 },
      ];

      data.forEach((log) => {
        worksheet.addRow({
          id: log.id.toString(),
          username: log.username,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          resourceName: log.resourceName,
          details: log.details ? JSON.stringify(log.details) : '-',
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        });
      });

      return await workbook.xlsx.writeBuffer() as unknown as Buffer;
    } catch (error) {
      this.logger.error(
        `Failed to export sensitive logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取登录统计
   * TASK-362: Get login statistics
   */
  async getLoginStats(startDate: Date, endDate: Date) {
    try {
      const [totalLogins, successLogins, failedLogins, uniqueUsers] = await Promise.all([
        this.prisma.loginLog.count({
          where: {
            loginTime: { gte: startDate, lte: endDate },
            action: { in: ['login', 'login_failed'] },
          },
        }),
        this.prisma.loginLog.count({
          where: {
            loginTime: { gte: startDate, lte: endDate },
            action: 'login',
            status: 'success',
          },
        }),
        this.prisma.loginLog.count({
          where: {
            loginTime: { gte: startDate, lte: endDate },
            action: 'login_failed',
            status: 'failed',
          },
        }),
        this.prisma.loginLog.groupBy({
          by: ['userId'],
          where: {
            loginTime: { gte: startDate, lte: endDate },
            action: 'login',
            status: 'success',
          },
        }),
      ]);

      return {
        totalLogins,
        successLogins,
        failedLogins,
        uniqueUsers: uniqueUsers.length,
        successRate: totalLogins > 0 ? ((successLogins / totalLogins) * 100).toFixed(2) : '0.00',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get login stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取敏感操作统计
   * TASK-362: Get sensitive operation statistics
   */
  async getSensitiveStats(startDate: Date, endDate: Date) {
    try {
      const [totalOps, byAction, byResourceType] = await Promise.all([
        this.prisma.sensitiveLog.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.sensitiveLog.groupBy({
          by: ['action'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),
        this.prisma.sensitiveLog.groupBy({
          by: ['resourceType'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          _count: true,
        }),
      ]);

      return {
        totalOperations: totalOps,
        byAction: byAction.map((item) => ({
          action: item.action,
          count: item._count,
        })),
        byResourceType: byResourceType.map((item) => ({
          resourceType: item.resourceType,
          count: item._count,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get sensitive stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取审计仪表板数据
   * TASK-362: Get dashboard overview
   */
  async getDashboard() {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [loginStats24h, loginStats7d, sensitiveOps24h, sensitiveOps7d] = await Promise.all([
        this.getLoginStats(last24h, now),
        this.getLoginStats(last7d, now),
        this.getSensitiveStats(last24h, now),
        this.getSensitiveStats(last7d, now),
      ]);

      return {
        login: {
          last24h: loginStats24h,
          last7d: loginStats7d,
        },
        sensitive: {
          last24h: sensitiveOps24h,
          last7d: sensitiveOps7d,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取用户操作时间线
   * TASK-362: Get user timeline (all activities)
   */
  async getUserTimeline(userId: string) {
    try {
      const [loginLogs, permissionLogs, sensitiveLogs] = await Promise.all([
        this.prisma.loginLog.findMany({
          where: { userId },
          orderBy: { loginTime: 'desc' },
          take: 50,
        }),
        this.prisma.permissionLog.findMany({
          where: { OR: [{ operatorId: userId }, { targetUserId: userId }] },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.sensitiveLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      ]);

      const timeline = [
        ...loginLogs.map((log) => ({
          type: 'login',
          timestamp: log.loginTime,
          data: log,
        })),
        ...permissionLogs.map((log) => ({
          type: 'permission',
          timestamp: log.createdAt,
          data: log,
        })),
        ...sensitiveLogs.map((log) => ({
          type: 'sensitive',
          timestamp: log.createdAt,
          data: log,
        })),
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return timeline.slice(0, 100);
    } catch (error) {
      this.logger.error(
        `Failed to get user timeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 生成 BRCGS 合规报告
   * TASK-362: Generate BRCGS compliance report (Excel)
   * BRCGS 3.5.2, 3.5.3, 3.5.4 要求
   */
  async generateBRCGSReport(startDate: Date, endDate: Date): Promise<Buffer> {
    try {
      const [loginLogs, permissionLogs, sensitiveLogs, loginStats, sensitiveStats] = await Promise.all([
        this.prisma.loginLog.findMany({
          where: { loginTime: { gte: startDate, lte: endDate } },
          orderBy: { loginTime: 'desc' },
        }),
        this.prisma.permissionLog.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.sensitiveLog.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          orderBy: { createdAt: 'desc' },
        }),
        this.getLoginStats(startDate, endDate),
        this.getSensitiveStats(startDate, endDate),
      ]);

      const workbook = new ExcelJS.Workbook();

      // 汇总页
      const summarySheet = workbook.addWorksheet('合规报告汇总');
      summarySheet.columns = [
        { header: '指标项', key: 'metric', width: 40 },
        { header: '数值', key: 'value', width: 20 },
      ];
      summarySheet.addRow({ metric: 'BRCGS 审计报告', value: '' });
      summarySheet.addRow({ metric: '报告时间范围', value: `${startDate.toISOString()} - ${endDate.toISOString()}` });
      summarySheet.addRow({ metric: '', value: '' });
      summarySheet.addRow({ metric: '登录统计', value: '' });
      summarySheet.addRow({ metric: '总登录次数', value: loginStats.totalLogins });
      summarySheet.addRow({ metric: '成功登录次数', value: loginStats.successLogins });
      summarySheet.addRow({ metric: '失败登录次数', value: loginStats.failedLogins });
      summarySheet.addRow({ metric: '登录成功率', value: `${loginStats.successRate}%` });
      summarySheet.addRow({ metric: '独立用户数', value: loginStats.uniqueUsers });
      summarySheet.addRow({ metric: '', value: '' });
      summarySheet.addRow({ metric: '敏感操作统计', value: '' });
      summarySheet.addRow({ metric: '总操作次数', value: sensitiveStats.totalOperations });
      summarySheet.addRow({ metric: '', value: '' });
      summarySheet.addRow({ metric: '权限变更记录数', value: permissionLogs.length });

      // 登录日志页
      const loginSheet = workbook.addWorksheet('登录日志');
      loginSheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '用户名', key: 'username', width: 20 },
        { header: '操作', key: 'action', width: 15 },
        { header: 'IP地址', key: 'ipAddress', width: 20 },
        { header: '登录时间', key: 'loginTime', width: 25 },
        { header: '状态', key: 'status', width: 10 },
        { header: '失败原因', key: 'failReason', width: 30 },
      ];
      loginLogs.forEach((log) => {
        loginSheet.addRow({
          id: log.id.toString(),
          username: log.username,
          action: log.action,
          ipAddress: log.ipAddress || '-',
          loginTime: log.loginTime?.toISOString() || '-',
          status: log.status,
          failReason: log.failReason || '-',
        });
      });

      // 权限变更日志页
      const permSheet = workbook.addWorksheet('权限变更日志');
      permSheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '操作人', key: 'operatorName', width: 20 },
        { header: '目标用户', key: 'targetUsername', width: 20 },
        { header: '操作类型', key: 'action', width: 20 },
        { header: '变更前', key: 'beforeValue', width: 30 },
        { header: '变更后', key: 'afterValue', width: 30 },
        { header: '审批人', key: 'approvedByName', width: 20 },
        { header: '创建时间', key: 'createdAt', width: 25 },
      ];
      permissionLogs.forEach((log) => {
        permSheet.addRow({
          id: log.id.toString(),
          operatorName: log.operatorName,
          targetUsername: log.targetUsername,
          action: log.action,
          beforeValue: log.beforeValue ? JSON.stringify(log.beforeValue) : '-',
          afterValue: log.afterValue ? JSON.stringify(log.afterValue) : '-',
          approvedByName: log.approvedByName || '-',
          createdAt: log.createdAt.toISOString(),
        });
      });

      // 敏感操作日志页
      const sensitiveSheet = workbook.addWorksheet('敏感操作日志');
      sensitiveSheet.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: '用户名', key: 'username', width: 20 },
        { header: '操作类型', key: 'action', width: 20 },
        { header: '资源类型', key: 'resourceType', width: 15 },
        { header: '资源ID', key: 'resourceId', width: 20 },
        { header: '资源名称', key: 'resourceName', width: 30 },
        { header: 'IP地址', key: 'ipAddress', width: 20 },
        { header: '创建时间', key: 'createdAt', width: 25 },
      ];
      sensitiveLogs.forEach((log) => {
        sensitiveSheet.addRow({
          id: log.id.toString(),
          username: log.username,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          resourceName: log.resourceName,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        });
      });

      return await workbook.xlsx.writeBuffer() as unknown as Buffer;
    } catch (error) {
      this.logger.error(
        `Failed to generate BRCGS report: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 跨日志类型全局搜索
   * TASK-362: Cross-type log search
   */
  async searchLogs(
    keyword: string,
    logTypes?: string[],
    startDate?: Date,
    endDate?: Date,
  ) {
    try {
      const types = logTypes && logTypes.length > 0
        ? logTypes
        : ['login', 'permission', 'sensitive'];

      const results: Array<{ type: string; timestamp: Date; data: any }> = [];

      if (types.includes('login')) {
        const loginWhere: any = {
          OR: [
            { username: { contains: keyword, mode: 'insensitive' } },
            { ipAddress: { contains: keyword } },
            { action: { contains: keyword, mode: 'insensitive' } },
          ],
        };
        if (startDate || endDate) {
          loginWhere.loginTime = {};
          if (startDate) loginWhere.loginTime.gte = startDate;
          if (endDate) loginWhere.loginTime.lte = endDate;
        }
        const loginLogs = await this.prisma.loginLog.findMany({
          where: loginWhere,
          take: 50,
          orderBy: { loginTime: 'desc' },
        });
        loginLogs.forEach((log) => results.push({ type: 'login', timestamp: log.loginTime, data: log }));
      }

      if (types.includes('permission')) {
        const permWhere: any = {
          OR: [
            { operatorName: { contains: keyword, mode: 'insensitive' } },
            { targetUsername: { contains: keyword, mode: 'insensitive' } },
            { action: { contains: keyword, mode: 'insensitive' } },
            { reason: { contains: keyword, mode: 'insensitive' } },
          ],
        };
        if (startDate || endDate) {
          permWhere.createdAt = {};
          if (startDate) permWhere.createdAt.gte = startDate;
          if (endDate) permWhere.createdAt.lte = endDate;
        }
        const permLogs = await this.prisma.permissionLog.findMany({
          where: permWhere,
          take: 50,
          orderBy: { createdAt: 'desc' },
        });
        permLogs.forEach((log) => results.push({ type: 'permission', timestamp: log.createdAt, data: log }));
      }

      if (types.includes('sensitive')) {
        const sensWhere: any = {
          OR: [
            { username: { contains: keyword, mode: 'insensitive' } },
            { action: { contains: keyword, mode: 'insensitive' } },
            { resourceType: { contains: keyword, mode: 'insensitive' } },
            { resourceName: { contains: keyword, mode: 'insensitive' } },
          ],
        };
        if (startDate || endDate) {
          sensWhere.createdAt = {};
          if (startDate) sensWhere.createdAt.gte = startDate;
          if (endDate) sensWhere.createdAt.lte = endDate;
        }
        const sensLogs = await this.prisma.sensitiveLog.findMany({
          where: sensWhere,
          take: 50,
          orderBy: { createdAt: 'desc' },
        });
        sensLogs.forEach((log) => results.push({ type: 'sensitive', timestamp: log.createdAt, data: log }));
      }

      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 100);
    } catch (error) {
      this.logger.error(`Failed to search logs: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询某用户的权限变更历史
   * TASK-362: Get permission change history for a specific user
   */
  async getUserPermissionLogs(userId: string, page: number = 1, limit: number = 20) {
    try {
      const where = {
        OR: [{ operatorId: userId }, { targetUserId: userId }],
      };

      const [total, data] = await Promise.all([
        this.prisma.permissionLog.count({ where }),
        this.prisma.permissionLog.findMany({
          where,
          include: {
            operator: { select: { id: true, username: true, name: true } },
            targetUser: { select: { id: true, username: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user permission logs: ${error.message}`, error.stack);
      throw error;
    }
  }
}
