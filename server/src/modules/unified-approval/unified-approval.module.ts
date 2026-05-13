import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalTodoBridge } from './approval-todo.bridge';
import { ApprovalNotificationBridge } from './approval-notification.bridge';
import { ApprovalCallbackRegistry } from './approval-callback.registry';
import { ApprovalActionMetadataValidator } from './approval-action-metadata.validator';
import { ApprovalDefinitionController } from './approval-definition.controller';
import { ApprovalInstanceController } from './approval-instance.controller';
import { ApprovalTaskController } from './approval-task.controller';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ApprovalDefinitionController, ApprovalInstanceController, ApprovalTaskController],
  providers: [
    ApprovalAssignmentResolver,
    ApprovalEngineService,
    ApprovalTodoBridge,
    ApprovalNotificationBridge,
    ApprovalCallbackRegistry,
    ApprovalActionMetadataValidator,
  ],
  exports: [
    ApprovalEngineService,
    ApprovalCallbackRegistry,
    ApprovalAssignmentResolver,
    ApprovalNotificationBridge,
    ApprovalActionMetadataValidator,
  ],
})
export class UnifiedApprovalModule {}
