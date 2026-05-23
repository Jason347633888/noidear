/**
 * ScrapService.findAll with ownership filtering
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

describe('ScrapService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all scraps (no requesterId filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(o);
    const callWhere = prisma.materialScrap.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('requesterId');
  });

  it('user sees scraps they requested (requesterId = userId)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o);
    const callWhere = prisma.materialScrap.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('requesterId', 'u-1');
  });

  it('leader sees scraps from managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(o);
    const callWhere = prisma.materialScrap.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('requesterId', { in: ['m-1', 'm-2'] });
  });
});
