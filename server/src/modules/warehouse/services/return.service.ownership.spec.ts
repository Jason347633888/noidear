/**
 * ReturnService.findAll with ownership filtering
 * MaterialReturn.requesterId — direct FK filter.
 */
import { ReturnService } from './return.service';
import { OwnershipContext } from '../../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    materialReturn: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const inventoryLedger: any = {};
  return { svc: new ReturnService(prisma, undefined, inventoryLedger), prisma };
}

describe('ReturnService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all returns (no requesterId filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(o);
    const callWhere = prisma.materialReturn.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('requesterId');
  });

  it('user sees returns they requested (requesterId = userId)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o);
    const callWhere = prisma.materialReturn.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('requesterId', 'u-1');
  });

  it('leader sees returns from managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(o);
    const callWhere = prisma.materialReturn.findMany.mock.calls[0][0].where;
    expect(callWhere).toHaveProperty('requesterId', { in: ['m-1', 'm-2'] });
  });
});
