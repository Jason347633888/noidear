import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { TaskService } from './task.service';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto, BatchAssignTaskDto, ExportTaskDto } from './dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { DraftTaskDto } from './dto/draft-task.dto';
import { SubmitByIdDto } from './dto/submit-by-id.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from '../export/export.service';
import { ExportTaskRecordsDto } from '../export/dto';
import { StatisticsService } from '../statistics/statistics.service';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(StatisticsCacheInterceptor)
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly exportService: ExportService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: '创建任务' })
  async create(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.taskService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询任务列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAll(@Query() query: TaskQueryDto, @Req() req: any) {
    return this.taskService.findAll(query, req.user.id, req.user.role);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '待我审批' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findPendingApprovals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 20, 100);
    return this.taskService.findPendingApprovals(
      req.user.id,
      req.user.role,
      pageNum,
      limitNum,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.taskService.findOne(id, req.user.id, req.user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新任务' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: any,
  ) {
    return this.taskService.update(id, dto, req.user.id, req.user.role);
  }

  @Post('submit')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '提交任务（兼容旧接口）' })
  async submit(@Body() dto: SubmitTaskDto, @Req() req: any) {
    return this.taskService.submit(dto, req.user.id);
  }

  @Post('approve')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '审批任务' })
  async approve(@Body() dto: ApproveTaskDto, @Req() req: any) {
    return this.taskService.approve(dto, req.user.id);
  }

  @Post(':id/cancel')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '取消任务' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.taskService.cancel(id, req.user.id, req.user.role);
  }

  @Post(':id/draft')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: '保存草稿' })
  async saveDraft(
    @Param('id') id: string,
    @Body() dto: DraftTaskDto,
    @Req() req: any,
  ) {
    return this.taskService.saveDraft(id, dto, req.user.id);
  }

  @Post(':id/submit')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '提交任务（RESTful）' })
  async submitById(
    @Param('id') id: string,
    @Body() dto: SubmitByIdDto,
    @Req() req: any,
  ) {
    return this.taskService.submit(
      { taskId: id, data: dto.data, deviationReasons: dto.deviationReasons },
      req.user.id,
    );
  }

  @Post('batch-assign')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '批量分配任务' })
  async batchAssign(@Body() dto: BatchAssignTaskDto, @Req() req: any) {
    return this.taskService.batchAssign(dto, req.user.id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: '导出任务记录（单个任务）' })
  async exportTaskRecords(
    @Param('id') taskId: string,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      // HIGH-1: 传递用户信息进行权限过滤
      const buffer = await this.exportService.exportTaskRecords({ taskId }, req.user);
      const filename = `task_records_${taskId}_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message,
      });
    }
  }

  @Get('export')
  @ApiOperation({ summary: '批量导出任务记录' })
  async exportBatchTaskRecords(
    @Query() dto: ExportTaskRecordsDto,
    @Res() res: Response,
    @Req() req: any,
  ) {
    try {
      // HIGH-1: 传递用户信息进行权限过滤
      const buffer = await this.exportService.exportTaskRecords(dto, req.user);
      const filename = `task_records_batch_${Date.now()}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '导出失败',
        error: error.message,
      });
    }
  }
}
