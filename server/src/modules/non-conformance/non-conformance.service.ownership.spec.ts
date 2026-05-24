/**
 * NonConformanceService.findAll with ownership filtering using discoveredById FK
 * admin → all; user → discoveredById = userId; leader → IN members(managedDepts)
 */
import { NonConformanceService } from './non-conformance.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    nonConformance: { findMany: jest.fn().mockResolvedValue([{ id: 'nc-1' }]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  const seq: any = {};
  return { svc: new NonConformanceService(prisma, seq), prisma };
}

describe('NonConformanceService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all records (no discoveredById filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.findAll('company-1', o);
    expect(result.length).toBeGreaterThan(0);
    const callWhere = prisma.nonConformance.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('discoveredById');
  });

  it('user gets records where discoveredById = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll('company-1', o);
    expect(prisma.nonConformance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ discoveredById: 'u-1' }) }),
    );
  });

  it('leader gets records where discoveredById IN members of managed depts', async () => {
    const { svc, prisma } = freshService(['m-1']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll('company-1', o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1'] } } }),
    );
    expect(prisma.nonConformance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ discoveredById: { in: ['m-1'] } }) }),
    );
  });

  it('leader with no managed depts gets empty results', async () => {
    const { svc, prisma } = freshService();
    prisma.nonConformance.findMany.mockResolvedValue([]);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await svc.findAll('company-1', o);
    expect(result).toEqual([]);
  });
});
