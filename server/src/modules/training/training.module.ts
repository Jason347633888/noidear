import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
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
  imports: [PrismaModule, WorkflowModule],
  controllers: [TrainingController, QuestionController, ExamController, RecordController, ArchiveController],
  providers: [TrainingService, QuestionService, ExamService, RecordService, ArchiveService, TrainingScheduleService, StorageService],
  exports: [TrainingService, QuestionService, ExamService, RecordService, ArchiveService],
})
export class TrainingModule {}
