import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { ProductionPlanService } from './production-plan.service';
import { CreateProductionPlanDto } from './dto/production-plan.dto';

const DEFAULT_COMPANY_ID = '1';

@UseGuards(JwtAuthGuard)
@Controller('production-plans')
export class ProductionPlanController {
  constructor(private readonly service: ProductionPlanService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProductionPlanDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, DEFAULT_COMPANY_ID, req.user?.id);
  }

  @Post(':id/release')
  @UseGuards(RolesGuard)
  @Roles('admin')
  release(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.releasePlan(id, DEFAULT_COMPANY_ID, req.user?.id);
  }
}
