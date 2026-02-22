import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecordService } from './record.service';

@ApiTags('培训管理 - 学习记录')
@Controller('training/records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get()
  @ApiOperation({ summary: '查询项目学习记录' })
  async findProjectRecords(@Query('projectId') projectId: string, @Request() req: any) {
    return this.recordService.findProjectRecords(projectId, req.user.id);
  }

  @Get('my')
  @ApiOperation({ summary: '查询我的学习记录' })
  async findMyRecords(@Request() req: any) {
    return this.recordService.findMyRecords(req.user.id);
  }

  @Get(':id/exams')
  @ApiOperation({ summary: '查询考试记录历史' })
  async findExamRecords(@Param('id') id: string, @Request() req: any) {
    return this.recordService.findExamRecords(id, req.user.id);
  }
}
