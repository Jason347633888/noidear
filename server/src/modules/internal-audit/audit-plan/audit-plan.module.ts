import { Module } from '@nestjs/common';
import { AuditPlanController } from './audit-plan.controller';
import { AuditPlanService } from './audit-plan.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { UserPermissionModule } from '../../user-permission/user-permission.module';
import { RedisModule } from '../../redis/redis.module';
import { OperationLogModule } from '../../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, AuditModule, UserPermissionModule, RedisModule, OperationLogModule],
  controllers: [AuditPlanController],
  providers: [AuditPlanService],
  exports: [AuditPlanService],
})
export class AuditPlanModule {}
