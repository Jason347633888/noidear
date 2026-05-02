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
import { CapaTriggerType, CreateCapaDto } from './dto/create-capa.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

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
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.id, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('trigger_type') triggerType?: CapaTriggerType,
    @Query('trigger_id') triggerId?: string,
  ) {
    return this.service.findAll(req.user.companyId, {
      status,
      triggerType,
      triggerId,
    });
  }

  // analytics/trends must be BEFORE :id to avoid Express shadowing
  @Get('analytics/trends')
  getTrends(@Request() req: AuthenticatedRequest, @Query('months') months?: string) {
    return this.analyticsSvc.getTrends(req.user.companyId, months ? parseInt(months, 10) : 6);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findById(id, req.user.companyId);
  }

  @Patch(':id')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateStatus(id, status, req.user.companyId);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.close(id, req.user.id, req.user.companyId);
  }

  @Post(':id/verifications')
  createVerification(
    @Param('id') id: string,
    @Body() dto: CreateVerificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.verificationSvc.createVerification(id, dto, req.user.id, req.user.companyId);
  }

  @Get(':id/verifications')
  listVerifications(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.verificationSvc.listVerifications(id, req.user.companyId);
  }
}
