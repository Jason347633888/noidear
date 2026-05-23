import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentsListener } from './documents.listener';
import { FilePreviewService } from './services';
import { StorageService } from '../../common/services';
import { NotificationModule } from '../notification/notification.module';
import { OperationLogModule } from '../operation-log/operation-log.module';
import { DepartmentPermissionModule } from '../department-permission/department-permission.module';
import { RoleModule } from '../role/role.module';
import { UserPermissionModule } from '../user-permission/user-permission.module';
import { SearchModule } from '../search/search.module';
import { DocumentCronService } from './document-cron.service';
import { DocumentReferenceService } from './services/document-reference.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentControlMetadataService } from './services/document-control-metadata.service';
import { RecordFormLandingService } from './services/record-form-landing.service';
import { MarkdownWikilinkService } from './services/markdown-wikilink.service';
import { DocumentReferenceHealthService } from './services/document-reference-health.service';
import { BusinessDocumentLinkService } from './services/business-document-link.service';
import { DocumentExpiryService } from './services/document-expiry.service';
import { NumberRuleService } from './services/number-rule.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModelLandingModule } from '../model-landing/model-landing.module';
import { UnifiedApprovalModule } from '../unified-approval/unified-approval.module';
import { ApprovalCallbackRegistry } from '../unified-approval/approval-callback.registry';
import type { ApprovalCallbackContext } from '../unified-approval/types';
import { CANONICAL_DOCUMENT_STATUS } from './constants/document-control.constants';

@Module({
  imports: [ConfigModule, PrismaModule, NotificationModule, OperationLogModule, DepartmentPermissionModule, RoleModule, UserPermissionModule, SearchModule, ModelLandingModule, UnifiedApprovalModule],
  controllers: [DocumentController],
  providers: [DocumentService, DocumentCronService, DocumentReferenceService, MarkdownWikilinkService, DocumentReferenceHealthService, BusinessDocumentLinkService, DocumentExpiryService, DocumentLifecycleService, DocumentControlMetadataService, RecordFormLandingService, FilePreviewService, StorageService, DocumentsListener, NumberRuleService],
  exports: [DocumentService, DocumentReferenceService, DocumentLifecycleService, DocumentControlMetadataService, BusinessDocumentLinkService, DocumentExpiryService],
})
export class DocumentModule implements OnModuleInit {
  constructor(
    private readonly callbackRegistry: ApprovalCallbackRegistry,
    private readonly documentService: DocumentService,
  ) {}

  onModuleInit() {
    this.callbackRegistry.register(
      'document.approvalApproved',
      async ({ tx, resourceId, actorId }: ApprovalCallbackContext) => {
        await (tx as any).document.update({
          where: { id: resourceId },
          data: {
            status: CANONICAL_DOCUMENT_STATUS.EFFECTIVE,
            revisionStatus: 'current',
            approverId: actorId,
            approvedAt: new Date(),
          },
        });
        const doc = await (tx as any).document.findUnique({
          where: { id: resourceId },
          select: { id: true, number: true, lineage_key: true, revisionOfId: true },
        });
        if (doc) {
          await this.documentService.supersedePreviousEffectiveRevision(tx, doc);
        }
      },
    );

    this.callbackRegistry.register(
      'document.approvalRejected',
      async ({ tx, resourceId }: ApprovalCallbackContext) => {
        await (tx as any).document.update({
          where: { id: resourceId },
          data: { status: CANONICAL_DOCUMENT_STATUS.REJECTED },
        });
      },
    );
  }
}
