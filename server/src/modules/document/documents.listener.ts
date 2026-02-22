import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchService } from '../search/search.service';

/**
 * 文档事件监听器
 * TASK-401: 监听文档创建/更新事件，触发 ES 索引
 */
@Injectable()
export class DocumentsListener {
  private readonly logger = new Logger(DocumentsListener.name);

  constructor(private readonly searchService: SearchService) {}

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
}
