import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ArchiveService } from './archive.service';

@ApiTags('培训管理 - 培训档案')
@Controller('training/archive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Post(':projectId')
  @ApiOperation({ summary: '生成培训档案' })
  async generateArchive(@Param('projectId') projectId: string, @Request() req: any) {
    return this.archiveService.generateArchive(projectId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询培训档案列表' })
  async findArchives(@Query('projectId') projectId?: string) {
    return this.archiveService.findArchives(projectId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: '下载培训档案 PDF' })
  async downloadArchivePDF(@Param('id') id: string) {
    return this.archiveService.downloadArchivePDF(id);
  }
}
