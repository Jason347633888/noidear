import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecordTaskAssignmentService, CreateAssignmentDto } from '../record-task/record-task-assignment.service';

@ApiTags('任务管理')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly recordTaskService: RecordTaskAssignmentService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  findAll() {
    return this.recordTaskService.findAll('', true);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.recordTaskService.findOne(id);
  }
}
