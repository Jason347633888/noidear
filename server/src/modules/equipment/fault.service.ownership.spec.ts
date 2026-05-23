/**
 * Task 42 Step 2 — FaultService (EquipmentFault).listForOwnership
 * EquipmentFault.reporterId / assigneeId are the user FKs.
 */
import { FaultService } from './fault.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    equipmentFault: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const stats: any = {};
  return { svc: new FaultService(prisma, stats), prisma };
}

describe('FaultService (EquipmentFault).listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all faults (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.equipmentFault.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('reporterId');
    expect(callWhere).not.toHaveProperty('assigneeId');
  });

  it('user sees faults they reported or are assigned to', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.equipmentFault.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ reporterId: 'u-1' }, { assigneeId: 'u-1' }] },
      }),
    );
  });

  it('leader sees faults of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.equipmentFault.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ reporterId: { in: ['m-1', 'm-2'] } }, { assigneeId: { in: ['m-1', 'm-2'] } }] },
      }),
    );
  });
});
