import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CcpService } from './ccp.service';
import { CreateCcpRecordDto } from './dto/create-ccp-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@ModuleKey('quality_compliance')
@Controller('ccp')
@UseGuards(JwtAuthGuard)
export class CcpController {
  constructor(private service: CcpService) {}

  @Post('records')
  createRecord(
    @Body() dto: CreateCcpRecordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createRecord(dto, req.user.id, req.user.companyId);
  }

  @Get('records/batch/:batchId')
  findByBatch(@Param('batchId') batchId: string, @Request() req: AuthenticatedRequest) {
    return this.service.findByBatch(batchId, req.user.companyId);
  }

  @Get('records/missing/:batchId')
  findMissingCCPs(@Param('batchId') batchId: string, @Request() req: AuthenticatedRequest) {
    return this.service.findMissingCCPs(batchId, req.user.companyId);
  }
}
