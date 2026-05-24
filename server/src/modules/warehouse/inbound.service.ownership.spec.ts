/**
 * InboundService.findAll with ownership filtering
 * MaterialInbound.operatorId (String?) — direct FK filter.
 */
import { InboundService } from './inbound.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    materialInbound: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const batchGen: any = {};
  const inventoryLedger: any = {};
  const supplierAccess: any = {};
  return { svc: new InboundService(prisma, batchGen, undefined, inventoryLedger, supplierAccess), prisma };
}

const emptyQuery = { page: 1, limit: 10 };

describe('InboundService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all inbounds (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(emptyQuery, o);
    const callWhere = prisma.materialInbound.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operatorId');
  });

  it('user sees inbounds where they are the operator', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(emptyQuery, o);
    expect(prisma.materialInbound.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operatorId: 'u-1' }) }),
    );
  });

  it('leader sees inbounds operated by managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(emptyQuery, o);
    expect(prisma.materialInbound.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operatorId: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});
