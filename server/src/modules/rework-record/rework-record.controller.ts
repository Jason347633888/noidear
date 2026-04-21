import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ReworkRecordService } from './rework-record.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rework-records')
@UseGuards(JwtAuthGuard)
export class ReworkRecordController {
  constructor(private service: ReworkRecordService) {}

  @Post()
  create(@Body() dto: CreateReworkRecordDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.service.findAll(startDate, endDate);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
