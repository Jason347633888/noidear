import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskCronService } from './task-cron.service';
import { NotificationModule } from '../notification/notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { DeviationModule } from '../deviation/deviation.module';
import { ExportModule } from '../export/export.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

@Module({
  imports: [NotificationModule, OperationLogModule, DeviationModule, ExportModule, StatisticsModule],
  controllers: [TaskController],
  providers: [TaskService, TaskCronService, StatisticsCacheInterceptor],
  exports: [TaskService],
})
export class TaskModule {}
