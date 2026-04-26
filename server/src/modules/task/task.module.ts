import { Module, OnModuleInit } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [UnifiedApprovalModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('taskRecord.approvalApproved', async (context: any) => {
      await context.tx.taskRecord.update({
        where: { id: context.resourceId },
        data: { status: 'approved', approvedAt: new Date(), approverId: context.actorId },
      });
    });
  }
}
