import { ModuleKey } from '../../../shared/decorators/module-key.decorator';
import { Ownership } from '../../../shared/decorators/ownership.decorator';
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
import { OwnershipContext } from '../../module-access/ownership-context';

@ModuleKey('traceability_batch')
@Controller('batch-trace')
@UseGuards(JwtAuthGuard)
export class BatchMaterialUsageController {
  constructor(private readonly batchMaterialUsageService: BatchMaterialUsageService) {}

  @Post('batch-material-usage')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: any, @Ownership() ownership: OwnershipContext) {
    return this.batchMaterialUsageService.create(createDto, ownership);
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
