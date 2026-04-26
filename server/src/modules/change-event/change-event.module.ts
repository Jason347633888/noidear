import { Module, OnModuleInit } from '@nestjs/common';
import { ChangeEventController } from './change-event.controller';
import { ChangeEventService } from './change-event.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [UnifiedApprovalModule],
  controllers: [ChangeEventController],
  providers: [ChangeEventService],
  exports: [ChangeEventService],
})
export class ChangeEventModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('changeEvent.approvalApproved', async (context: any) => {
      await (context.tx as any).changeApproval.updateMany({
        where: { change_event_id: context.resourceId },
        data: {
          approver_id: context.actorId,
          decision: 'approved',
          comments: context.comment,
          approved_at: new Date(),
        },
      });
    });
  }
}
