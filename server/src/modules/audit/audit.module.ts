import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { PermissionLogReadonlyController } from './permission-log-readonly.controller';
import { AuditService } from './audit.service';
import { AuditScheduleService } from './audit.schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { SensitiveLogInterceptor } from './interceptors/sensitive-log.interceptor';
import { StorageService } from '../../common/services';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [PrismaModule, RoleModule],
  controllers: [AuditController, PermissionLogReadonlyController],
  providers: [AuditService, AuditScheduleService, SensitiveLogInterceptor, StorageService],
  exports: [AuditService, SensitiveLogInterceptor],
})
export class AuditModule {}
