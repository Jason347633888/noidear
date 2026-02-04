import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OperationLogService } from './operation-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('操作日志')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operation-logs')
export class OperationLogController {
  constructor(private readonly logService: OperationLogService) {}

  @Get()
  @ApiOperation({ summary: '查询操作日志' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.logService.findAll(page, limit);
  }
}
