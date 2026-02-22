import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

/**
 * 全文搜索服务（PostgreSQL 降级实现）
 * TASK-382: BR-317 文档搜索支持全文搜索和高亮
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  // 正则特殊字符列表（用于转义）
  private static readonly REGEX_SPECIAL = /[.+*?^=!:${}()|[\]/\\]/g;

  constructor(private readonly prisma: PrismaService) {}

  async indexDocument(documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, deletedAt: null },
      include: {
        creator: { select: { departmentId: true, department: { select: { name: true } } } },
      },
    });

    if (!document) {
      throw new NotFoundException(`文档 ${documentId} 不存在`);
    }

    const metadata = this.buildDocumentMetadata(document);

    await this.prisma.fulltextIndex.upsert({
      where: { documentId },
      create: { documentId, content: document.title, metadata, indexedAt: new Date() },
      update: { content: document.title, metadata, indexedAt: new Date() },
    });

    this.logger.log(`文档 ${documentId} 索引完成`);
    return { success: true, documentId, message: '文档已索引' };
  }

  async search(query: SearchQueryDto) {
    const keyword = query.keyword?.trim();
    if (!keyword) throw new BadRequestException('搜索关键词不能为空');

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const where = this.buildSearchWhere(query, keyword);
    const orderBy = query.sortBy === 'time' ? { createdAt: 'desc' as const } : { updatedAt: 'desc' as const };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          creator: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents.map((doc) => this.formatResult(doc, keyword)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      keyword,
    };
  }

  async deleteIndex(documentId: string) {
    const existing = await this.prisma.fulltextIndex.findUnique({ where: { documentId } });
    if (!existing) throw new NotFoundException(`文档 ${documentId} 的索引不存在`);
    await this.prisma.fulltextIndex.delete({ where: { documentId } });
    return { success: true, message: '索引已删除' };
  }

  private buildDocumentMetadata(document: any): any {
    return {
      title: document.title,
      level: document.level,
      fileType: document.fileType,
      status: document.status,
      departmentId: document.creator?.departmentId ?? null,
      departmentName: document.creator?.department?.name ?? null,
      createdAt: document.createdAt.toISOString(),
    };
  }

  private buildSearchWhere(query: SearchQueryDto, keyword: string): any {
    const where: any = {
      deletedAt: null,
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { number: { contains: keyword, mode: 'insensitive' } },
      ],
    };

    if (query.fileType) where.fileType = query.fileType;
    if (query.departmentId) where.creator = { departmentId: query.departmentId };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }
    return where;
  }

  private formatResult(doc: any, keyword: string): any {
    return {
      id: doc.id,
      title: this.applyHighlight(doc.title, keyword),
      number: doc.number,
      level: doc.level,
      status: doc.status,
      fileType: doc.fileType,
      createdAt: doc.createdAt,
      creator: doc.creator,
      highlight: this.buildSnippet(doc.title, keyword),
    };
  }

  private escapeForRegex(text: string): string {
    return text.replace(SearchService.REGEX_SPECIAL, (ch) => '\\' + ch);
  }

  private applyHighlight(text: string, keyword: string): string {
    const escaped = this.escapeForRegex(keyword);
    const regex = new RegExp('(' + escaped + ')', 'gi');
    return text.replace(regex, '<em>$1</em>');
  }

  private buildSnippet(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.slice(0, 100);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + keyword.length + 50);
    const snippet = text.slice(start, end);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return prefix + this.applyHighlight(snippet, keyword) + suffix;
  }
}
