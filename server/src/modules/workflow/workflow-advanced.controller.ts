import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkflowAdvancedService } from './workflow-advanced.service';
import { DelegateTaskDto } from './dto/delegate-task.dto';
import { RollbackTaskDto } from './dto/rollback-task.dto';
import { TransferTaskDto } from './dto/transfer-task.dto';

@ApiTags('高级工作流引擎')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/workflow')
export class WorkflowAdvancedController {
  constructor(private readonly service: WorkflowAdvancedService) {}

  @Post('tasks/:id/delegate')
  @ApiOperation({ summary: '委托审批任务' })
  async delegate(
    @Param('id') id: string,
    @Body() dto: DelegateTaskDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.delegateTask(id, dto, req.user.sub);
  }

  @Post('tasks/:id/rollback')
  @ApiOperation({ summary: '回退审批任务' })
  async rollback(
    @Param('id') id: string,
    @Body() dto: RollbackTaskDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.rollbackTask(id, dto, req.user.sub);
  }

  @Post('tasks/:id/transfer')
  @ApiOperation({ summary: '转办审批任务' })
  async transfer(
    @Param('id') id: string,
    @Body() dto: TransferTaskDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.transferTask(id, dto, req.user.sub);
  }

  @Get('delegation-logs')
  @ApiOperation({ summary: '查询委托日志' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDelegationLogs(
    @Query('taskId') taskId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getDelegationLogs(taskId, page ? +page : 1, limit ? +limit : 20);
  }
}
