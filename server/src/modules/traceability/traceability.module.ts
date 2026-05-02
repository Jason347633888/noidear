import { Module } from '@nestjs/common';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelLandingModule } from '../model-landing/model-landing.module';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { ProductRecallModule } from '../product-recall/product-recall.module';

@Module({
  imports: [PrismaModule, ModelLandingModule, ProductRecallModule],
  controllers: [TraceabilityController],
  providers: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityLinkageService,
    TraceabilityExportService,
    TraceabilityBalanceService,
  ],
  exports: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityExportService,
    TraceabilityBalanceService,
  ],
})
export class TraceabilityModule {}
