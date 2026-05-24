import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { RecordTaskAssignmentController } from './record-task-assignment.controller';
import { RecordTaskInstanceController } from './record-task-instance.controller';
import { RecordTaskAssignmentService } from './record-task-assignment.service';
import { RecordTaskInstanceService } from './record-task-instance.service';
import { RecordTaskCronService } from './record-task-cron.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationModule],
  controllers: [RecordTaskAssignmentController, RecordTaskInstanceController],
  providers: [RecordTaskAssignmentService, RecordTaskInstanceService, RecordTaskCronService],
  exports: [RecordTaskAssignmentService, RecordTaskInstanceService],
})
export class RecordTaskModule {}
