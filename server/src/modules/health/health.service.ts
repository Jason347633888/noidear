import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { Redis } from 'ioredis';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  available?: string;
  usage?: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

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
    const startTime = Date.now();
    try {
      if (!this.redisClient) {
        return { status: 'unhealthy', error: 'Redis client not configured' };
      }
      const pong = await this.redisClient.ping();
      if (pong !== 'PONG') {
        return { status: 'unhealthy', error: `Unexpected ping response: ${pong}` };
      }
      return { status: 'healthy', responseTime: Date.now() - startTime };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkMinIO(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const minioPort = process.env.MINIO_PORT || '9000';
      const url = `http://${minioEndpoint}:${minioPort}/minio/health/live`;

      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        return { status: 'healthy', responseTime: Date.now() - startTime };
      }
      return {
        status: 'unhealthy',
        error: `MinIO health endpoint returned ${response.status}`,
      };
    } catch (error) {
      this.logger.error(`MinIO health check failed: ${error.message}`);
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkDisk(): Promise<HealthStatus> {
    try {
      const { stdout } = await execAsync('df -k /');
      const lines = stdout.trim().split('\n');
      // Last line has filesystem stats; format: Filesystem 1K-blocks Used Available Use% Mounted
      const parts = lines[lines.length - 1].trim().split(/\s+/);
      const usePercent = parseInt(parts[4]?.replace('%', '') || '0', 10);
      const availableKB = parseInt(parts[3] || '0', 10);
      const availableGB = (availableKB / 1024 / 1024).toFixed(1);

      return {
        status: usePercent < 90 ? 'healthy' : 'unhealthy',
        responseTime: 1,
        available: `${availableGB} GB`,
        usage: usePercent,
      };
    } catch (error) {
      this.logger.error(`Disk health check failed: ${error.message}`);
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

    const checks = [postgres, redis, minio, disk];
    const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
    const status =
      unhealthyCount === 0 ? 'healthy' : unhealthyCount < checks.length ? 'degraded' : 'unhealthy';

    return {
      status,
      checks: {
        postgres,
        redis,
        minio,
        disk,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取依赖服务健康状态详情
   * TASK-366: GET /api/v1/health/dependencies
   */
  async getDependenciesHealth() {
    const [postgres, redis, minio] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkMinIO(),
    ]);

    const dependencies = [
      { name: 'PostgreSQL', type: 'database', ...postgres },
      { name: 'Redis', type: 'cache', ...redis },
      { name: 'MinIO', type: 'storage', ...minio },
    ];

    const unhealthyCount = dependencies.filter((dep) => dep.status === 'unhealthy').length;
    const status =
      unhealthyCount === 0 ? 'healthy' : unhealthyCount < dependencies.length ? 'degraded' : 'unhealthy';

    return {
      status,
      dependencies,
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
