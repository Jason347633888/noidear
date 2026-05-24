/**
 * FragileItemInspectionService.findAll with ownership filtering
 * FragileItemInspection.inspector_id is the user FK.
 * Also covers create() inspector_id fallback to creatorId.
 */
import { FragileItemInspectionService } from './fragile-item-inspection.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    fragileItemInspection: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'created-1' }),
    },
    productionBatch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'batch-1', productId: 'prod-1' }),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({ company_id: 'company-1' }),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new FragileItemInspectionService(prisma), prisma };
}

describe('FragileItemInspectionService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all inspections (no inspector_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(undefined, undefined, o);
    const callWhere = prisma.fragileItemInspection.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('inspector_id');
  });

  it('user sees inspections where inspector_id = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(undefined, undefined, o);
    const callWhere = prisma.fragileItemInspection.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('inspector_id', 'u-1');
  });

  it('leader sees inspections where inspector_id IN managed dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(undefined, undefined, o);
    const callWhere = prisma.fragileItemInspection.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('inspector_id', { in: ['m-1', 'm-2'] });
  });
});

describe('FragileItemInspectionService.create inspector_id fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  const baseDto = {
    production_batch_id: 'batch-1',
    inspected_at: '2024-01-01T00:00:00Z',
    result: 'pass',
  };

  it('no dto.inspector_id → falls back to creatorId', async () => {
    const { svc, prisma } = freshService();
    await svc.create(baseDto as any, 'company-1', 'creator-user-1');
    const callData = prisma.fragileItemInspection.create.mock.calls[0][0].data;
    expect(callData.inspector_id).toBe('creator-user-1');
  });

  it('dto.inspector_id present → preserved as-is, not overwritten', async () => {
    const { svc, prisma } = freshService();
    const dto = { ...baseDto, inspector_id: 'explicit-inspector' };
    await svc.create(dto as any, 'company-1', 'creator-user-1');
    const callData = prisma.fragileItemInspection.create.mock.calls[0][0].data;
    expect(callData.inspector_id).toBe('explicit-inspector');
  });

  it('user who creates without inspector_id would appear in their own findAll', async () => {
    const { svc, prisma } = freshService();
    // Simulate: create sets inspector_id = creatorId
    await svc.create(baseDto as any, 'company-1', 'u-1');
    const createdData = prisma.fragileItemInspection.create.mock.calls[0][0].data;
    expect(createdData.inspector_id).toBe('u-1');

    // findAll for user 'u-1' filters by inspector_id = u-1 → the created record would be visible
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(undefined, undefined, o);
    const callWhere = prisma.fragileItemInspection.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('inspector_id', 'u-1');
  });
});
