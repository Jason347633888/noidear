import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { DeviationService } from './deviation.service';
import { DeviationController } from './deviation.controller';
import { DeviationAliasController } from './deviation-alias.controller';
import { DeviationAnalyticsService } from './deviation-analytics.service';
import { DeviationAnalyticsController } from './deviation-analytics.controller';
import { DeviationCronService } from './deviation-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { ApprovalModule } from '../approval/approval.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [
    PrismaModule,
    ExportModule,
    forwardRef(() => ApprovalModule),
    UnifiedApprovalModule,
  ],
  controllers: [DeviationController, DeviationAliasController, DeviationAnalyticsController],
  providers: [DeviationService, DeviationAnalyticsService, DeviationCronService],
  exports: [DeviationService, DeviationAnalyticsService],
})
export class DeviationModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('deviation.approvalApproved', async (context: any) => {
      await context.tx.deviationReport.update({
        where: { id: context.resourceId },
        data: { status: 'approved' },
      });
    });
    this.callbacks.register('deviation.approvalRejected', async (context: any) => {
      await context.tx.deviationReport.update({
        where: { id: context.resourceId },
        data: { status: 'rejected' },
      });
    });
  }
}
