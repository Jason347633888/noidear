import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SearchService } from '../src/modules/search/search.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Mock @elastic/elasticsearch
jest.mock('@elastic/elasticsearch', () => {
  const mockEsClient = {
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({}),
    },
    index: jest.fn().mockResolvedValue({ result: 'created' }),
    search: jest.fn().mockResolvedValue({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _id: 'doc-es-id',
            _score: 1.5,
            _source: { title: 'ES 文档', fileType: 'pdf', departmentId: 'dept-1', createdAt: '2024-01-01' },
            highlight: { title: ['<em>ES</em> 文档'], content: ['...含 <em>ES</em> 关键词...'] },
          },
        ],
      },
    }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
  };

  return { Client: jest.fn(() => mockEsClient), __mockEsClient: mockEsClient };
});

const mockDocument = {
  id: 'doc-id-001',
  title: '测试文档',
  number: 'DOC-001',
  level: 1,
  status: 'published',
  fileType: 'pdf',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  deletedAt: null,
  creator: {
    id: 'user-id-001',
    name: '张三',
    departmentId: 'dept-1',
    department: { id: 'dept-1', name: '技术部' },
  },
};

const mockPrisma = {
  document: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  fulltextIndex: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

describe('SearchService', () => {
  let service: SearchService;

  const setupModule = async (esUrl?: string) => {
    const original = process.env.ELASTICSEARCH_URL;
    if (esUrl !== undefined) process.env.ELASTICSEARCH_URL = esUrl;
    else delete process.env.ELASTICSEARCH_URL;

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    return () => {
      if (original === undefined) delete process.env.ELASTICSEARCH_URL;
      else process.env.ELASTICSEARCH_URL = original;
    };
  };

  describe('indexDocument', () => {
    it('文档不存在时应抛出 NotFoundException', async () => {
      const cleanup = await setupModule();
      mockPrisma.document.findFirst.mockResolvedValue(null);

      await expect(service.indexDocument('non-existent')).rejects.toThrow(NotFoundException);
      cleanup();
    });

    it('无 ES 时仅写入 PostgreSQL FulltextIndex', async () => {
      const cleanup = await setupModule(); // 不传 esUrl = ES 禁用
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockPrisma.fulltextIndex.upsert.mockResolvedValue({});

      const result = await service.indexDocument('doc-id-001');

      expect(result.success).toBe(true);
      expect(mockPrisma.fulltextIndex.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { documentId: 'doc-id-001' },
        }),
      );
      cleanup();
    });
  });

  describe('search (PostgreSQL fallback)', () => {
    it('关键词为空时应抛出 BadRequestException', async () => {
      const cleanup = await setupModule();

      await expect(service.search({ keyword: '' } as any)).rejects.toThrow(BadRequestException);
      cleanup();
    });

    it('无 ES 时使用 PostgreSQL 搜索', async () => {
      const cleanup = await setupModule();
      mockPrisma.document.findMany.mockResolvedValue([mockDocument]);
      mockPrisma.document.count.mockResolvedValue(1);

      const result = await service.search({ keyword: '测试', page: 1, limit: 10 });

      expect(result.source).toBe('postgresql');
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('doc-id-001');
      cleanup();
    });

    it('支持分页参数', async () => {
      const cleanup = await setupModule();
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const result = await service.search({ keyword: 'x', page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(0);
      cleanup();
    });
  });

  describe('search (ElasticSearch path)', () => {
    it('有 ES 时使用 ES 搜索并返回 source=elasticsearch', async () => {
      const cleanup = await setupModule('http://localhost:9200');

      const result = await service.search({ keyword: 'ES', page: 1, limit: 10 });

      expect(result.source).toBe('elasticsearch');
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('doc-es-id');
      cleanup();
    });
  });

  describe('deleteIndex', () => {
    it('索引不存在时应抛出 NotFoundException', async () => {
      const cleanup = await setupModule();
      mockPrisma.fulltextIndex.findUnique.mockResolvedValue(null);

      await expect(service.deleteIndex('non-existent')).rejects.toThrow(NotFoundException);
      cleanup();
    });

    it('索引存在时应删除并返回 success', async () => {
      const cleanup = await setupModule();
      mockPrisma.fulltextIndex.findUnique.mockResolvedValue({ documentId: 'doc-id-001' });
      mockPrisma.fulltextIndex.delete.mockResolvedValue({});

      const result = await service.deleteIndex('doc-id-001');

      expect(result.success).toBe(true);
      expect(mockPrisma.fulltextIndex.delete).toHaveBeenCalledWith({
        where: { documentId: 'doc-id-001' },
      });
      cleanup();
    });
  });
});
