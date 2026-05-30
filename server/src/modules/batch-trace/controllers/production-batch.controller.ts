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
  Request,
} from '@nestjs/common';
import { ProductionBatchService } from '../services/production-batch.service';
import {
  CreateProductionBatchDto,
  UpdateProductionBatchDto,
  QueryProductionBatchDto,
  ConfirmProductBatchDto,
} from '../dto/production-batch.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Ownership } from '../../../shared/decorators/ownership.decorator';
import type { OwnershipContext } from '../../module-access/ownership-context';
import { AuthenticatedRequest } from '../../auth/authenticated-user';

@ModuleKey('production_execution')
@Controller('batch-trace/production-batches')
@UseGuards(JwtAuthGuard)
export class ProductionBatchController {
  constructor(private readonly productionBatchService: ProductionBatchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProductionBatchDto, @Request() req: AuthenticatedRequest) {
    return this.productionBatchService.create(createDto, req.user.id);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirmProductBatch(@Body() dto: ConfirmProductBatchDto, @Request() req: AuthenticatedRequest) {
    return this.productionBatchService.confirmProductBatch(dto, req.user.id);
  }

  @Get()
  findAll(@Query() query: QueryProductionBatchDto, @Ownership() ownership: OwnershipContext) {
    return this.productionBatchService.findAll(query, ownership);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionBatchService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateProductionBatchDto) {
    return this.productionBatchService.update(id, updateDto);
  }

  @Post(':id/release-readiness')
  getReleaseReadiness(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.productionBatchService.getReleaseReadiness(id, undefined, req.user.companyId);
  }

  @Post(':id/release')
  releaseBatch(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.productionBatchService.releaseProductionBatch(id, req.user.id, req.user.companyId);
  }
}
