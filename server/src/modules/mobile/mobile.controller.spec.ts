import { Test, TestingModule } from '@nestjs/testing';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

describe('MobileController', () => {
  let controller: MobileController;
  let mobileService: any;

  const mockUploadResponse = {
    originalUrl: '/documents/mobile/user1/2026-02-16/test.jpg',
    thumbnailUrl: '/documents/mobile/user1/2026-02-16/thumbnails/thumb_test.jpg',
    fileName: 'test.jpg',
    fileSize: 1024,
    mimeType: 'image/jpeg',
  };

  const mockBatchResponse = {
    files: [mockUploadResponse],
    successCount: 1,
    failedCount: 0,
  };

  beforeEach(async () => {
    mobileService = {
      uploadFile: jest.fn().mockResolvedValue(mockUploadResponse),
      uploadFiles: jest.fn().mockResolvedValue(mockBatchResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MobileController],
      providers: [
        { provide: MobileService, useValue: mobileService },
      ],
    }).compile();

    controller = module.get<MobileController>(MobileController);
  });

  describe('uploadSingle', () => {
    it('should call mobileService.uploadFile with file and userId', async () => {
      const file = { originalname: 'test.jpg' } as Express.Multer.File;
      const req = { user: { id: 'user1' } };

      const result = await controller.uploadSingle(file, req);

      expect(mobileService.uploadFile).toHaveBeenCalledWith(file, 'user1');
      expect(result).toEqual(mockUploadResponse);
    });
  });

  describe('uploadBatch', () => {
    it('should call mobileService.uploadFiles with files and userId', async () => {
      const files = [
        { originalname: 'test1.jpg' } as Express.Multer.File,
        { originalname: 'test2.jpg' } as Express.Multer.File,
      ];
      const req = { user: { id: 'user1' } };

      const result = await controller.uploadBatch(files, req);

      expect(mobileService.uploadFiles).toHaveBeenCalledWith(files, 'user1');
      expect(result).toEqual(mockBatchResponse);
    });
  });
});
