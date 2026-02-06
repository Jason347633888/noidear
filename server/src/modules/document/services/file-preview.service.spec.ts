import { Test, TestingModule } from '@nestjs/testing';
import { FilePreviewService } from './file-preview.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/services';
import { BusinessException, ErrorCode } from '../../../common/exceptions/business.exception';
import { Response } from 'express';

describe('FilePreviewService', () => {
  let service: FilePreviewService;
  let prisma: PrismaService;
  let storage: StorageService;

  const mockDocument = {
    id: '1',
    level: 1,
    number: '1-HR-001',
    title: 'Test Document',
    filePath: 'documents/level1/test.pdf',
    fileName: 'test.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    version: 1.0,
    status: 'approved',
    creatorId: 'user1',
    approverId: 'admin1',
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilePreviewService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            getFileStream: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FilePreviewService>(FilePreviewService);
    prisma = module.get<PrismaService>(PrismaService);
    storage = module.get<StorageService>(StorageService);
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('downloadFile', () => {
    it('应该成功下载 PDF 文件', async () => {
      const mockStream = { pipe: jest.fn() };
      const mockRes = {
        set: jest.fn(),
      } as unknown as Response;

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(storage, 'getFileStream').mockResolvedValue(mockStream as any);

      await service.downloadFile('1', 'user1', 'user', mockRes);

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
      expect(storage.getFileStream).toHaveBeenCalledWith('documents/level1/test.pdf');
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      });
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('当文档不存在时应该抛出异常', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(null);

      const mockRes = {} as Response;

      await expect(
        service.downloadFile('999', 'user1', 'user', mockRes),
      ).rejects.toThrow(BusinessException);
    });

    it('当文档已停用时应该抛出异常', async () => {
      const inactiveDoc = { ...mockDocument, status: 'inactive' };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(inactiveDoc as any);

      const mockRes = {} as Response;

      await expect(
        service.downloadFile('1', 'user1', 'user', mockRes),
      ).rejects.toThrow(BusinessException);
    });

    it('普通用户不能下载别人的草稿文档', async () => {
      const draftDoc = { ...mockDocument, status: 'draft', creatorId: 'other' };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(draftDoc as any);

      const mockRes = {} as Response;

      await expect(
        service.downloadFile('1', 'user1', 'user', mockRes),
      ).rejects.toThrow(BusinessException);
    });

    it('管理员可以下载任何文档', async () => {
      const mockStream = { pipe: jest.fn() };
      const mockRes = {
        set: jest.fn(),
      } as unknown as Response;

      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(storage, 'getFileStream').mockResolvedValue(mockStream as any);

      await service.downloadFile('1', 'admin1', 'admin', mockRes);

      expect(storage.getFileStream).toHaveBeenCalled();
    });
  });

  describe('getPreviewUrl', () => {
    it('应该为 PDF 返回直接预览 URL', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);
      jest.spyOn(storage, 'getSignedUrl').mockResolvedValue('https://minio/test.pdf?signed=xxx');

      const result = await service.getPreviewUrl('1', 'user1', 'user');

      expect(result).toEqual({
        type: 'pdf',
        url: 'https://minio/test.pdf?signed=xxx',
        fileName: 'test.pdf',
      });
    });

    it('应该为 Word 返回下载提示', async () => {
      const wordDoc = {
        ...mockDocument,
        fileName: 'test.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(wordDoc as any);

      const result = await service.getPreviewUrl('1', 'user1', 'user');

      expect(result.type).toBe('word');
      expect(result.message).toContain('下载');
    });

    it('应该为 Excel 返回下载提示', async () => {
      const excelDoc = {
        ...mockDocument,
        fileName: 'test.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(excelDoc as any);

      const result = await service.getPreviewUrl('1', 'user1', 'user');

      expect(result.type).toBe('excel');
      expect(result.message).toContain('下载');
    });

    it('当用户无权限时应该抛出异常', async () => {
      const draftDoc = { ...mockDocument, status: 'draft', creatorId: 'other' };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(draftDoc as any);

      await expect(
        service.getPreviewUrl('1', 'user1', 'user'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('checkPreviewPermission', () => {
    it('创建者可以预览自己的草稿', async () => {
      const draftDoc = { ...mockDocument, status: 'draft', creatorId: 'user1' };
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(draftDoc as any);

      await expect(
        service.getPreviewUrl('1', 'user1', 'user'),
      ).resolves.toBeDefined();
    });

    it('管理员可以预览所有文档', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);

      await expect(
        service.getPreviewUrl('1', 'admin1', 'admin'),
      ).resolves.toBeDefined();
    });

    it('普通用户可以预览已发布的文档', async () => {
      jest.spyOn(prisma.document, 'findUnique').mockResolvedValue(mockDocument as any);

      await expect(
        service.getPreviewUrl('1', 'user2', 'user'),
      ).resolves.toBeDefined();
    });
  });
});
