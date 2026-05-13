import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { RecordController } from './record.controller';
import { RecordService } from './record.service';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import { TrainingScheduleService } from './training.schedule';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [PrismaModule, UnifiedApprovalModule],
  controllers: [TrainingController, QuestionController, ExamController, RecordController, ArchiveController],
  providers: [TrainingService, QuestionService, ExamService, RecordService, ArchiveService, TrainingScheduleService, StorageService],
  exports: [TrainingService, QuestionService, ExamService, RecordService, ArchiveService],
})
export class TrainingModule implements OnModuleInit {
  constructor(private readonly callbacks: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbacks.register('training.planApproved', async (context: any) => {
      await context.tx.trainingPlan.update({
        where: { id: context.resourceId },
        data: { status: 'approved' },
      });
    });
  }
}
