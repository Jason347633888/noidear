import { Test } from '@nestjs/testing';
import { ModuleAccessController } from './module-access.controller';
import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessController', () => {
  let controller: ModuleAccessController;
  let service: jest.Mocked<ModuleAccessService>;

  beforeEach(async () => {
    service = { getEnabledModulesFor: jest.fn() } as any;
    const mod = await Test.createTestingModule({
      controllers: [ModuleAccessController],
      providers: [{ provide: ModuleAccessService, useValue: service }],
    }).compile();
    controller = mod.get(ModuleAccessController);
  });

  it('returns roleCode + enabledModules for current user', async () => {
    service.getEnabledModulesFor.mockResolvedValue(['warehouse', 'training']);
    const result = await controller.getMine({ user: { roleCode: 'user' } } as any);
    expect(result).toEqual({ roleCode: 'user', enabledModules: ['warehouse', 'training'] });
  });

  it('admin bypass — service returns all 9 keys', async () => {
    service.getEnabledModulesFor.mockResolvedValue([
      'work_execution', 'document_approval', 'production_execution', 'product_rd',
      'quality_compliance', 'equipment_site', 'traceability_batch', 'warehouse', 'training',
    ]);
    const result = await controller.getMine({ user: { roleCode: 'admin' } } as any);
    expect(result.enabledModules.length).toBe(9);
  });
});
