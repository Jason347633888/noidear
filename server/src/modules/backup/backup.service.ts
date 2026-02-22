import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dayjs from 'dayjs';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async triggerPostgresBackup() {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `backup_${timestamp}.dump`;
    const startedAt = new Date();

    try {
      const cmd = `docker exec noidear-postgres-1 pg_dump -U postgres -d document_system -F c -f /tmp/${filename}`;
      await execAsync(cmd);

      const { stdout } = await execAsync(`docker exec noidear-postgres-1 stat -c%s /tmp/${filename}`);
      const fileSize = BigInt(stdout.trim());

      await this.prisma.backupHistory.create({
        data: {
          backupType: 'postgres',
          fileName: filename,
          fileSize,
          status: 'success',
          startedAt,
          completedAt: new Date(),
        },
      });

      this.logger.log(`PostgreSQL backup completed: ${filename}`);
      return { success: true, fileName: filename };
    } catch (error) {
      await this.prisma.backupHistory.create({
        data: {
          backupType: 'postgres',
          fileName: filename,
          fileSize: BigInt(0),
          status: 'failed',
          errorMessage: error.message,
          startedAt,
          completedAt: new Date(),
        },
      });

      this.logger.error(`PostgreSQL backup failed: ${error.message}`);
      throw error;
    }
  }

  async triggerMinIOBackup() {
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `minio_backup_${timestamp}`;
    const startedAt = new Date();

    try {
      const cmd = `docker exec noidear-minio-1 sh -c 'tar -czf /tmp/${filename}.tar.gz /data'`;
      await execAsync(cmd);

      await this.prisma.backupHistory.create({
        data: {
          backupType: 'minio',
          fileName: filename,
          fileSize: BigInt(0),
          status: 'success',
          startedAt,
          completedAt: new Date(),
        },
      });

      this.logger.log(`MinIO backup completed: ${filename}`);
      return { success: true, fileName: filename };
    } catch (error) {
      await this.prisma.backupHistory.create({
        data: {
          backupType: 'minio',
          fileName: filename,
          fileSize: BigInt(0),
          status: 'failed',
          errorMessage: error.message,
          startedAt,
          completedAt: new Date(),
        },
      });

      this.logger.error(`MinIO backup failed: ${error.message}`);
      throw error;
    }
  }

  async queryBackupHistory(page: number = 1, limit: number = 20, backupType?: string) {
    const where: any = {};
    if (backupType) where.backupType = backupType;

    const [total, data] = await Promise.all([
      this.prisma.backupHistory.count({ where }),
      this.prisma.backupHistory.findMany({
        where,
        orderBy: { startedAt: 'desc' },
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
  }

  async getBackupStats() {
    const [totalBackups, successBackups, failedBackups, lastBackup] = await Promise.all([
      this.prisma.backupHistory.count(),
      this.prisma.backupHistory.count({ where: { status: 'success' } }),
      this.prisma.backupHistory.count({ where: { status: 'failed' } }),
      this.prisma.backupHistory.findFirst({ orderBy: { startedAt: 'desc' } }),
    ]);

    return {
      totalBackups,
      successBackups,
      failedBackups,
      lastBackup,
    };
  }

  /**
   * 删除备份记录
   * TASK-365: Delete backup record
   */
  async deleteBackup(id: string) {
    try {
      const existing = await this.prisma.backupHistory.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        throw new NotFoundException(`Backup record with ID ${id} not found`);
      }

      await this.prisma.backupHistory.delete({ where: { id: BigInt(id) } });
      this.logger.log(`Backup record ${id} deleted`);
      return { success: true, message: `Backup record ${id} deleted` };
    } catch (error) {
      this.logger.error(`Failed to delete backup record ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 列出可用于恢复的备份（最近成功的备份）
   * TASK-365: List available backups for restore
   */
  async listAvailableForRestore(backupType?: string, limit: number = 10) {
    try {
      const where: any = { status: 'success' };
      if (backupType) where.backupType = backupType;

      const backups = await this.prisma.backupHistory.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
      });

      return {
        data: backups,
        message: 'These are available backups for restore. Use the fileName to restore manually.',
        meta: { total: backups.length, limit },
      };
    } catch (error) {
      this.logger.error(`Failed to list available backups: ${error.message}`, error.stack);
      throw error;
    }
  }
}
