import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChangeComplianceRecordService } from './change-compliance-record.service';
import { CreateChangeComplianceRecordDto } from './dto/create-change-compliance-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('change-compliance-records')
@UseGuards(JwtAuthGuard)
export class ChangeComplianceRecordController {
  constructor(private service: ChangeComplianceRecordService) {}

  @Post()
  create(
    @Body() dto: CreateChangeComplianceRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('event/:eventId')
  findByEvent(@Param('eventId') eventId: string) {
    return this.service.findByEvent(eventId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
