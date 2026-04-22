import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CorrectiveActionService } from './corrective-action.service';
import { VerificationRecordService } from './verification-record.service';
import { CapaAnalyticsService } from './capa-analytics.service';
import { CreateCapaDto } from './dto/create-capa.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('corrective-actions')
@UseGuards(JwtAuthGuard)
export class CorrectiveActionController {
  constructor(
    private readonly service: CorrectiveActionService,
    private readonly verificationSvc: VerificationRecordService,
    private readonly analyticsSvc: CapaAnalyticsService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCapaDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  // analytics/trends must be BEFORE :id to avoid Express shadowing
  @Get('analytics/trends')
  getTrends(@Query('months') months?: string) {
    return this.analyticsSvc.getTrends(months ? parseInt(months, 10) : 6);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.service.updateStatus(id, status);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.close(id, req.user.id);
  }

  @Post(':id/verifications')
  createVerification(
    @Param('id') id: string,
    @Body() dto: CreateVerificationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.verificationSvc.createVerification(id, dto, req.user?.id ?? 'system');
  }

  @Get(':id/verifications')
  listVerifications(@Param('id') id: string) {
    return this.verificationSvc.listVerifications(id);
  }
}
