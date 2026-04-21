import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FragileItemInspectionService } from './fragile-item-inspection.service';
import { CreateFragileItemInspectionDto } from './dto/create-fragile-item-inspection.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fragile-item-inspections')
@UseGuards(JwtAuthGuard)
export class FragileItemInspectionController {
  constructor(private service: FragileItemInspectionService) {}

  @Post()
  create(@Body() dto: CreateFragileItemInspectionDto) {
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
