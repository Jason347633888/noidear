import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerComplaintService } from './customer-complaint.service';
import { CreateComplaintDto, ResolveComplaintDto } from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customer-complaints')
@UseGuards(JwtAuthGuard)
export class CustomerComplaintController {
  constructor(private service: CustomerComplaintService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveComplaintDto) {
    return this.service.resolve(id, dto.resolution);
  }
}
