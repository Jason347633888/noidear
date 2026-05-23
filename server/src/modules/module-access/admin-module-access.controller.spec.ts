import { Test } from '@nestjs/testing';
import { AdminModuleAccessController } from './admin-module-access.controller';
import { ModuleAccessService } from './module-access.service';

describe('AdminModuleAccessController', () => {
  let controller: AdminModuleAccessController;
  let service: jest.Mocked<ModuleAccessService>;

  beforeEach(async () => {
    service = { listMatrix: jest.fn(), saveMatrix: jest.fn() } as any;
    const mod = await Test.createTestingModule({
      controllers: [AdminModuleAccessController],
      providers: [{ provide: ModuleAccessService, useValue: service }],
    }).compile();
    controller = mod.get(AdminModuleAccessController);
  });

  it('GET returns matrix payload', async () => {
    service.listMatrix.mockResolvedValue([
      { moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: false },
    ]);
    const r = await controller.list();
    expect(r.modules.length).toBe(1);
    expect(r.modules[0].moduleKey).toBe('warehouse');
  });

  it('PUT calls saveMatrix with parsed rows', async () => {
    service.saveMatrix.mockResolvedValue(undefined);
    service.listMatrix.mockResolvedValue([]);
    await controller.save({ modules: [{ moduleKey: 'warehouse', leader: false, user: true } as any] });
    expect(service.saveMatrix).toHaveBeenCalledWith([
      { moduleKey: 'warehouse', leader: false, user: true },
    ]);
  });
});
