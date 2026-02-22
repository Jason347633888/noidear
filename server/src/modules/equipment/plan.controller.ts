import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { QueryPlanDto, CalendarQueryDto } from './dto/plan.dto';

@Controller('maintenance-plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll(@Query() query: QueryPlanDto) {
    return this.planService.findAll(query);
  }

  @Get('calendar')
  getCalendar(@Query() query: CalendarQueryDto) {
    return this.planService.getCalendarData(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.planService.startPlan(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.planService.completePlan(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.planService.cancelPlan(id);
  }
}
