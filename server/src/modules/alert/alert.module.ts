import { Module } from '@nestjs/common';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * 告警管理模块
 * TASK-364: Alert Management
 */
@Module({
  imports: [PrismaModule],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
