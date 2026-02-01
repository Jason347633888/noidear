import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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
  async create(@Body() dto: CreateTaskDto, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询任务列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAll(@Query() query: TaskQueryDto, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.findAll(query, user.id, user.role);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '待我审批' })
  async findPendingApprovals(@Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.findPendingApprovals(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务详情' })
  async findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  async cancel(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.cancel(id, user.id, user.role);
  }

  @Post('submit')
  @ApiOperation({ summary: '提交任务' })
  async submit(@Body() dto: SubmitTaskDto, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.submit(dto, user.id);
  }

  @Post('approve')
  @ApiOperation({ summary: '审批任务' })
  async approve(@Body() dto: ApproveTaskDto, @Body() body: Record<string, unknown>) {
    const user = JSON.parse(body.user as string || '{}');
    return this.taskService.approve(dto, user.id);
  }
}
