import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { FilePreviewService } from './services';
import { StorageService } from '../../common/services';
import { NotificationModule } from '../notification/notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { ExportModule } from '../export/export.module';
import { DepartmentPermissionModule } from '../department-permission/department-permission.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';
import { UserPermissionModule } from '../user-permission/user-permission.module';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Module({
  imports: [ConfigModule, NotificationModule, OperationLogModule, ExportModule, DepartmentPermissionModule, StatisticsModule, UserPermissionModule],
  controllers: [DocumentController],
  providers: [DocumentService, FilePreviewService, StorageService, StatisticsCacheInterceptor, PermissionGuard],
  exports: [DocumentService],
})
export class DocumentModule {}
