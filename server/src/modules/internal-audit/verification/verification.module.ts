import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
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
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
