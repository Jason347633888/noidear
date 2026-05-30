import { forwardRef, Inject, Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { ProductRecallController } from './product-recall.controller';
import { ProductRecallService, TRACE_CONTEXT_SNAPSHOT_TOKEN } from './product-recall.service';
import { TraceabilityModule } from '../traceability/traceability.module';
import { TraceabilityService } from '../traceability/traceability.service';

@Module({
  imports: [PrismaModule, UnifiedApprovalModule, forwardRef(() => TraceabilityModule)],
  controllers: [ProductRecallController],
  providers: [
    ProductRecallService,
    {
      provide: TRACE_CONTEXT_SNAPSHOT_TOKEN,
      useFactory: (traceService: TraceabilityService) => traceService,
      inject: [{ token: TraceabilityService, optional: true }],
    },
  ],
  exports: [ProductRecallService],
})
export class ProductRecallModule implements OnModuleInit {
  constructor(
    private readonly callbacks: ApprovalCallbackRegistry,
    private readonly service: ProductRecallService,
  ) {}

  onModuleInit() {
    this.callbacks.register('productRecall.approvalApproved', async (context: any) => {
      const reviewNote =
        typeof context.metadata?.review_note === 'string'
          ? (context.metadata.review_note as string)
          : undefined;
      await this.service.markApprovalApprovedFromCallback(
        context.tx,
        context.resourceId,
        context.actorId,
        reviewNote,
      );
    });

    this.callbacks.register('productRecall.approvalRejected', async (context: any) => {
      const reviewNote =
        typeof context.metadata?.review_note === 'string' && context.metadata.review_note
          ? (context.metadata.review_note as string)
          : context.comment;
      await this.service.markApprovalRejectedFromCallback(
        context.tx,
        context.resourceId,
        context.actorId,
        reviewNote,
      );
    });
  }
}
