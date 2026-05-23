/**
 * Task 44 Step 1 — ScrapService.listForOwnership
 * MaterialScrap.requesterId — direct FK filter.
 */
import { ScrapService } from './scrap.service';
import { OwnershipContext } from '../../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    materialScrap: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const inventoryLedger: any = {};
  return { svc: new ScrapService(prisma, undefined, inventoryLedger), prisma };
}

describe('ScrapService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all scraps (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.materialScrap.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('requesterId');
  });

  it('user sees scraps they requested', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.materialScrap.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ requesterId: 'u-1' }) }),
    );
  });

  it('leader sees scraps from managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.materialScrap.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ requesterId: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});
