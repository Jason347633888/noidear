import { Module, OnModuleInit } from '@nestjs/common';
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
import { PrismaModule } from '../../prisma/prisma.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import type { ApprovalCallbackContext } from '../unified-approval/types';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule, OperationLogModule, ExportModule, DepartmentPermissionModule, StatisticsModule, UserPermissionModule, SearchModule, UnifiedApprovalModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentCronService, DocumentReferenceService, DocumentLifecycleService, FilePreviewService, StorageService, StatisticsCacheInterceptor, PermissionGuard, DocumentsListener],
  exports: [DocumentService, DocumentReferenceService, DocumentLifecycleService],
})
export class DocumentModule implements OnModuleInit {
  constructor(private readonly callbackRegistry: ApprovalCallbackRegistry) {}

  onModuleInit() {
    this.callbackRegistry.register(
      'document.approvalApproved',
      async ({ tx, resourceId, actorId }: ApprovalCallbackContext) => {
        await (tx as any).document.update({
          where: { id: resourceId },
          data: { status: 'approved', approverId: actorId, approvedAt: new Date() },
        });
      },
    );
  }
}
