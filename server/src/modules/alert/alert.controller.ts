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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AlertService } from './alert.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  QueryAlertHistoryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('告警管理')
@Controller('api/v1/alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建告警规则' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createAlertRule(@Body() dto: CreateAlertRuleDto) {
    return this.alertService.createAlertRule(dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: '更新告警规则' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() dto: UpdateAlertRuleDto,
  ) {
    return this.alertService.updateAlertRule(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除告警规则' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteAlertRule(@Param('id') id: string) {
    return this.alertService.deleteAlertRule(id);
  }

  @Post('rules/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '切换告警规则启用状态' })
  @ApiResponse({ status: 200, description: '切换成功' })
  async toggleAlertRule(@Param('id') id: string) {
    return this.alertService.toggleAlertRule(id);
  }

  @Get('rules')
  @ApiOperation({ summary: '查询告警规则' })
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

  @Post('history/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询告警历史' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryAlertHistory(@Body() dto: QueryAlertHistoryDto) {
    return this.alertService.queryAlertHistory(dto);
  }

  @Post('history/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认告警' })
  @ApiResponse({ status: 200, description: '确认成功' })
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.alertService.acknowledgeAlert(id, userId);
  }

  @Post('history/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '解决告警' })
  @ApiResponse({ status: 200, description: '解决成功' })
  async resolveAlert(@Param('id') id: string) {
    return this.alertService.resolveAlert(id);
  }
}
