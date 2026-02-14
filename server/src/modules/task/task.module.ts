import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskCronService } from './task-cron.service';
import { NotificationModule } from '../notification/notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { DeviationModule } from '../deviation/deviation.module';

@Module({
  imports: [NotificationModule, OperationLogModule, DeviationModule],
  controllers: [TaskController],
  providers: [TaskService, TaskCronService],
  exports: [TaskService],
})
export class TaskModule {}
