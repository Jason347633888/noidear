import { Module, OnModuleInit } from '@nestjs/common';
import { AuditPlanModule } from './audit-plan/audit-plan.module';
import { AuditExecutionModule } from './audit-execution/audit-execution.module';
import { RectificationModule } from './rectification/rectification.module';
import { VerificationModule } from './verification/verification.module';
import { ReportModule } from './report/report.module';
import { AuditCronService } from './audit-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    UnifiedApprovalModule,
    AuditPlanModule,
    AuditExecutionModule,
    RectificationModule,
    VerificationModule,
    ReportModule,
  ],
  providers: [AuditCronService],
  exports: [
    AuditPlanModule,
    AuditExecutionModule,
    RectificationModule,
    VerificationModule,
    ReportModule,
  ],
})
export class InternalAuditModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('audit.findingVerified', async (context: any) => {
      await context.tx.auditFinding.update({
        where: { id: context.resourceId },
        data: {
          status: 'verified',
          verifiedBy: context.actorId,
          verifiedAt: new Date(),
        },
      });
    });
  }
}
