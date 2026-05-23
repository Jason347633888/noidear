import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessService', () => {
  let service: ModuleAccessService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      moduleAccessConfig: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const mod = await Test.createTestingModule({
      providers: [ModuleAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(ModuleAccessService);
  });

  it('admin always sees all module keys (DB not queried)', async () => {
    const enabled = await service.getEnabledModulesFor({ roleCode: 'admin' });
    expect(enabled).toContain('warehouse');
    expect(enabled.length).toBe(9);
    expect(prisma.moduleAccessConfig.findMany).not.toHaveBeenCalled();
  });

  it('leader sees only enabled=true modules from DB', async () => {
    prisma.moduleAccessConfig.findMany.mockResolvedValue([
      { moduleKey: 'warehouse', roleCode: 'leader', enabled: true },
      { moduleKey: 'training', roleCode: 'leader', enabled: false },
    ]);
    const enabled = await service.getEnabledModulesFor({ roleCode: 'leader' });
    expect(enabled).toEqual(['warehouse']);
  });

  it('listMatrix returns 9 × 2 rows ordered by spec key order', async () => {
    prisma.moduleAccessConfig.findMany.mockResolvedValue([
      { moduleKey: 'warehouse', roleCode: 'user', enabled: true },
      { moduleKey: 'warehouse', roleCode: 'leader', enabled: true },
    ]);
    const matrix = await service.listMatrix();
    expect(matrix.find((m) => m.moduleKey === 'warehouse')).toEqual({
      moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: true,
    });
  });

  it('saveMatrix upserts every (moduleKey, roleCode) pair', async () => {
    prisma.moduleAccessConfig.upsert.mockResolvedValue({});
    await service.saveMatrix([
      { moduleKey: 'warehouse', leader: false, user: true },
      { moduleKey: 'training', leader: true, user: true },
    ]);
    expect(prisma.moduleAccessConfig.upsert).toHaveBeenCalledTimes(4);
  });

  it('saveMatrix rejects unknown moduleKey', async () => {
    await expect(service.saveMatrix([{ moduleKey: 'not_a_module' as any, leader: true, user: true }]))
      .rejects.toThrow(/unknown module/i);
  });
});
