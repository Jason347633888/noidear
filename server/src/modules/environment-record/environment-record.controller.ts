import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EnvironmentRecordService } from './environment-record.service';
import { CreateEnvironmentRecordDto } from './dto/create-environment-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('environment-records')
@UseGuards(JwtAuthGuard)
export class EnvironmentRecordController {
  constructor(private service: EnvironmentRecordService) {}

  @Post()
  create(
    @Body() dto: CreateEnvironmentRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.service.findAll(startDate, endDate);
  }
}
