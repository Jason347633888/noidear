import { Module } from '@nestjs/common';
import { LaundryRecordController } from './laundry-record.controller';
import { LaundryRecordService } from './laundry-record.service';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [LaundryRecordController],
  providers: [LaundryRecordService],
  exports: [LaundryRecordService],
})
export class LaundryRecordModule {}
