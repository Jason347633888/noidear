import { forwardRef, Inject, Module, OnModuleInit } from '@nestjs/common';
import { ChangeEventController } from './change-event.controller';
import { ChangeEventService } from './change-event.service';
import { ChangeEventFormTaskService } from './change-event-form-task.service';
import { ChangeEventRelationService } from './change-event-relation.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { RecordModule } from '../record/record.module';
import { ProductProcessChangeModule } from '../product-process-change/product-process-change.module';
import { ProductProcessChangeService } from '../product-process-change/product-process-change.service';

@Module({
  imports: [UnifiedApprovalModule, RecordModule, forwardRef(() => ProductProcessChangeModule)],
  controllers: [ChangeEventController],
  providers: [ChangeEventService, ChangeEventFormTaskService, ChangeEventRelationService],
  exports: [ChangeEventService, ChangeEventFormTaskService, ChangeEventRelationService],
})
export class ChangeEventModule implements OnModuleInit {
  constructor(
    private readonly callbacks: ApprovalCallbackRegistry,
    @Inject(forwardRef(() => ProductProcessChangeService))
    private readonly productProcessChangeService: ProductProcessChangeService,
  ) {}

  onModuleInit() {
    this.callbacks.register('changeEvent.approvalApproved', async (context: any) => {
      await (context.tx as any).changeEvent.update({
        where: { id: context.resourceId },
        data: { status: 'approved', approved_by: context.actorId },
      });
      await (context.tx as any).changeApproval.updateMany({
        where: { change_event_id: context.resourceId },
        data: {
          approver_id: context.actorId,
          decision: 'approved',
          comments: context.comment,
          approved_at: new Date(),
        },
      });
      await this.productProcessChangeService.applyApprovedChange(
        context.resourceId,
        context.actorId,
        context.tx,
      );
    });
  }
}
