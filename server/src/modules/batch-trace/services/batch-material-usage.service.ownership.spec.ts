/**
 * BatchMaterialUsageService — productionBatchId ownership validation (C1 fix).
 * Regular users cannot write a batch-material-usage record for a production batch
 * they do not own, preventing food safety traceability chain pollution.
 */
import { ForbiddenException } from '@nestjs/common';
import { BatchMaterialUsageService } from './batch-material-usage.service';
import { OwnershipContext } from '../../module-access/ownership-context';

const BASE_DTO = {
  productionBatchId: 'pb-1',
  materialBatchId: 'mb-1',
  recipeLineId: 'line-1',
  quantity: 10,
};

function buildPrisma(opts: {
  visibleBatchIds?: string[];
  memberIds?: string[];
} = {}) {
  const { visibleBatchIds = ['pb-1'], memberIds = [] } = opts;
  return {
    productionBatch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pb-1', recipeId: 'r-1' }),
      findMany: jest.fn().mockResolvedValue(visibleBatchIds.map((id) => ({ id }))),
    },
    recipeLine: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'line-1',
        recipe_id: 'r-1',
        material_id: 'mat-1',
        area_id: 'area-1',
        area_name_snapshot: '测试区',
      }),
    },
    materialBatch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'mb-1', materialId: 'mat-1' }),
    },
    batchMaterialUsage: {
      create: jest.fn().mockResolvedValue({ id: 'usage-1' }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue(memberIds.map((id: string) => ({ id }))),
    },
  };
}

describe('BatchMaterialUsageService.create ownership (C1)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin can write to any productionBatchId regardless of ownership', async () => {
    const prisma: any = buildPrisma();
    const svc = new BatchMaterialUsageService(prisma);
    const ownership: OwnershipContext = {
      userId: 'admin-1',
      roleCode: 'admin',
      departmentId: null,
      managedDepartmentIds: undefined,
    };
    await expect(svc.create(BASE_DTO, ownership)).resolves.toEqual({ id: 'usage-1' });
    expect(prisma.batchMaterialUsage.create).toHaveBeenCalled();
  });

  it('user can write to a productionBatch they own (leader_id = userId)', async () => {
    const prisma: any = buildPrisma({ visibleBatchIds: ['pb-1'] });
    const svc = new BatchMaterialUsageService(prisma);
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd-1',
      managedDepartmentIds: [],
    };
    await expect(svc.create(BASE_DTO, ownership)).resolves.toEqual({ id: 'usage-1' });
  });

  it('user cannot write to a productionBatch they do not own → ForbiddenException', async () => {
    const prisma: any = buildPrisma({ visibleBatchIds: ['pb-other'] }); // pb-1 not visible
    const svc = new BatchMaterialUsageService(prisma);
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'd-1',
      managedDepartmentIds: [],
    };
    const dto = { ...BASE_DTO, productionBatchId: 'pb-1' };
    await expect(svc.create(dto, ownership)).rejects.toThrow(ForbiddenException);
    expect(prisma.batchMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('leader can write to a productionBatch owned by a managed-dept member', async () => {
    // leader's members own pb-1
    const prisma: any = buildPrisma({ visibleBatchIds: ['pb-1'], memberIds: ['u-1'] });
    const svc = new BatchMaterialUsageService(prisma);
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await expect(svc.create(BASE_DTO, ownership)).resolves.toEqual({ id: 'usage-1' });
  });

  it('leader cannot write to a productionBatch outside managed depts → ForbiddenException', async () => {
    // leader's members do not own pb-1
    const prisma: any = buildPrisma({ visibleBatchIds: ['pb-other'], memberIds: ['u-1'] });
    const svc = new BatchMaterialUsageService(prisma);
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'd-1',
      managedDepartmentIds: ['d-1'],
    };
    await expect(svc.create(BASE_DTO, ownership)).rejects.toThrow(ForbiddenException);
    expect(prisma.batchMaterialUsage.create).not.toHaveBeenCalled();
  });

  it('no ownership context (legacy/internal calls) skips check and succeeds', async () => {
    const prisma: any = buildPrisma();
    const svc = new BatchMaterialUsageService(prisma);
    await expect(svc.create(BASE_DTO)).resolves.toEqual({ id: 'usage-1' });
    expect(prisma.batchMaterialUsage.create).toHaveBeenCalled();
  });

  it('does not expose a listForOwnership method', () => {
    const prisma: any = buildPrisma();
    const svc = new BatchMaterialUsageService(prisma);
    expect((svc as any).listForOwnership).toBeUndefined();
  });
});
