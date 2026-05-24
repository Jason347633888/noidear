import { forwardRef, Inject, Module, OnModuleInit } from '@nestjs/common';
import { ChangeEventController } from './change-event.controller';
import { ChangeEventService } from './change-event.service';
import { ChangeEventRelationService } from './change-event-relation.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { ProductProcessChangeModule } from '../product-process-change/product-process-change.module';
import { ProductProcessChangeService } from '../product-process-change/product-process-change.service';

@Module({
  imports: [UnifiedApprovalModule, forwardRef(() => ProductProcessChangeModule)],
  controllers: [ChangeEventController],
  providers: [ChangeEventService, ChangeEventRelationService],
  exports: [ChangeEventService, ChangeEventRelationService],
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
      await this.productProcessChangeService.applyApprovedChange(
        context.resourceId,
        context.actorId,
        context.tx,
      );
    });
    this.callbacks.register('changeEvent.approvalRejected', async (context: any) => {
      await (context.tx as any).changeEvent.update({
        where: { id: context.resourceId },
        data: { status: 'rejected', approved_by: context.actorId },
      });
    });
  }
}
