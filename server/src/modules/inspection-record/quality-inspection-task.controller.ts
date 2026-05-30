import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { QualityInspectionTaskService } from './quality-inspection-task.service';
import {
  CompleteInspectionTaskDto,
  CreateQualityInspectionTaskDto,
  ListWorkbenchTasksDto,
  SkipTaskDto,
} from './dto/create-quality-inspection-task.dto';

const DEFAULT_COMPANY_ID = '1';

@UseGuards(JwtAuthGuard)
@Controller('quality-inspection-tasks')
export class QualityInspectionTaskController {
  constructor(private readonly service: QualityInspectionTaskService) {}

  @Get()
  listWorkbench(@Query() query: ListWorkbenchTasksDto) {
    const dto: ListWorkbenchTasksDto = {
      ...query,
      company_id: DEFAULT_COMPANY_ID,
    };
    return this.service.listWorkbenchTasks(dto);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  addTask(@Body() dto: CreateQualityInspectionTaskDto) {
    const input: CreateQualityInspectionTaskDto = {
      ...dto,
      company_id: DEFAULT_COMPANY_ID,
    };
    return this.service.addInspectionTask({
      company_id: input.company_id,
      work_date: input.work_date,
      shift_type: input.shift_type,
      area_point_id: input.area_point_id,
      production_batch_id: input.production_batch_id,
      task_type: input.task_type,
      target_resource_type: input.target_resource_type,
      target_resource_id: input.target_resource_id,
      standard_id: input.standard_id,
      assignee_role: input.assignee_role,
      assignee_user_id: input.assignee_user_id,
      due_at: input.due_at,
    });
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteInspectionTaskDto) {
    return this.service.completeInspectionTask(
      id,
      dto.completed_resource_type,
      dto.completed_resource_id,
    );
  }

  @Patch(':id/skip')
  skip(@Param('id') id: string, @Body() dto: SkipTaskDto) {
    return this.service.skipTask(id, dto.skipped_reason);
  }
}
