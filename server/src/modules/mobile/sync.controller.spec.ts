import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

describe('SyncController', () => {
  let controller: SyncController;
  let syncService: any;

  beforeEach(async () => {
    syncService = {
      batchSync: jest.fn(),
      getSyncStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        { provide: SyncService, useValue: syncService },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  describe('batchSync', () => {
    it('should call syncService.batchSync with dto and userId', async () => {
      const mockResponse = {
        results: [{ uuid: 'uuid-1', success: true }],
        successCount: 1,
        failedCount: 0,
      };
      syncService.batchSync.mockResolvedValue(mockResponse);

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: 'uuid-1' },
        ],
      };
      const req = { user: { id: 'user1' } };

      const result = await controller.batchSync(dto, req);

      expect(syncService.batchSync).toHaveBeenCalledWith(dto, 'user1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSyncStatus', () => {
    it('should call syncService.getSyncStatus with userId', async () => {
      const mockStatus = {
        pendingCount: 2,
        lastSyncTime: new Date('2026-02-16T10:00:00Z'),
      };
      syncService.getSyncStatus.mockResolvedValue(mockStatus);

      const req = { user: { id: 'user1' } };

      const result = await controller.getSyncStatus(req);

      expect(syncService.getSyncStatus).toHaveBeenCalledWith('user1');
      expect(result).toEqual(mockStatus);
    });
  });
});
