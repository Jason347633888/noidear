import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('健康检查')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '获取系统整体健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkAll() {
    return this.healthService.checkAll();
  }

  @Get('postgres')
  @ApiOperation({ summary: '检查 PostgreSQL 健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkPostgres() {
    return this.healthService.checkPostgres();
  }

  @Get('redis')
  @ApiOperation({ summary: '检查 Redis 健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkRedis() {
    return this.healthService.checkRedis();
  }

  @Get('minio')
  @ApiOperation({ summary: '检查 MinIO 健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkMinIO() {
    return this.healthService.checkMinIO();
  }

  @Get('disk')
  @ApiOperation({ summary: '检查磁盘/内存健康状态' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkDisk() {
    return this.healthService.checkDisk();
  }

  @Get('dependencies')
  @ApiOperation({ summary: '获取所有依赖服务健康状态详情' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async getDependenciesHealth() {
    return this.healthService.getDependenciesHealth();
  }

  @Get('system-info')
  @ApiOperation({ summary: '获取系统信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getSystemInfo() {
    return this.healthService.getSystemInfo();
  }
}
