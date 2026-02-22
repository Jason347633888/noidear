import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { RecordMetricDto, QueryMetricsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('监控')
@Controller('api/v1/monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: '获取 Prometheus 格式的指标' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPrometheusMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    res.setHeader('Content-Type', this.metricsService.getContentType());
    res.send(metrics);
  }

  @Post('metrics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '记录指标到数据库' })
  @ApiResponse({ status: 201, description: '记录成功' })
  async recordMetric(@Body() dto: RecordMetricDto) {
    return this.monitoringService.recordMetric(dto);
  }

  @Post('metrics/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询指标' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryMetrics(@Body() dto: QueryMetricsDto) {
    return this.monitoringService.queryMetrics(dto);
  }

  @Get('metrics/stats')
  @ApiOperation({ summary: '获取指标统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getMetricStats(
    @Query('metricName') metricName: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.monitoringService.getMetricStats(
      metricName,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('metrics/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清理过期指标' })
  @ApiResponse({ status: 200, description: '清理成功' })
  async cleanupOldMetrics() {
    return this.monitoringService.cleanupOldMetrics();
  }
}
