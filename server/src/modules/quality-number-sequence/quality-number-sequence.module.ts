import { Module } from '@nestjs/common';
import { QualityNumberSequenceService } from './quality-number-sequence.service';

@Module({
  providers: [QualityNumberSequenceService],
  exports: [QualityNumberSequenceService],
})
export class QualityNumberSequenceModule {}
