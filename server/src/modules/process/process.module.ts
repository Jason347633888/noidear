import { Module } from '@nestjs/common';
import { ProcessInstanceController } from './process-instance.controller';
import { ProcessTemplateController } from './process-template.controller';
import { ProcessStepApprovalService } from './process-step-approval.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProcessInstanceController, ProcessTemplateController],
  providers: [ProcessStepApprovalService],
  exports: [ProcessStepApprovalService],
})
export class ProcessModule {}
