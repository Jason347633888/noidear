import { Test, TestingModule } from '@nestjs/testing';
import { RecycleBinController } from './recycle-bin.controller';
import { RecycleBinService } from './recycle-bin.service';

describe('RecycleBinController', () => {
  let controller: RecycleBinController;
  let service: RecycleBinService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecycleBinController],
      providers: [
        {
          provide: RecycleBinService,
          useValue: {
            findAll: jest.fn(),
            restore: jest.fn(),
            permanentDelete: jest.fn(),
            batchRestore: jest.fn(),
            batchPermanentDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RecycleBinController>(RecycleBinController);
    service = module.get<RecycleBinService>(RecycleBinService);
  });

  describe('findAll', () => {
    it('应返回回收站列表', async () => {
      const mockResult = {
        list: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResult);

      const req = { user: { id: 'user123', role: 'admin' } };
      const result = await controller.findAll('document', { page: 1, limit: 10 }, req);

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith('document', 1, 10, undefined, 'user123', 'admin');
    });

    it('应支持关键词搜索', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue({
        list: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const req = { user: { id: 'user123', role: 'admin' } };
      await controller.findAll('document', { page: 1, limit: 10, keyword: 'test' }, req);

      expect(service.findAll).toHaveBeenCalledWith('document', 1, 10, 'test', 'user123', 'admin');
    });
  });

  describe('restore', () => {
    it('应恢复项目', async () => {
      const req = { user: { id: 'user123', role: 'admin' } };
      jest.spyOn(service, 'restore').mockResolvedValue(undefined);

      await controller.restore('document', '1', req);

      expect(service.restore).toHaveBeenCalledWith('document', '1', 'user123', 'admin');
    });
  });

  describe('permanentDelete', () => {
    it('应永久删除项目', async () => {
      const req = { user: { id: 'user123', role: 'admin' } };
      jest.spyOn(service, 'permanentDelete').mockResolvedValue(undefined);

      await controller.permanentDelete('document', '1', req);

      expect(service.permanentDelete).toHaveBeenCalledWith('document', '1', 'user123', 'admin');
    });
  });

  describe('batchRestore', () => {
    it('应批量恢复项目', async () => {
      const req = { user: { id: 'user123', role: 'admin' } };
      const dto = { ids: ['1', '2', '3'] };
      jest.spyOn(service, 'batchRestore').mockResolvedValue(undefined);

      await controller.batchRestore('document', dto, req);

      expect(service.batchRestore).toHaveBeenCalledWith('document', ['1', '2', '3'], 'user123', 'admin');
    });
  });

  describe('batchPermanentDelete', () => {
    it('应批量永久删除项目', async () => {
      const req = { user: { id: 'user123', role: 'admin' } };
      const dto = { ids: ['1', '2', '3'] };
      jest.spyOn(service, 'batchPermanentDelete').mockResolvedValue(undefined);

      await controller.batchPermanentDelete('document', dto, req);

      expect(service.batchPermanentDelete).toHaveBeenCalledWith('document', ['1', '2', '3'], 'user123', 'admin');
    });
  });
});
