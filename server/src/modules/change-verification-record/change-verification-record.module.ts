import { Module } from '@nestjs/common';
import { ChangeVerificationRecordController } from './change-verification-record.controller';
import { ChangeVerificationRecordService } from './change-verification-record.service';

@Module({
  controllers: [ChangeVerificationRecordController],
  providers: [ChangeVerificationRecordService],
  exports: [ChangeVerificationRecordService],
})
export class ChangeVerificationRecordModule {}
