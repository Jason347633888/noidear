import { Module } from '@nestjs/common';
import { BatchNumberGeneratorService } from './services/batch-number-generator.service';
import { ProductionBatchService } from './services/production-batch.service';
import { MaterialBatchService } from './services/material-batch.service';
import { BatchMaterialUsageService } from './services/batch-material-usage.service';
import { MaterialUsageService } from './services/material-usage.service';
import { TraceabilityService } from './services/traceability.service';
import { TraceExportService } from './services/trace-export.service';
import { BatchMixingAggregationService } from './services/batch-mixing-aggregation.service';
import { ProductionBatchController } from './controllers/production-batch.controller';
import { MaterialBatchController } from './controllers/material-batch.controller';
import { MaterialUsageController } from './controllers/material-usage.controller';
import { TraceController } from './controllers/trace.controller';
import { TraceExportController } from './controllers/trace-export.controller';
import { BatchMixingAggregationController } from './controllers/batch-mixing-aggregation.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProductionBatchController,
    MaterialBatchController,
    MaterialUsageController,
    TraceController,
    TraceExportController,
    BatchMixingAggregationController,
  ],
  providers: [
    BatchNumberGeneratorService,
    ProductionBatchService,
    MaterialBatchService,
    BatchMaterialUsageService,
    MaterialUsageService,
    TraceabilityService,
    TraceExportService,
    BatchMixingAggregationService,
  ],
  exports: [
    BatchNumberGeneratorService,
    ProductionBatchService,
    MaterialBatchService,
    BatchMaterialUsageService,
    MaterialUsageService,
    TraceabilityService,
    TraceExportService,
    BatchMixingAggregationService,
  ],
})
export class BatchTraceModule {}
