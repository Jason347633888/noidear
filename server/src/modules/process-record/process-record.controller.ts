import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProcessRecordService } from './process-record.service';
import { CreateProcessRecordDto } from './dto/create-process-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('process-records')
@UseGuards(JwtAuthGuard)
export class ProcessRecordController {
  constructor(private service: ProcessRecordService) {}

  @Post()
  create(@Body() dto: CreateProcessRecordDto, @Request() req: { user: { id: string } }) {
    return this.service.create(dto, req.user.id);
  }

  @Get('batch/:batchId')
  findByBatch(@Param('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }
}
