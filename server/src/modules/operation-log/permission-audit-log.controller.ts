import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OperationLogService } from './operation-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('权限审计日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('permission-audit-logs')
export class PermissionAuditLogController {
  constructor(private readonly logService: OperationLogService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '查询权限审计日志' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'username', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('username') username?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.logService.findPermissionLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      username,
      action,
      startDate,
      endDate,
    });
  }

  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: '导出权限审计日志（Excel）' })
  async export(
    @Res() res: Response,
    @Query('username') username?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.logService.exportPermissionLogs({
      username,
      action,
      startDate,
      endDate,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="permission-audit-logs.xlsx"`,
    );
    res.end(buffer);
  }
}
