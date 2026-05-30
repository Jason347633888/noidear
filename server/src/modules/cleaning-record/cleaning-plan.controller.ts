import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CleaningPlanService } from './cleaning-plan.service';
import { CreateCleaningPlanTemplateDto, CloneTemplateToPlanDto } from './dto/cleaning-plan.dto';

@ModuleKey('equipment_site')
@Controller('cleaning-plans')
@UseGuards(JwtAuthGuard)
export class CleaningPlanController {
  constructor(private readonly service: CleaningPlanService) {}

  // ── Templates ───────────────────────────────────────────────────────────────

  @Post('templates')
  createTemplate(
    @Body() dto: CreateCleaningPlanTemplateDto,
    @Request() req: { user: { company_id: string } },
  ) {
    return this.service.createTemplate({
      ...dto,
      company_id: req.user.company_id ?? '1',
      effective_from: dto.effective_from ? new Date(dto.effective_from) : undefined,
    });
  }

  @Get('templates')
  listTemplates(
    @Request() req: { user: { company_id: string } },
    @Query('area_type') areaType?: string,
  ) {
    return this.service.listTemplates(req.user.company_id ?? '1', areaType);
  }

  // ── Plans ───────────────────────────────────────────────────────────────────

  @Post('clone')
  cloneTemplateToArea(@Body() dto: CloneTemplateToPlanDto) {
    return this.service.cloneTemplateToArea(
      dto.template_id,
      dto.area_point_id,
      dto.version,
      new Date(dto.effective_from),
      dto.frequency,
    );
  }

  @Post(':id/activate')
  activatePlan(@Param('id') id: string) {
    return this.service.activatePlan(id);
  }

  @Get('active')
  listActivePlans(@Query('area_point_id') areaPointId?: string) {
    return this.service.listActivePlans(areaPointId);
  }
}
