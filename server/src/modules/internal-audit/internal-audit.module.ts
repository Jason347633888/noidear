import { Module } from '@nestjs/common';
import { AuditPlanModule } from './audit-plan/audit-plan.module';
import { AuditExecutionModule } from './audit-execution/audit-execution.module';
import { RectificationModule } from './rectification/rectification.module';
import { VerificationModule } from './verification/verification.module';
import { ReportModule } from './report/report.module';
import { AuditCronService } from './audit-cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
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
export class InternalAuditModule {}
