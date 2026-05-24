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
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BatchMixingAggregationService } from '../services/batch-mixing-aggregation.service';
import {
  CreateBatchMixingAggregationDto,
  ConfirmBatchMixingAggregationDto,
} from '../dto/batch-mixing-aggregation.dto';

@ModuleKey('production_execution')
@Controller('batch-trace/batch-mixing-aggregations')
@UseGuards(JwtAuthGuard)
export class BatchMixingAggregationController {
  constructor(private readonly service: BatchMixingAggregationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBatchMixingAggregationDto) {
    return this.service.create(dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmBatchMixingAggregationDto) {
    return this.service.confirm(dto);
  }

  @Get('by-product-batch/:productionBatchId')
  findByProductBatch(@Param('productionBatchId') productionBatchId: string) {
    return this.service.findByProductBatch(productionBatchId);
  }
}
