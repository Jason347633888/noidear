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
import { ProductionBatchService } from '../services/production-batch.service';
import {
  CreateProductionBatchDto,
  UpdateProductionBatchDto,
  QueryProductionBatchDto,
} from '../dto/production-batch.dto';

@Controller('api/v1/production-batches')
export class ProductionBatchController {
  constructor(private readonly productionBatchService: ProductionBatchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProductionBatchDto) {
    return this.productionBatchService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryProductionBatchDto) {
    return this.productionBatchService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionBatchService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProductionBatchDto) {
    return this.productionBatchService.update(id, updateDto);
  }
}
