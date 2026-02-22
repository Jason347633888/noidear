import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExportModule } from '../export/export.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, ExportModule, RedisModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
