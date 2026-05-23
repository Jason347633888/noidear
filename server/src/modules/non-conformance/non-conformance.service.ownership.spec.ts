/**
 * Task 41 Step 5 — NonConformanceService.listForOwnership empty-set fallback
 * NonConformance lacks a user-scoped FK until Task 46 adds discoveredById.
 * user → [] ; leader/admin → existing list (no ownership filter yet).
 */
import { NonConformanceService } from './non-conformance.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    nonConformance: { findMany: jest.fn().mockResolvedValue([{ id: 'nc-1' }]) },
    user: { findMany: jest.fn() },
  };
  const seq: any = {};
  return { svc: new NonConformanceService(prisma, seq), prisma };
}

describe('NonConformanceService.listForOwnership — pending-field fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user always gets [] (missing discoveredById FK, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    const result = await svc.listForOwnership(o);
    expect(result).toEqual([]);
  });

  it('admin gets all records (no filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.nonConformance.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });
});
