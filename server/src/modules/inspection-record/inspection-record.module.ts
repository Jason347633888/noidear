import { Module } from '@nestjs/common';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
import { InspectionRecordController } from './inspection-record.controller';
import { InspectionRecordService } from './inspection-record.service';
import { QualityInspectionTaskController } from './quality-inspection-task.controller';
import { QualityInspectionTaskService } from './quality-inspection-task.service';

@Module({
  imports: [QualityNumberSequenceModule],
  controllers: [InspectionRecordController, QualityInspectionTaskController],
  providers: [InspectionRecordService, QualityInspectionTaskService],
  exports: [InspectionRecordService, QualityInspectionTaskService],
})
export class InspectionRecordModule {}
