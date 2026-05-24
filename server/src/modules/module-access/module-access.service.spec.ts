import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessService', () => {
  let service: ModuleAccessService;
  let prisma: any;

  beforeEach(async () => {
    const txMock = {
      moduleAccessConfig: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      moduleAccessConfig: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => fn(txMock)),
      _txMock: txMock,
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

  it('leader: modules with no DB row default to enabled (default-true model)', async () => {
    // DB has warehouse=true, training=false, other 7 modules have no row → default true
    prisma.moduleAccessConfig.findMany.mockResolvedValue([
      { moduleKey: 'warehouse', roleCode: 'leader', enabled: true },
      { moduleKey: 'training', roleCode: 'leader', enabled: false },
    ]);
    const enabled = await service.getEnabledModulesFor({ roleCode: 'leader' });
    // training is explicitly disabled; all others (including no-row modules) are enabled
    expect(enabled).not.toContain('training');
    expect(enabled).toContain('warehouse');
    expect(enabled.length).toBe(8); // 9 total − 1 explicitly disabled
  });

  it('leader: empty DB table returns all module keys (P1-R10-1 default-true)', async () => {
    // Fresh deploy: no rows exist yet → must NOT return [] (old broken behavior)
    prisma.moduleAccessConfig.findMany.mockResolvedValue([]);
    const enabled = await service.getEnabledModulesFor({ roleCode: 'leader' });
    expect(enabled.length).toBe(9);
    expect(enabled).toContain('warehouse');
    expect(enabled).toContain('work_execution');
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

  it('saveMatrix upserts every (moduleKey, roleCode) pair inside a transaction', async () => {
    await service.saveMatrix([
      { moduleKey: 'warehouse', leader: false, user: true },
      { moduleKey: 'training', leader: true, user: true },
    ]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma._txMock.moduleAccessConfig.upsert).toHaveBeenCalledTimes(4);
  });

  it('saveMatrix rolls back all changes when one upsert throws mid-transaction', async () => {
    let callCount = 0;
    prisma._txMock.moduleAccessConfig.upsert.mockImplementation(() => {
      callCount++;
      if (callCount === 2) throw new Error('DB error on 2nd call');
      return Promise.resolve({});
    });

    // Override $transaction to actually propagate the error (simulate real tx rollback)
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      return fn(prisma._txMock);
    });

    await expect(
      service.saveMatrix([
        { moduleKey: 'warehouse', leader: false, user: true },
        { moduleKey: 'training', leader: true, user: true },
      ]),
    ).rejects.toThrow('DB error on 2nd call');

    // Transaction was called, meaning rollback semantics are delegated to Prisma
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('saveMatrix rejects unknown moduleKey (before any DB call)', async () => {
    await expect(service.saveMatrix([{ moduleKey: 'not_a_module' as any, leader: true, user: true }]))
      .rejects.toThrow(/unknown module/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
