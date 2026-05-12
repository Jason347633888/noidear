import { Module } from '@nestjs/common';
import { AuditPlanController } from './audit-plan.controller';
import { AuditPlanService } from './audit-plan.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { UserPermissionModule } from '../../user-permission/user-permission.module';
import { RedisModule } from '../../redis/redis.module';
import { OperationLogModule } from '../../operation-log/operation-log.module';
import { RoleModule } from '../../role/role.module';
import { DepartmentPermissionModule } from '../../department-permission/department-permission.module';

@Module({
  imports: [PrismaModule, AuditModule, UserPermissionModule, RedisModule, OperationLogModule, RoleModule, DepartmentPermissionModule],
  controllers: [AuditPlanController],
  providers: [AuditPlanService],
  exports: [AuditPlanService],
})
export class AuditPlanModule {}
