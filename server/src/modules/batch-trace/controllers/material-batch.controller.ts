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

@Controller('api/v1/material-batches')
export class MaterialBatchController {
  constructor(private readonly materialBatchService: MaterialBatchService) {}

  @Get()
  findAll(@Query('materialId') materialId?: string) {
    return this.materialBatchService.findAll(materialId);
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
