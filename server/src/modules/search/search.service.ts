import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { ES_INDEX, createIndexIfNotExists } from './elasticsearch.config';

/**
 * 全文搜索服务
 * TASK-401: 真实 ElasticSearch 集成（含 PostgreSQL 降级）
 * BR-317: 文档搜索支持全文搜索和高亮
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly esClient: Client | null = null;
  private esEnabled = false;

  // 正则特殊字符列表（用于转义）
  private static readonly REGEX_SPECIAL = /[.+*?^=!:${}()|[\]/\\]/g;

  constructor(private readonly prisma: PrismaService) {
    const esUrl = process.env.ELASTICSEARCH_URL;
    if (esUrl) {
      this.esClient = new Client({ node: esUrl });
      this.esEnabled = true;
      this.initEsIndex();
    }
  }

  private async initEsIndex(): Promise<void> {
    try {
      await createIndexIfNotExists(this.esClient!);
      this.logger.log('ElasticSearch 索引初始化完成');
    } catch (err) {
      this.logger.warn(`ElasticSearch 索引初始化失败，降级为 PostgreSQL: ${err}`);
      this.esEnabled = false;
    }
  }

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

    // 始终同步写入 PostgreSQL 备份索引
    await this.prisma.fulltextIndex.upsert({
      where: { documentId },
      create: { documentId, content: document.title, metadata, indexedAt: new Date() },
      update: { content: document.title, metadata, indexedAt: new Date() },
    });

    // 若 ES 可用，同步写入 ElasticSearch
    if (this.esEnabled && this.esClient) {
      try {
        await this.esClient.index({
          index: ES_INDEX,
          id: documentId,
          document: {
            title: document.title,
            content: document.title,
            fileType: document.fileType,
            departmentId: document.creator?.departmentId ?? null,
            tags: [],
            createdAt: document.createdAt,
          },
        });
        this.logger.log(`文档 ${documentId} 已写入 ElasticSearch`);
      } catch (err) {
        this.logger.warn(`ElasticSearch 写入失败: ${err}`);
      }
    }

    this.logger.log(`文档 ${documentId} 索引完成`);
    return { success: true, documentId, message: '文档已索引' };
  }

  async search(query: SearchQueryDto) {
    const keyword = query.keyword?.trim();
    if (!keyword) throw new BadRequestException('搜索关键词不能为空');

    if (this.esEnabled && this.esClient) {
      try {
        return await this.searchWithEs(query, keyword);
      } catch (err) {
        this.logger.warn(`ElasticSearch 搜索失败，降级 PostgreSQL: ${err}`);
      }
    }

    return this.searchWithPostgres(query, keyword);
  }

  async deleteIndex(documentId: string) {
    const existing = await this.prisma.fulltextIndex.findUnique({ where: { documentId } });
    if (!existing) throw new NotFoundException(`文档 ${documentId} 的索引不存在`);

    await this.prisma.fulltextIndex.delete({ where: { documentId } });

    if (this.esEnabled && this.esClient) {
      try {
        await this.esClient.delete({ index: ES_INDEX, id: documentId });
      } catch (err) {
        this.logger.warn(`ElasticSearch 删除索引失败: ${err}`);
      }
    }

    return { success: true, message: '索引已删除' };
  }

  private async searchWithEs(query: SearchQueryDto, keyword: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const must: any[] = [
      {
        multi_match: {
          query: keyword,
          fields: ['title^2', 'content'],
        },
      },
    ];

    if (query.fileType) must.push({ term: { fileType: query.fileType } });
    if (query.departmentId) must.push({ term: { departmentId: query.departmentId } });

    const response = await this.esClient!.search({
      index: ES_INDEX,
      from: (page - 1) * limit,
      size: limit,
      query: { bool: { must } },
      highlight: {
        fields: { content: {}, title: {} },
        pre_tags: ['<em>'],
        post_tags: ['</em>'],
      },
    });

    const hits = response.hits.hits;
    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total as any)?.value ?? 0;

    return {
      data: hits.map((hit: any) => ({
        id: hit._id,
        title: hit.highlight?.title?.[0] ?? hit._source.title,
        fileType: hit._source.fileType,
        departmentId: hit._source.departmentId,
        createdAt: hit._source.createdAt,
        highlight: hit.highlight?.content?.[0] ?? '',
        score: hit._score,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      keyword,
      source: 'elasticsearch',
    };
  }

  private async searchWithPostgres(query: SearchQueryDto, keyword: string) {
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
      source: 'postgresql',
    };
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
