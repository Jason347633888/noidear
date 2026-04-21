import { Module } from '@nestjs/common';
import { ChangeComplianceRecordController } from './change-compliance-record.controller';
import { ChangeComplianceRecordService } from './change-compliance-record.service';

@Module({
  controllers: [ChangeComplianceRecordController],
  providers: [ChangeComplianceRecordService],
  exports: [ChangeComplianceRecordService],
})
export class ChangeComplianceRecordModule {}
