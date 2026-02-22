import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AlertService } from '../alert/alert.service';
import { RecordMetricDto, QueryMetricsDto } from './dto';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertHistoryDto,
} from '../alert/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('监控')
@Controller('monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
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

  // ─── Alert Rules (路径: /api/v1/monitoring/alerts/) ──────────────────────────

  @Post('alerts/rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建告警规则 (monitoring路径)' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertService.createAlertRule(dto);
  }

  @Get('alerts/rules')
  @ApiOperation({ summary: '查询告警规则 (monitoring路径)' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryAlertRules(
    @Query('metricName') metricName?: string,
    @Query('enabled') enabled?: string,
  ) {
    const filters: any = {};
    if (metricName) filters.metricName = metricName;
    if (enabled !== undefined) filters.enabled = enabled === 'true';
    return this.alertService.queryAlertRules(filters);
  }

  @Put('alerts/rules/:id')
  @ApiOperation({ summary: '更新告警规则 (monitoring路径)' })
  @ApiParam({ name: 'id', description: '告警规则 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertService.updateAlertRule(id, dto);
  }

  @Delete('alerts/rules/:id')
  @ApiOperation({ summary: '删除告警规则 (monitoring路径)' })
  @ApiParam({ name: 'id', description: '告警规则 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteAlertRule(@Param('id') id: string) {
    return this.alertService.deleteAlertRule(id);
  }

  @Post('alerts/rules/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '切换告警规则启用状态 (monitoring路径)' })
  @ApiParam({ name: 'id', description: '告警规则 ID' })
  @ApiResponse({ status: 200, description: '切换成功' })
  async toggleAlertRule(@Param('id') id: string) {
    return this.alertService.toggleAlertRule(id);
  }

  @Post('alerts/history/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询告警历史 (monitoring路径)' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryAlertHistory(@Body() dto: QueryAlertHistoryDto) {
    return this.alertService.queryAlertHistory(dto);
  }

  @Post('alerts/history/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认告警 (monitoring路径)' })
  @ApiParam({ name: 'id', description: '告警历史 ID' })
  @ApiResponse({ status: 200, description: '确认成功' })
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.alertService.acknowledgeAlert(id, userId);
  }

  @Post('alerts/history/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解决告警 (monitoring路径)' })
  @ApiParam({ name: 'id', description: '告警历史 ID' })
  @ApiResponse({ status: 200, description: '解决成功' })
  async resolveAlert(@Param('id') id: string) {
    return this.alertService.resolveAlert(id);
  }
}
