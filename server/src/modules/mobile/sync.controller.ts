import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SyncService } from './sync.service';
import { BatchSyncDto, BatchSyncResponseDto, SyncStatusResponseDto } from './dto';

@ApiTags('移动端-离线同步')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({ summary: '批量同步表单记录（离线数据上传）' })
  async batchSync(
    @Body() dto: BatchSyncDto,
    @Req() req: { user: { id: string } },
  ): Promise<BatchSyncResponseDto> {
    return this.syncService.batchSync(dto, req.user.id);
  }

  @Get('status')
  @ApiOperation({ summary: '查询同步状态' })
  async getSyncStatus(
    @Req() req: { user: { id: string } },
  ): Promise<SyncStatusResponseDto> {
    return this.syncService.getSyncStatus(req.user.id);
  }
}
