import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { TriggerBackupDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('备份管理')
@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '触发备份（通用，按 backupType 参数区分）' })
  @ApiResponse({ status: 200, description: '备份触发成功' })
  async triggerBackup(@Body() dto: TriggerBackupDto) {
    if (dto.backupType === 'postgres' || dto.backupType === 'all') {
      await this.backupService.triggerPostgresBackup();
    }
    if (dto.backupType === 'minio' || dto.backupType === 'all') {
      await this.backupService.triggerMinIOBackup();
    }
    return { success: true, message: 'Backup triggered successfully' };
  }

  @Post('postgres/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '触发 PostgreSQL 备份' })
  @ApiResponse({ status: 200, description: 'PostgreSQL 备份触发成功' })
  async triggerPostgresBackup() {
    const result = await this.backupService.triggerPostgresBackup();
    return { message: 'PostgreSQL backup triggered', ...result };
  }

  @Post('minio/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '触发 MinIO 备份' })
  @ApiResponse({ status: 200, description: 'MinIO 备份触发成功' })
  async triggerMinIOBackup() {
    const result = await this.backupService.triggerMinIOBackup();
    return { message: 'MinIO backup triggered', ...result };
  }

  @Get('history')
  @ApiOperation({ summary: '查询备份历史' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryBackupHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('backupType') backupType?: string,
  ) {
    return this.backupService.queryBackupHistory(page || 1, limit || 20, backupType);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取备份统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除备份记录' })
  @ApiParam({ name: 'id', description: '备份记录 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '备份记录不存在' })
  async deleteBackup(@Param('id') id: string) {
    return this.backupService.deleteBackup(id);
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询可用于恢复的备份列表（恢复备份）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async listAvailableForRestore(
    @Body('backupType') backupType?: string,
    @Body('limit') limit?: number,
  ) {
    return this.backupService.listAvailableForRestore(backupType, limit || 10);
  }
}
