/**
 * Task 42 Step 1 — RecordService (MaintenanceRecord).listForOwnership
 * MaintenanceRecord.performerId / reviewerId are the user FKs.
 */
import { RecordService } from './record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    maintenanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const plan: any = {};
  const stats: any = {};
  return { svc: new RecordService(prisma, plan, stats), prisma };
}

describe('RecordService (MaintenanceRecord).listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all records (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.maintenanceRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('performerId');
    expect(callWhere).not.toHaveProperty('reviewerId');
  });

  it('user sees records where they performed or reviewed', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.maintenanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ performerId: 'u-1' }, { reviewerId: 'u-1' }] },
      }),
    );
  });

  it('leader sees records where managed-dept members performed or reviewed', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.maintenanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ performerId: { in: ['m-1', 'm-2'] } }, { reviewerId: { in: ['m-1', 'm-2'] } }] },
      }),
    );
  });
});
