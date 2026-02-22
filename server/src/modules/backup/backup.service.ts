import { Injectable, Logger } from '@nestjs/common';
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
      // Simplified MinIO backup
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

  async queryBackupHistory(page: number = 1, limit: number = 20) {
    const [total, data] = await Promise.all([
      this.prisma.backupHistory.count(),
      this.prisma.backupHistory.findMany({
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
}
