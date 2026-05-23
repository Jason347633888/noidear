import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { MedicationRecordService } from './medication-record.service';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ModuleKey('quality_compliance')
@Controller('medication-records')
@UseGuards(JwtAuthGuard)
export class MedicationRecordController {
  constructor(private service: MedicationRecordService) {}

  @Post()
  create(
    @Body() dto: CreateMedicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Query('employee_id') employeeId?: string,
    @Query('fit_for_duty') fitForDuty?: string,
  ) {
    const fitForDutyBool =
      fitForDuty === 'true' ? true : fitForDuty === 'false' ? false : undefined;
    return this.service.findAll(employeeId, fitForDutyBool);
  }
}
