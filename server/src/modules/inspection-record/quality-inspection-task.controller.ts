import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { QualityInspectionTaskService } from './quality-inspection-task.service';
import {
  CompleteInspectionTaskDto,
  CreateQualityInspectionTaskDto,
  ListWorkbenchTasksDto,
  SkipTaskDto,
} from './dto/create-quality-inspection-task.dto';

@UseGuards(JwtAuthGuard)
@Controller('quality-inspection-tasks')
export class QualityInspectionTaskController {
  constructor(private readonly service: QualityInspectionTaskService) {}

  @Get()
  listWorkbench(@Query() query: ListWorkbenchTasksDto, @Request() req: AuthenticatedRequest) {
    const dto: ListWorkbenchTasksDto = {
      ...query,
      company_id: req.user.companyId,
    };
    return this.service.listWorkbenchTasks(dto);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  addTask(@Body() dto: CreateQualityInspectionTaskDto, @Request() req: AuthenticatedRequest) {
    return this.service.addInspectionTask({
      company_id: req.user.companyId,
      work_date: dto.work_date,
      shift_type: dto.shift_type,
      area_point_id: dto.area_point_id,
      production_batch_id: dto.production_batch_id,
      task_type: dto.task_type,
      target_resource_type: dto.target_resource_type,
      target_resource_id: dto.target_resource_id,
      standard_id: dto.standard_id,
      assignee_role: dto.assignee_role,
      assignee_user_id: dto.assignee_user_id,
      due_at: dto.due_at,
    });
  }

  @Patch(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteInspectionTaskDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.completeInspectionTask(
      id,
      dto.completed_resource_type,
      dto.completed_resource_id,
      req.user.companyId,
    );
  }

  @Patch(':id/skip')
  skip(@Param('id') id: string, @Body() dto: SkipTaskDto, @Request() req: AuthenticatedRequest) {
    return this.service.skipTask(id, dto.skipped_reason, req.user.companyId);
  }
}
