import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { LivenessController } from './liveness.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController, LivenessController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
