import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SupplierEvaluationService } from './supplier-evaluation.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('supplier-evaluations')
@UseGuards(JwtAuthGuard)
export class SupplierEvaluationController {
  constructor(private service: SupplierEvaluationService) {}

  @Post()
  create(@Body() dto: CreateEvaluationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('supplier/:supplierId')
  findBySupplier(@Param('supplierId') supplierId: string) {
    return this.service.findBySupplier(supplierId);
  }
}
