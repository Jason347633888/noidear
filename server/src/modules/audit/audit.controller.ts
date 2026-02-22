import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuditService } from './audit.service';
import {
  CreateLoginLogDto,
  CreatePermissionLogDto,
  CreateSensitiveLogDto,
  QueryLoginLogDto,
  QueryPermissionLogDto,
  QuerySensitiveLogDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CheckPermission } from '../../common/decorators/permission.decorator';

@ApiTags('审计日志')
@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('login-logs')
  @CheckPermission('audit:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '记录登录日志（仅内部服务调用）' })
  @ApiResponse({ status: 201, description: '登录日志记录成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  async createLoginLog(@Body() dto: CreateLoginLogDto) {
    return this.auditService.createLoginLog(dto);
  }

  @Post('permission-logs')
  @CheckPermission('audit:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '记录权限变更日志（仅管理员）' })
  @ApiResponse({ status: 201, description: '权限变更日志记录成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  async createPermissionLog(@Body() dto: CreatePermissionLogDto) {
    return this.auditService.createPermissionLog(dto);
  }

  @Post('sensitive-logs')
  @CheckPermission('audit:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '记录敏感操作日志（仅内部服务调用）' })
  @ApiResponse({ status: 201, description: '敏感操作日志记录成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限' })
  async createSensitiveLog(@Body() dto: CreateSensitiveLogDto) {
    return this.auditService.createSensitiveLog(dto);
  }

  @Post('login-logs/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询登录日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryLoginLogs(@Body() dto: QueryLoginLogDto) {
    return this.auditService.queryLoginLogs(dto);
  }

  @Post('permission-logs/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询权限变更日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryPermissionLogs(@Body() dto: QueryPermissionLogDto) {
    return this.auditService.queryPermissionLogs(dto);
  }

  @Post('sensitive-logs/query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询敏感操作日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async querySensitiveLogs(@Body() dto: QuerySensitiveLogDto) {
    return this.auditService.querySensitiveLogs(dto);
  }

  @Get('login-logs/export')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // HIGH-4: 限制导出频率
  @ApiOperation({ summary: '导出登录日志为 Excel' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportLoginLogs(@Query() dto: QueryLoginLogDto, @Res() res: Response) {
    const buffer = await this.auditService.exportLoginLogs(dto);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=login-logs-${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get('permission-logs/export')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // HIGH-4: 限制导出频率
  @ApiOperation({ summary: '导出权限变更日志为 Excel' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportPermissionLogs(@Query() dto: QueryPermissionLogDto, @Res() res: Response) {
    const buffer = await this.auditService.exportPermissionLogs(dto);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=permission-logs-${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get('sensitive-logs/export')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // HIGH-4: 限制导出频率
  @ApiOperation({ summary: '导出敏感操作日志为 Excel' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async exportSensitiveLogs(@Query() dto: QuerySensitiveLogDto, @Res() res: Response) {
    const buffer = await this.auditService.exportSensitiveLogs(dto);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sensitive-logs-${Date.now()}.xlsx`);
    res.send(buffer);
  }

  @Get('login-logs/stats')
  @ApiOperation({ summary: '获取登录统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getLoginStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.getLoginStats(new Date(startDate), new Date(endDate));
  }

  @Get('sensitive-logs/stats')
  @ApiOperation({ summary: '获取敏感操作统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getSensitiveStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.getSensitiveStats(new Date(startDate), new Date(endDate));
  }

  @Get('dashboard')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // HIGH-4: 限制仪表板刷新频率
  @ApiOperation({ summary: '获取审计仪表板' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getDashboard() {
    return this.auditService.getDashboard();
  }

  @Get('timeline/:userId')
  @ApiOperation({ summary: '获取用户操作时间线' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getUserTimeline(@Query('userId') userId: string) {
    return this.auditService.getUserTimeline(userId);
  }

  @Get('brcgs-report')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // HIGH-4: 限制报告生成频率
  @ApiOperation({ summary: '生成 BRCGS 合规报告' })
  @ApiResponse({ status: 200, description: '生成成功' })
  async generateBRCGSReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.auditService.generateBRCGSReport(new Date(startDate), new Date(endDate));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=brcgs-report-${Date.now()}.xlsx`);
    res.send(buffer);
  }
}
