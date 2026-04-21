import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchService } from '../search/search.service';
import { DocumentReferenceService } from './services/document-reference.service';

/**
 * 文档事件监听器
 * TASK-401: 监听文档创建/更新事件，触发 ES 索引
 * BR-306: 监听文档审批通过事件，异步触发引用快照同步
 */
@Injectable()
export class DocumentsListener {
  private readonly logger = new Logger(DocumentsListener.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly documentReferenceService: DocumentReferenceService,
  ) {}

  @OnEvent('document.created')
  async handleDocumentCreated(payload: { documentId: string }): Promise<void> {
    try {
      await this.searchService.indexDocument(payload.documentId);
      this.logger.log(`文档创建事件：索引完成 documentId=${payload.documentId}`);
    } catch (err) {
      this.logger.warn(`文档创建事件：索引失败 documentId=${payload.documentId}: ${err}`);
    }
  }

  @OnEvent('document.updated')
  async handleDocumentUpdated(payload: { documentId: string }): Promise<void> {
    try {
      await this.searchService.indexDocument(payload.documentId);
      this.logger.log(`文档更新事件：索引完成 documentId=${payload.documentId}`);
    } catch (err) {
      this.logger.warn(`文档更新事件：索引失败 documentId=${payload.documentId}: ${err}`);
    }
  }

  /**
   * BR-306: 文档审批通过后异步同步引用块快照
   * 此事件处理器在后台异步执行，不阻塞审批响应
   */
  @OnEvent('document.approved')
  async handleDocumentApproved(payload: { documentId: string; snapshot: Record<string, unknown> }): Promise<void> {
    try {
      const result = await this.documentReferenceService.syncReferenceSnapshots(
        payload.documentId,
        payload.snapshot,
      );
      this.logger.log(`文档审批事件：引用快照同步完成 documentId=${payload.documentId}, 更新 ${result.updatedCount} 条`);
    } catch (err) {
      this.logger.warn(`文档审批事件：引用快照同步失败 documentId=${payload.documentId}: ${err}`);
    }
  }
}
