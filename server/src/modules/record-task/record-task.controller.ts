import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecordTaskAssignmentService, CreateAssignmentDto } from './record-task-assignment.service';
import { RecordTaskInstanceService } from './record-task-instance.service';

@ApiTags('任务派发')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordTaskController {
  constructor(
    private readonly assignmentService: RecordTaskAssignmentService,
    private readonly instanceService: RecordTaskInstanceService,
  ) {}

  @Post('record-task-assignments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建任务配置（管理员）' })
  create(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    return this.assignmentService.create(dto, req.user.id);
  }

  @Get('record-task-assignments')
  @ApiOperation({ summary: '列表（管理员看全部；员工看本部门）' })
  findAll(@Req() req: any) {
    const isAdmin = req.user?.role === 'admin';
    return this.assignmentService.findAll(req.user.userId, isAdmin);
  }

  @Get('record-task-assignments/:id')
  @ApiOperation({ summary: '任务配置详情' })
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }

  @Post('record-task-assignments/:id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '暂停任务配置' })
  pause(@Param('id') id: string) {
    return this.assignmentService.pause(id);
  }

  @Post('record-task-assignments/:id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '恢复任务配置' })
  resume(@Param('id') id: string) {
    return this.assignmentService.resume(id);
  }

  @Post('record-task-assignments/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '关闭任务配置' })
  close(@Param('id') id: string) {
    return this.assignmentService.close(id);
  }

  @Get('record-task-instances/pending')
  @ApiOperation({ summary: '员工查看本部门待填实例' })
  findPending(@Req() req: any, @Query() query: { page?: string; limit?: string }) {
    return this.instanceService.findPending(
      req.user.userId ?? req.user.id,
      query.page ? Number(query.page) : 1,
      query.limit ? Number(query.limit) : 20,
    );
  }

  @Get('record-task-instances/:id')
  @ApiOperation({ summary: '任务实例详情' })
  findInstance(@Param('id') id: string) {
    return this.instanceService.findOne(id);
  }
}
