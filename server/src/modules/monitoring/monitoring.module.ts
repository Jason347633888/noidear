import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AlertScheduleService } from './alert.schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { AlertModule } from '../alert/alert.module';

/**
 * 监控模块
 * TASK-363: Monitoring Module with Prometheus
 */
@Module({
  imports: [PrismaModule, AlertModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MetricsService, AlertScheduleService],
  exports: [MonitoringService, MetricsService],
})
export class MonitoringModule {}
