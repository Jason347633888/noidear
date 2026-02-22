import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService, UploadResult } from '../src/common/services/storage.service';
import { BusinessException } from '../src/common/exceptions/business.exception';

// Mock the minio Client
const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  getObject: jest.fn(),
  removeObject: jest.fn(),
  statObject: jest.fn(),
  presignedGetObject: jest.fn(),
  copyObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

describe('StorageService (MinIO)', () => {
  let service: StorageService;

  const TEST_BUCKET = 'test-bucket';

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: 9000,
        MINIO_USE_SSL: 'false',
        MINIO_BUCKET: TEST_BUCKET,
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      // Use environment variables with fallback for testing
      const config: Record<string, string> = {
        MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'mock-test-value',
        MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'mock-test-value',
      };
      if (!config[key]) throw new Error(`Missing ${key}`);
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('ensureBucket', () => {
    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.ensureBucket();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(TEST_BUCKET);
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await service.ensureBucket();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(TEST_BUCKET);
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(TEST_BUCKET);
    });
  });

  describe('uploadFile', () => {
    const mockFile: Express.Multer.File = {
      originalname: 'test-document.pdf',
      buffer: Buffer.from('test content'),
      size: 12,
      mimetype: 'application/pdf',
      fieldname: 'file',
      encoding: '7bit',
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload file successfully and return UploadResult', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });

      const result: UploadResult = await service.uploadFile(mockFile, 'documents');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('path');
      expect(result.filename).toBe('test-document.pdf');
      expect(result.size).toBe(12);
      expect(result.mimetype).toBe('application/pdf');
      expect(result.url).toContain('/' + TEST_BUCKET + '/documents/');
      expect(result.path).toContain('documents/');
      expect(result.path).toContain('.pdf');
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    });

    it('should use default folder when not specified', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });

      const result = await service.uploadFile(mockFile);

      expect(result.path).toContain('uploads/');
    });

    it('should throw BusinessException on upload failure', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('Network error'));

      await expect(service.uploadFile(mockFile)).rejects.toThrow(BusinessException);
    });
  });

  describe('uploadStream', () => {
    it('should upload buffer stream successfully', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'test-etag' });
      const buffer = Buffer.from('stream content');

      const result = await service.uploadStream(buffer, 'report.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      expect(result.filename).toBe('report.xlsx');
      expect(result.size).toBe(buffer.length);
      expect(result.mimetype).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    });

    it('should throw BusinessException on stream upload failure', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('Storage full'));

      await expect(
        service.uploadStream(Buffer.from('data'), 'file.txt', 'text/plain'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getSignedUrl (presigned GET)', () => {
    it('should return presigned URL with default expiry', async () => {
      const expectedUrl = 'http://localhost:9000/test-bucket/documents/file.pdf?token=abc';
      mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const url = await service.getSignedUrl('documents/file.pdf');

      expect(url).toBe(expectedUrl);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        TEST_BUCKET,
        'documents/file.pdf',
        3600,
      );
    });

    it('should return presigned URL with custom expiry', async () => {
      const expectedUrl = 'http://localhost:9000/test-bucket/documents/file.pdf?token=xyz';
      mockMinioClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const url = await service.getSignedUrl('documents/file.pdf', 7200);

      expect(url).toBe(expectedUrl);
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        TEST_BUCKET,
        'documents/file.pdf',
        7200,
      );
    });

    it('should throw BusinessException on presigned URL generation failure', async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('Access denied'));

      await expect(
        service.getSignedUrl('nonexistent/file.pdf'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile('documents/file.pdf');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        TEST_BUCKET,
        'documents/file.pdf',
      );
    });

    it('should throw BusinessException on delete failure', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('File locked'));

      await expect(service.deleteFile('locked/file.pdf')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({ size: 1024 });

      const exists = await service.fileExists('documents/file.pdf');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      const exists = await service.fileExists('nonexistent/file.pdf');

      expect(exists).toBe(false);
    });
  });

  describe('getFile', () => {
    it('should return file buffer', async () => {
      const content = Buffer.from('file content');
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield content;
        },
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await service.getFile('documents/file.pdf');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString()).toBe('file content');
    });

    it('should throw BusinessException when file not found', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('Not found'));

      await expect(service.getFile('nonexistent/file.pdf')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('getFileStream', () => {
    it('should return readable stream', async () => {
      const mockStream = { pipe: jest.fn() };
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const stream = await service.getFileStream('documents/file.pdf');

      expect(stream).toBe(mockStream);
    });

    it('should throw BusinessException when file not found', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('Not found'));

      await expect(
        service.getFileStream('nonexistent/file.pdf'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      mockMinioClient.copyObject.mockResolvedValue(undefined);

      await service.copyFile('source/file.pdf', 'dest/file.pdf');

      expect(mockMinioClient.copyObject).toHaveBeenCalledWith(
        TEST_BUCKET,
        'dest/file.pdf',
        '/' + TEST_BUCKET + '/source/file.pdf',
      );
    });

    it('should throw BusinessException on copy failure', async () => {
      mockMinioClient.copyObject.mockRejectedValue(new Error('Copy failed'));

      await expect(
        service.copyFile('source/file.pdf', 'dest/file.pdf'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const mockStat = {
        size: 2048,
        lastModified: new Date('2026-01-01'),
        etag: 'abc123',
      };
      mockMinioClient.statObject.mockResolvedValue(mockStat);

      const metadata = await service.getFileMetadata('documents/file.pdf');

      expect(metadata.size).toBe(2048);
      expect(metadata.lastModified).toEqual(new Date('2026-01-01'));
      expect(metadata.etag).toBe('abc123');
    });

    it('should throw BusinessException when file not found', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      await expect(
        service.getFileMetadata('nonexistent/file.pdf'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getFileUrl', () => {
    it('should return correct URL format', () => {
      const url = service.getFileUrl('documents/file.pdf');

      expect(url).toBe('/' + TEST_BUCKET + '/documents/file.pdf');
    });
  });
});
