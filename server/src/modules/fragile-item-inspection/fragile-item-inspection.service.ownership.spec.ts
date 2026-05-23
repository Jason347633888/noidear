/**
 * FragileItemInspectionService.findAll with ownership filtering
 * FragileItemInspection.inspector_id is the user FK.
 */
import { FragileItemInspectionService } from './fragile-item-inspection.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    fragileItemInspection: { findMany: jest.fn().mockResolvedValue([]) },
    productionBatch: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
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
