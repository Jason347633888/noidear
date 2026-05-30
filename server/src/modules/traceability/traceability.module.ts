import { Module } from '@nestjs/common';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { TraceabilityDrillService } from './traceability-drill.service';
import { ProductRecallModule } from '../product-recall/product-recall.module';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [PrismaModule, ProductRecallModule, QualityNumberSequenceModule],
  controllers: [TraceabilityController],
  providers: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityLinkageService,
    TraceabilityExportService,
    TraceabilityBalanceService,
    TraceabilityDrillService,
  ],
  exports: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityExportService,
    TraceabilityBalanceService,
    TraceabilityDrillService,
  ],
})
export class TraceabilityModule {}
