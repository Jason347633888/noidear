import { Module } from '@nestjs/common';
import { AuditExecutionController } from './audit-execution.controller';
import { AuditExecutionService } from './audit-execution.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OperationLogModule } from '../../operation-log/operation-log.module';
import { AuditModule } from '../../audit/audit.module';
import { UserPermissionModule } from '../../user-permission/user-permission.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    OperationLogModule,
    AuditModule,
    UserPermissionModule,
    RedisModule,
  ],
  controllers: [AuditExecutionController],
  providers: [AuditExecutionService],
  exports: [AuditExecutionService],
})
export class AuditExecutionModule {}
