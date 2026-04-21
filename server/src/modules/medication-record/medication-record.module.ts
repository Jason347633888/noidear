import { Module } from '@nestjs/common';
import { MedicationRecordController } from './medication-record.controller';
import { MedicationRecordService } from './medication-record.service';

@Module({
  controllers: [MedicationRecordController],
  providers: [MedicationRecordService],
  exports: [MedicationRecordService],
})
export class MedicationRecordModule {}
