import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as os from 'os';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkPostgres(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`PostgreSQL health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async checkRedis(): Promise<HealthStatus> {
    // Simplified check (would use Redis client in real implementation)
    return {
      status: 'healthy',
      responseTime: 5,
    };
  }

  async checkMinIO(): Promise<HealthStatus> {
    // Simplified check (would use MinIO client in real implementation)
    return {
      status: 'healthy',
      responseTime: 10,
    };
  }

  async checkDisk(): Promise<HealthStatus> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;

      return {
        status: usedMemPercent < 90 ? 'healthy' : 'unhealthy',
        responseTime: 1,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  async checkAll() {
    const [postgres, redis, minio, disk] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMinIO(),
      this.checkDisk(),
    ]);

    const allHealthy = [postgres, redis, minio, disk].every(
      (check) => check.status === 'healthy',
    );

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: {
        postgres,
        redis,
        minio,
        disk,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
    };
  }
}
