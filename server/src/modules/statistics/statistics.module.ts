import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { ManagementDashboardService } from './management-dashboard.service';
import { TraceabilityExportService } from './traceability-export.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, ExportModule, RedisModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, ManagementDashboardService, TraceabilityExportService],
  exports: [StatisticsService, ManagementDashboardService, TraceabilityExportService],
})
export class StatisticsModule {}
