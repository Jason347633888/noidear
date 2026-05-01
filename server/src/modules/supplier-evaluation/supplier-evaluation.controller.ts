import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { SupplierEvaluationService } from './supplier-evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('supplier-evaluations')
@UseGuards(JwtAuthGuard)
export class SupplierEvaluationController {
  constructor(private service: SupplierEvaluationService) {}

  @Post()
  create(@Body() dto: CreateEvaluationDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.companyId);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId);
  }

  @Get('supplier/:supplierId')
  findBySupplier(@Param('supplierId') supplierId: string, @Request() req: AuthenticatedRequest) {
    return this.service.findBySupplier(supplierId, req.user.companyId);
  }
}
