import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { TraceabilityExportService } from './traceability-export.service';
import { StatisticsExportService } from './statistics-export.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, ExportModule, RedisModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, TraceabilityExportService, StatisticsExportService],
  exports: [StatisticsService, TraceabilityExportService, StatisticsExportService],
})
export class StatisticsModule {}
