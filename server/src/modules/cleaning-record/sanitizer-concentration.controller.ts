import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SanitizerConcentrationService } from './sanitizer-concentration.service';
import { CreateSanitizerConcentrationCheckDto } from './dto/sanitizer-concentration.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@ModuleKey('equipment_site')
@Controller('sanitizer-concentration-checks')
@UseGuards(JwtAuthGuard)
export class SanitizerConcentrationController {
  constructor(private readonly service: SanitizerConcentrationService) {}

  @Post()
  create(
    @Body() dto: CreateSanitizerConcentrationCheckDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.id, req.user.companyId);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('areaPointId') areaPointId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(req.user.companyId, areaPointId, from, to);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findById(id, req.user.companyId);
  }

  @Post(':id/non-conformance')
  createNonConformance(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.createNonConformance(id, req.user.id, req.user.companyId);
  }
}
