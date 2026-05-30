import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { QualityNumberSequenceModule } from '../quality-number-sequence/quality-number-sequence.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { StorageService } from '../../common/services/storage.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { FaultController } from './fault.controller';
import { FaultService } from './fault.service';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { UploadController } from './upload.controller';
import { TodoService } from './todo.service';
import { SchedulerService } from './scheduler.service';
import { EquipmentAcceptanceService } from './equipment-acceptance.service';
import { EquipmentUsageService } from './equipment-usage.service';
import { EvidenceAttachmentService } from './evidence-attachment.service';

@Module({
  imports: [PrismaModule, NotificationModule, UnifiedApprovalModule, QualityNumberSequenceModule],
  controllers: [
    EquipmentController,
    PlanController,
    RecordController,
    FaultController,
    StatsController,
    UploadController,
  ],
  providers: [
    EquipmentService,
    PlanService,
    RecordService,
    FaultService,
    StatsService,
    StorageService,
    TodoService,
    SchedulerService,
    EquipmentAcceptanceService,
    EquipmentUsageService,
    EvidenceAttachmentService,
  ],
  exports: [
    EquipmentService,
    PlanService,
    RecordService,
    FaultService,
    StatsService,
    TodoService,
    EquipmentAcceptanceService,
    EquipmentUsageService,
    EvidenceAttachmentService,
  ],
})
export class EquipmentModule implements OnModuleInit {
  constructor(
    private readonly callbacks: ApprovalCallbackRegistry,
    private readonly planService: PlanService,
    private readonly statsService: StatsService,
  ) {}

  onModuleInit() {
    this.callbacks.register('equipment.maintenanceApproved', async (context: any) => {
      const record = await context.tx.maintenanceRecord.update({
        where: { id: context.resourceId },
        data: {
          status: 'approved',
          reviewerId: context.actorId,
          reviewerSignature:
            typeof context.metadata?.reviewerSignature === 'string'
              ? context.metadata.reviewerSignature
              : undefined,
          approvedAt: new Date(),
        },
      });
      await this.planService.generateNextPlan(
        record.equipmentId,
        record.maintenanceLevel,
        record.maintenanceDate,
      );
      const year = record.maintenanceDate.getFullYear();
      await this.statsService.clearCache(['maintenance', `cost-${year}`]).catch(() => {});
    });

    this.callbacks.register('equipment.maintenanceRejected', async (context: any) => {
      await context.tx.maintenanceRecord.update({
        where: { id: context.resourceId },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectReason: String(context.metadata?.rejectReason ?? context.comment ?? ''),
          reviewerId: context.actorId,
        },
      });
    });
  }
}
