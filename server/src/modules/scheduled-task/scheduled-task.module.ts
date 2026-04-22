import { Module } from '@nestjs/common';
import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskScheduler } from './scheduled-task.scheduler';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScheduledTaskService, ScheduledTaskScheduler],
  exports: [ScheduledTaskService],
})
export class ScheduledTaskModule {}
