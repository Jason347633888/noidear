import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ViolationRecordService } from './violation-record.service';
import { CreateViolationDto } from './dto/create-violation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('violation-records')
@UseGuards(JwtAuthGuard)
export class ViolationRecordController {
  constructor(private service: ViolationRecordService) {}

  @Post()
  create(
    @Body() dto: CreateViolationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('employee_id') employeeId?: string) {
    return this.service.findAll(employeeId);
  }
}
