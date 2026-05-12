import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditScheduleService } from './audit.schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { SensitiveLogInterceptor } from './interceptors/sensitive-log.interceptor';
import { StorageService } from '../../common/services';
import { UserPermissionModule } from '../user-permission/user-permission.module';
import { RoleModule } from '../role/role.module';
import { DepartmentPermissionModule } from '../department-permission/department-permission.module';

@Module({
  imports: [PrismaModule, UserPermissionModule, RoleModule, DepartmentPermissionModule],
  controllers: [AuditController],
  providers: [AuditService, AuditScheduleService, SensitiveLogInterceptor, StorageService],
  exports: [AuditService, SensitiveLogInterceptor],
})
export class AuditModule {}
