import { ModuleKey } from '../../../shared/decorators/module-key.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MaterialBatchService } from '../services/material-batch.service';

@ModuleKey('traceability_batch')
@Controller('batch-trace/material-batches')
export class MaterialBatchController {
  constructor(private readonly materialBatchService: MaterialBatchService) {}

  @Get()
  findAll(
    @Query('materialId') materialId?: string,
    @Query('keyword') keyword?: string,
    @Query('limit') limit?: string,
  ) {
    return this.materialBatchService.findAll({
      materialId,
      keyword,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialBatchService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.materialBatchService.update(id, updateDto);
  }
}
