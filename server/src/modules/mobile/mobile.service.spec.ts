import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { BusinessException } from '../../common/exceptions/business.exception';

// Mock sharp module
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    resize: jest.fn().mockReturnValue({
      jpeg: jest.fn().mockReturnValue({
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
      }),
    }),
  });
  return mockSharp;
});

describe('MobileService', () => {
  let service: MobileService;
  let prisma: any;
  let storageService: any;

  const mockUploadResult = {
    url: '/documents/mobile/user1/2026-02-16/test.jpg',
    path: 'mobile/user1/2026-02-16/test.jpg',
    filename: 'test.jpg',
    size: 1024,
    mimetype: 'image/jpeg',
  };

  const mockThumbnailResult = {
    url: '/documents/mobile/user1/2026-02-16/thumbnails/thumb_test.jpg',
    path: 'mobile/user1/2026-02-16/thumbnails/thumb_test.jpg',
    filename: 'thumb_test.jpg',
    size: 512,
    mimetype: 'image/jpeg',
  };

  const validFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  beforeEach(async () => {
    prisma = {
      mobileUpload: {
        create: jest.fn().mockResolvedValue({
          id: 'upload-1',
          userId: 'user1',
          originalUrl: mockUploadResult.url,
          thumbnailUrl: mockThumbnailResult.url,
          fileName: 'test.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
          storagePath: mockUploadResult.path,
        }),
      },
    };

    storageService = {
      uploadFile: jest.fn().mockResolvedValue(mockUploadResult),
      uploadStream: jest.fn().mockResolvedValue(mockThumbnailResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  describe('uploadFile', () => {
    it('should upload a file and return URLs', async () => {
      const result = await service.uploadFile(validFile, 'user1');

      expect(result.originalUrl).toBe(mockUploadResult.url);
      expect(result.thumbnailUrl).toBe(mockThumbnailResult.url);
      expect(result.fileName).toBe('test.jpg');
      expect(result.fileSize).toBe(1024);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should upload original file to MinIO', async () => {
      await service.uploadFile(validFile, 'user1');

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        validFile,
        expect.stringMatching(/^mobile\/user1\/\d{4}-\d{2}-\d{2}$/),
      );
    });

    it('should generate and upload thumbnail', async () => {
      await service.uploadFile(validFile, 'user1');

      expect(storageService.uploadStream).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('thumb_'),
        'image/jpeg',
        expect.stringContaining('thumbnails'),
      );
    });

    it('should save upload record to database', async () => {
      await service.uploadFile(validFile, 'user1');

      expect(prisma.mobileUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          originalUrl: mockUploadResult.url,
          thumbnailUrl: mockThumbnailResult.url,
          fileName: 'test.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
        }),
      });
    });

    it('should throw BusinessException when file is null', async () => {
      await expect(
        service.uploadFile(null as any, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException when file is undefined', async () => {
      await expect(
        service.uploadFile(undefined as any, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException for unsupported MIME type', async () => {
      const pdfFile = { ...validFile, mimetype: 'application/pdf' };

      await expect(
        service.uploadFile(pdfFile, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject GIF files', async () => {
      const gifFile = { ...validFile, mimetype: 'image/gif' };

      await expect(
        service.uploadFile(gifFile, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException when file size exceeds 5MB', async () => {
      const largeFile = { ...validFile, size: 6 * 1024 * 1024 };

      await expect(
        service.uploadFile(largeFile, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should accept file exactly at 5MB limit', async () => {
      const maxFile = { ...validFile, size: 5 * 1024 * 1024 };

      const result = await service.uploadFile(maxFile, 'user1');
      expect(result).toBeDefined();
    });

    it('should accept PNG files', async () => {
      const pngFile = { ...validFile, mimetype: 'image/png' };

      const result = await service.uploadFile(pngFile, 'user1');
      expect(result).toBeDefined();
    });

    it('should throw BusinessException when storage fails', async () => {
      storageService.uploadFile.mockRejectedValue(new Error('Storage error'));

      await expect(
        service.uploadFile(validFile, 'user1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should re-throw BusinessException from storage', async () => {
      const bError = new BusinessException(500002, 'Storage down');
      storageService.uploadFile.mockRejectedValue(bError);

      await expect(
        service.uploadFile(validFile, 'user1'),
      ).rejects.toThrow(bError);
    });
  });

  describe('uploadFiles', () => {
    it('should upload multiple files and return results', async () => {
      const files = [validFile, { ...validFile, originalname: 'test2.jpg' }];

      const result = await service.uploadFiles(files, 'user1');

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.files).toHaveLength(2);
    });

    it('should handle partial failures in batch upload', async () => {
      storageService.uploadFile
        .mockResolvedValueOnce(mockUploadResult)
        .mockRejectedValueOnce(new Error('Failed'));

      const files = [validFile, { ...validFile, originalname: 'test2.jpg' }];

      const result = await service.uploadFiles(files, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle all failures in batch upload', async () => {
      storageService.uploadFile.mockRejectedValue(new Error('All fail'));

      const files = [validFile, { ...validFile, originalname: 'test2.jpg' }];

      const result = await service.uploadFiles(files, 'user1');

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.files).toHaveLength(0);
    });

    it('should handle empty files array', async () => {
      const result = await service.uploadFiles([], 'user1');

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.files).toHaveLength(0);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate a thumbnail buffer', async () => {
      const result = await service.generateThumbnail(Buffer.from('image'));

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
