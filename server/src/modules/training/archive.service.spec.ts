import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ArchiveService } from './archive.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let prisma: any;
  let storageService: any;

  const mockArchive = {
    id: 'archive-1',
    projectId: 'project-1',
    documentId: 'doc-1',
    pdfPath: 'archives/2026/test.pdf',
    generatedAt: new Date('2026-05-01'),
    project: {
      id: 'project-1',
      title: 'GMP培训',
      plan: { year: 2026, title: '2026年度培训计划' },
    },
  };

  const mockSignedUrl = 'https://storage.example.com/archives/2026/test.pdf?token=abc';

  beforeEach(async () => {
    const mockPrisma = {
      trainingArchive: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockStorageService = {
      getFileUrl: jest.fn().mockResolvedValue(mockSignedUrl),
      uploadStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ArchiveService>(ArchiveService);
    prisma = module.get(PrismaService);
    storageService = module.get(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findArchives', () => {
    it('应该返回培训档案列表，每条附带 pdfUrl', async () => {
      prisma.trainingArchive.findMany.mockResolvedValue([mockArchive]);

      const result = await service.findArchives();

      expect(result).toHaveLength(1);
      expect(result[0].pdfUrl).toBe(mockSignedUrl);
      expect(storageService.getFileUrl).toHaveBeenCalledWith(mockArchive.pdfPath);
    });

    it('应该按 projectId 过滤', async () => {
      prisma.trainingArchive.findMany.mockResolvedValue([mockArchive]);

      await service.findArchives('project-1');

      expect(prisma.trainingArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'project-1' },
        }),
      );
    });

    it('无档案时应该返回空数组', async () => {
      prisma.trainingArchive.findMany.mockResolvedValue([]);

      const result = await service.findArchives();

      expect(result).toEqual([]);
    });
  });

  describe('findArchiveById', () => {
    it('应该返回指定 ID 的档案，附带 pdfUrl', async () => {
      prisma.trainingArchive.findUnique.mockResolvedValue(mockArchive);

      const result = await service.findArchiveById('archive-1');

      expect(result.id).toBe('archive-1');
      expect(result.pdfUrl).toBe(mockSignedUrl);
      expect(storageService.getFileUrl).toHaveBeenCalledWith(mockArchive.pdfPath);
    });

    it('档案不存在时应该抛出 NotFoundException', async () => {
      prisma.trainingArchive.findUnique.mockResolvedValue(null);

      await expect(service.findArchiveById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('downloadArchivePDF', () => {
    it('应该返回 { url } 而非二进制 blob', async () => {
      prisma.trainingArchive.findUnique.mockResolvedValue(mockArchive);

      const result = await service.downloadArchivePDF('archive-1');

      expect(result).toEqual({ url: mockSignedUrl });
      expect(storageService.getFileUrl).toHaveBeenCalledWith(mockArchive.pdfPath);
    });

    it('结果必须包含 url 字段', async () => {
      prisma.trainingArchive.findUnique.mockResolvedValue(mockArchive);

      const result = await service.downloadArchivePDF('archive-1');

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
      expect(result.url.length).toBeGreaterThan(0);
    });

    it('档案不存在时应该抛出 NotFoundException', async () => {
      prisma.trainingArchive.findUnique.mockResolvedValue(null);

      await expect(service.downloadArchivePDF('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
