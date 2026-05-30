import { ModuleKey } from '../../shared/decorators/module-key.decorator';
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
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

@ApiTags('培训管理 - 学习记录')
@ModuleKey('training')
@Controller('training/records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get()
  @ApiOperation({ summary: '查询学习记录（按 ownership 范围）' })
  async findAll(@Ownership() ownership: OwnershipContext, @Query('projectId') projectId?: string) {
    return this.recordService.findAll(ownership, projectId);
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

  /**
   * UI "培训记录" — alias endpoint that maps LearningRecord rows to the
   * TrainingRecordAlias shape.  Path stays under training/records, no
   * separate /training-records route is created.
   */
  @Get('project/:projectId/training-summary')
  @ApiOperation({ summary: '查询培训记录（培训记录 UI 视角别名）' })
  async listTrainingRecordAliases(@Param('projectId') projectId: string) {
    return this.recordService.listTrainingRecordAliases(projectId);
  }
}
