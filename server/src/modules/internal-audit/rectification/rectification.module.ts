import { Module } from '@nestjs/common';
import { RectificationController } from './rectification.controller';
import { RectificationService } from './rectification.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OperationLogModule } from '../../operation-log/operation-log.module';
import { AuditModule } from '../../audit/audit.module';
import { UserPermissionModule } from '../../user-permission/user-permission.module';
import { RedisModule } from '../../redis/redis.module';
import { RoleModule } from '../../role/role.module';
import { DepartmentPermissionModule } from '../../department-permission/department-permission.module';

@Module({
  imports: [
    PrismaModule,
    OperationLogModule,
    AuditModule,
    UserPermissionModule,
    RedisModule,
    RoleModule,
    DepartmentPermissionModule,
  ],
  controllers: [RectificationController],
  providers: [RectificationService],
  exports: [RectificationService],
})
export class RectificationModule {}
