import { Module } from '@nestjs/common';
import { NonConformanceController } from './non-conformance.controller';
import { NonConformanceService } from './non-conformance.service';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [NonConformanceController],
  providers: [NonConformanceService],
  exports: [NonConformanceService],
})
export class NonConformanceModule {}
