import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { TriggerBackupDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('备份管理')
@Controller('api/v1/backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '触发备份' })
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

  @Get('history')
  @ApiOperation({ summary: '查询备份历史' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async queryBackupHistory(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.backupService.queryBackupHistory(page || 1, limit || 20);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取备份统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getBackupStats() {
    return this.backupService.getBackupStats();
  }
}
