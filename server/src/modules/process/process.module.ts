import { Module, OnModuleInit } from '@nestjs/common';
import { ProcessInstanceController } from './process-instance.controller';
import { ProcessTemplateController } from './process-template.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { PrismaService } from '../../prisma/prisma.service';
import { applyProcessStepApproved } from './process-approval.callbacks';

@Module({
  imports: [PrismaModule, UnifiedApprovalModule],
  controllers: [ProcessInstanceController, ProcessTemplateController],
})
export class ProcessModule implements OnModuleInit {
  constructor(
    private readonly callbackRegistry: ApprovalCallbackRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.callbackRegistry.register('process.stepApproved', (context) =>
      applyProcessStepApproved(this.prisma, context),
    );
  }
}
