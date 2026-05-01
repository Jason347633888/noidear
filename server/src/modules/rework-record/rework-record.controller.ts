import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReworkRecordService } from './rework-record.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('rework-records')
@UseGuards(JwtAuthGuard)
export class ReworkRecordController {
  constructor(private service: ReworkRecordService) {}

  @Post()
  create(@Body() dto: CreateReworkRecordDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.service.findAll(req.user.companyId, startDate, endDate);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.companyId);
  }
}
