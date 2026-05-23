import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('审计日志')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
@Controller('permission-audit-logs')
export class PermissionLogReadonlyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '查询权限变更日志（只读）' })
  async list(@Query('limit') limit = '50') {
    return this.prisma.permissionLog.findMany({
      take: Math.min(Number(limit), 200),
      orderBy: { createdAt: 'desc' },
    });
  }
}
