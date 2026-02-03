import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto, TaskQueryDto, SubmitTaskDto, ApproveTaskDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('任务管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
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
  async findPendingApprovals(@Req() req: any) {
    return this.taskService.findPendingApprovals(req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  async findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.taskService.cancel(id, req.user.id, req.user.role);
  }

  @Post('submit')
  @ApiOperation({ summary: '提交任务' })
  async submit(@Body() dto: SubmitTaskDto, @Req() req: any) {
    return this.taskService.submit(dto, req.user.id);
  }

  @Post('approve')
  @ApiOperation({ summary: '审批任务' })
  async approve(@Body() dto: ApproveTaskDto, @Req() req: any) {
    return this.taskService.approve(dto, req.user.id);
  }
}
