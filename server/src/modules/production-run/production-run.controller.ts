import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ProductionRunService } from './production-run.service';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@ModuleKey('production_execution')
@Controller('production-runs')
export class ProductionRunController {
  constructor(private readonly svc: ProductionRunService) {}

  @Post()
  create(@Body() dto: CreateProductionRunDto) {
    return this.svc.create(dto);
  }

  @Get()
  findByShift(@Query('shift_instance_id') shiftInstanceId: string) {
    return this.svc.findByShift(shiftInstanceId);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseProductionRunDto) {
    return this.svc.close(id, dto);
  }
}
