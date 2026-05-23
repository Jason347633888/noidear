/**
 * Task 41 Step 5 — EnvironmentRecordService.listForOwnership empty-set fallback
 */
import { EnvironmentRecordService } from './environment-record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    environmentRecord: { findMany: jest.fn().mockResolvedValue([{ id: 'er-1' }]) },
    productionBatch: {},
  };
  return { svc: new EnvironmentRecordService(prisma), prisma };
}

describe('EnvironmentRecordService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user always gets [] (missing inspector FK, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('admin gets all environment records', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(result.length).toBeGreaterThan(0);
  });
});
