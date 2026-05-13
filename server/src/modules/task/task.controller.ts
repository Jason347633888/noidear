import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { SaveTaskDraftDto } from './dto/save-task-draft.dto';
import { LegacySubmitTaskDto } from './dto/legacy-submit-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';

@ApiTags('任务管理')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建任务' })
  create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.taskService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  findAll(@Query() query: QueryTaskDto, @Request() req: any) {
    return this.taskService.findAll(req.user.id, query);
  }

  // Fixed-path routes MUST be declared before the :id parameter route
  @Get('pending-approvals')
  @ApiOperation({ summary: '获取待审批列表' })
  getPendingApprovals(@Query() query: QueryTaskDto) {
    return this.taskService.getPendingApprovals(query);
  }

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '提交任务（legacy）' })
  legacySubmit(@Body() dto: LegacySubmitTaskDto, @Request() req: any) {
    const submitDto: SubmitTaskDto = {
      data: dto.data,
      deviationReasons: dto.deviationReasons,
    };
    return this.taskService.submit(dto.taskId, submitDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.taskService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新任务' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    return this.taskService.update(id, dto, req.user.id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '提交任务记录' })
  submitTask(@Param('id') id: string, @Body() dto: SubmitTaskDto, @Request() req: any) {
    return this.taskService.submit(id, dto, req.user.id);
  }

  @Post(':id/draft')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '保存任务草稿' })
  saveDraft(@Param('id') id: string, @Body() dto: SaveTaskDraftDto, @Request() req: any) {
    return this.taskService.saveDraft(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '取消任务' })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.taskService.cancel(id, req.user.id);
  }
}
