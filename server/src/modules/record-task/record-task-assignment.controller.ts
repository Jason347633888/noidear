import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RecordTaskAssignmentService, CreateAssignmentDto } from './record-task-assignment.service';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';

@ModuleKey('work_execution')
@ApiTags('任务派发')
@Controller('record-task-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecordTaskAssignmentController {
  constructor(private readonly assignmentService: RecordTaskAssignmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建任务配置（管理员）' })
  create(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    return this.assignmentService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '列表（管理员看全部；员工看本部门）' })
  findAll(@Req() req: any) {
    const isAdmin = req.user?.roleCode === 'admin';
    return this.assignmentService.findAll(req.user.id, isAdmin);
  }

  @Get(':id')
  @ApiOperation({ summary: '任务配置详情' })
  findOne(@Param('id') id: string) {
    return this.assignmentService.findOne(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '暂停任务配置' })
  pause(@Param('id') id: string) {
    return this.assignmentService.pause(id);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '恢复任务配置' })
  resume(@Param('id') id: string) {
    return this.assignmentService.resume(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '关闭任务配置' })
  close(@Param('id') id: string) {
    return this.assignmentService.close(id);
  }
}
