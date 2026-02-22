import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditScheduleService } from './audit.schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { SensitiveLogInterceptor } from './interceptors/sensitive-log.interceptor';
import { StorageService } from '../../common/services';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, AuditScheduleService, SensitiveLogInterceptor, StorageService],
  exports: [AuditService, SensitiveLogInterceptor],
})
export class AuditModule {}
