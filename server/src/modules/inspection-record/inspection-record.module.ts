import { Module } from '@nestjs/common';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
import { InspectionRecordController } from './inspection-record.controller';
import { InspectionRecordService } from './inspection-record.service';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [InspectionRecordController],
  providers: [InspectionRecordService],
  exports: [InspectionRecordService],
})
export class InspectionRecordModule {}
