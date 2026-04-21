import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CcpService } from './ccp.service';
import { CreateCcpRecordDto } from './dto/create-ccp-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ccp')
@UseGuards(JwtAuthGuard)
export class CcpController {
  constructor(private service: CcpService) {}

  @Post('records')
  createRecord(
    @Body() dto: CreateCcpRecordDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.createRecord(dto, req.user.id);
  }

  @Get('records/batch/:batchId')
  findByBatch(@Param('batchId') batchId: string) {
    return this.service.findByBatch(batchId);
  }

  @Get('records/missing/:batchId')
  findMissingCCPs(@Param('batchId') batchId: string) {
    return this.service.findMissingCCPs(batchId);
  }
}
