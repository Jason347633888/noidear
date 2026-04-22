import { Module } from '@nestjs/common';
import { CorrectiveActionController } from './corrective-action.controller';
import { CorrectiveActionService } from './corrective-action.service';
import { VerificationRecordService } from './verification-record.service';
import { CapaAnalyticsService } from './capa-analytics.service';

@Module({
  controllers: [CorrectiveActionController],
  providers: [CorrectiveActionService, VerificationRecordService, CapaAnalyticsService],
  exports: [CorrectiveActionService, VerificationRecordService, CapaAnalyticsService],
})
export class CorrectiveActionModule {}
