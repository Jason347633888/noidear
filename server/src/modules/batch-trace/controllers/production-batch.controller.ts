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
  UseGuards,
} from '@nestjs/common';
import { ProductionBatchService } from '../services/production-batch.service';
import {
  CreateProductionBatchDto,
  UpdateProductionBatchDto,
  QueryProductionBatchDto,
  ConfirmProductBatchDto,
} from '../dto/production-batch.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ModuleKey('production_execution')
@Controller('batch-trace/production-batches')
@UseGuards(JwtAuthGuard)
export class ProductionBatchController {
  constructor(private readonly productionBatchService: ProductionBatchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProductionBatchDto) {
    return this.productionBatchService.create(createDto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirmProductBatch(@Body() dto: ConfirmProductBatchDto) {
    return this.productionBatchService.confirmProductBatch(dto);
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
