import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * 告警管理模块
 * TASK-364: Alert Management
 * GAP-511: AlertController 已从此模块移除，告警 API 权威路径收敛至 /monitoring/alerts/*
 */
@Module({
  imports: [PrismaModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
