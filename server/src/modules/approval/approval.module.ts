import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

@Module({
  imports: [PrismaModule, NotificationModule, StatisticsModule],
  controllers: [ApprovalController],
  providers: [ApprovalService, StatisticsCacheInterceptor],
  exports: [ApprovalService],
})
export class ApprovalModule {}
