import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentsListener } from './documents.listener';
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
import { SearchModule } from '../search/search.module';
import { DocumentCronService } from './document-cron.service';
import { DocumentReferenceService } from './services/document-reference.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { DocumentControlWorkbenchService } from './services/document-control-workbench.service';
import { RecordFormLandingService } from './services/record-form-landing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelLandingModule } from '../model-landing/model-landing.module';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule, OperationLogModule, ExportModule, DepartmentPermissionModule, StatisticsModule, UserPermissionModule, SearchModule, ModelLandingModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentCronService, DocumentReferenceService, DocumentLifecycleService, DocumentControlMetadataService, DocumentControlWorkbenchService, RecordFormLandingService, FilePreviewService, StorageService, StatisticsCacheInterceptor, PermissionGuard, DocumentsListener],
  exports: [DocumentService, DocumentReferenceService, DocumentLifecycleService, DocumentControlMetadataService, DocumentControlWorkbenchService, RecordFormLandingService],
})
export class DocumentModule {}
