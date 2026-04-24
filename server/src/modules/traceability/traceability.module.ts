import { Module } from '@nestjs/common';
import { TraceabilityController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';
import { TraceabilityQueryService } from './traceability-query.service';
import { TraceabilityBalanceService } from './traceability-balance.service';
import { TraceabilityLinkageService } from './traceability-linkage.service';
import { TraceabilityExportService } from './traceability-export.service';
import { ModelLandingModule } from '../model-landing/model-landing.module';

@Module({
  imports: [ModelLandingModule],
  controllers: [TraceabilityController],
  providers: [
    TraceabilityService,
    TraceabilityQueryService,
    TraceabilityBalanceService,
    TraceabilityLinkageService,
    TraceabilityExportService,
  ],
  exports: [TraceabilityService, TraceabilityQueryService],
})
export class TraceabilityModule {}
