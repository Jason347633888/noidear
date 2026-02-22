import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowTaskService } from './workflow-task.service';
import { ApproveTaskDto } from './dto/approve-task.dto';
import { RejectTaskDto } from './dto/reject-task.dto';
import { QueryMyTasksDto } from './dto/query-my-tasks.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('工作流任务管理')
@Controller('workflow-tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkflowTaskController {
  constructor(private readonly taskService: WorkflowTaskService) {}

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '审批通过' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  approve(
    @Param('id') id: string,
    @Body() approveDto: ApproveTaskDto,
    @Request() req: any,
  ) {
    return this.taskService.approve(id, approveDto, req.user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '审批驳回' })
  @ApiResponse({ status: 200, description: '驳回成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  reject(
    @Param('id') id: string,
    @Body() rejectDto: RejectTaskDto,
    @Request() req: any,
  ) {
    return this.taskService.reject(id, rejectDto, req.user.id);
  }

  @Get('my-tasks')
  @ApiOperation({ summary: '查询我的待审批任务' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findMyTasks(@Query() query: QueryMyTasksDto, @Request() req: any) {
    return this.taskService.findMyTasks(query, req.user.id);
  }
}
