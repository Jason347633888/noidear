import { ModuleKey } from '../../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BatchMaterialUsageService } from '../services/batch-material-usage.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ModuleKey('traceability_batch')
@Controller('batch-trace')
@UseGuards(JwtAuthGuard)
export class BatchMaterialUsageController {
  constructor(private readonly batchMaterialUsageService: BatchMaterialUsageService) {}

  @Post('batch-material-usage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: any) {
    return this.batchMaterialUsageService.create(createDto);
  }

  @Get('batch-material-usage/production-batches/:id/materials')
  getProductionBatchMaterials(@Param('id') id: string) {
    return this.batchMaterialUsageService.getProductionBatchMaterials(id);
  }

  @Get('material-batches/:id/usages')
  getMaterialBatchUsages(@Param('id') id: string) {
    return this.batchMaterialUsageService.getMaterialBatchUsages(id);
  }
}
