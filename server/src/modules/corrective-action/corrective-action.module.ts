import { Module, OnModuleInit } from '@nestjs/common';
import { CorrectiveActionController } from './corrective-action.controller';
import { CorrectiveActionService } from './corrective-action.service';
import { VerificationRecordService } from './verification-record.service';
import { CapaAnalyticsService } from './capa-analytics.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';

@Module({
  imports: [UnifiedApprovalModule, QualityNumberSequenceModule],
  controllers: [CorrectiveActionController],
  providers: [CorrectiveActionService, VerificationRecordService, CapaAnalyticsService],
  exports: [CorrectiveActionService, VerificationRecordService, CapaAnalyticsService],
})
export class CorrectiveActionModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('capa.verificationApproved', async (context: any) => {
      await context.tx.correctiveAction.update({
        where: { id: context.resourceId },
        data: {
          status: 'closed',
          verified_at: new Date(),
          closed_at: new Date(),
        },
      });
    });
  }
}
