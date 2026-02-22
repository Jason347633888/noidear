import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BatchMaterialUsageService } from '../services/batch-material-usage.service';

@Controller('batch-material-usage')
export class BatchMaterialUsageController {
  constructor(private readonly batchMaterialUsageService: BatchMaterialUsageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: any) {
    return this.batchMaterialUsageService.create(createDto);
  }

  @Get('production-batches/:id/materials')
  getProductionBatchMaterials(@Param('id') id: string) {
    return this.batchMaterialUsageService.getProductionBatchMaterials(id);
  }
}
