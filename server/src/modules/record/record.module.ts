import { Module, OnModuleInit } from '@nestjs/common';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { ChangeLogInterceptor } from './interceptors/change-log.interceptor';
import { PrismaModule } from '../../prisma/prisma.module';
import { DynamicFormBatchController } from './controllers/dynamic-form-batch.controller';
import { DynamicFormBatchService } from './services/dynamic-form-batch.service';
import { DeviationModule } from '../deviation/deviation.module';
import { RecordTemplateModule } from '../record-template/record-template.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [PrismaModule, DeviationModule, RecordTemplateModule, UnifiedApprovalModule],
  controllers: [RecordController, DynamicFormBatchController],
  providers: [RecordService, ChangeLogInterceptor, DynamicFormBatchService],
  exports: [RecordService, DynamicFormBatchService],
})
export class RecordModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('record.submitApproved', async (context: any) => {
      await context.tx.record.update({
        where: { id: context.resourceId },
        data: { status: 'approved', approvedAt: new Date() },
      });
    });
  }
}
