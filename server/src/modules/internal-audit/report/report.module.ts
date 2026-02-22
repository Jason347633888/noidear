import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { OperationLogModule } from '../../operation-log/operation-log.module';
import { AuditModule } from '../../audit/audit.module';
import { UserPermissionModule } from '../../user-permission/user-permission.module';
import { RedisModule } from '../../redis/redis.module';
import { StorageService } from '../../../common/services/storage.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    OperationLogModule,
    AuditModule,
    UserPermissionModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, StorageService],
  exports: [ReportService],
})
export class ReportModule {}
