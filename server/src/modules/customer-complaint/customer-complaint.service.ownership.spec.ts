/**
 * Task 41 Step 5 — CustomerComplaintService.listForOwnership empty-set fallback
 */
import { CustomerComplaintService } from './customer-complaint.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    customerComplaint: { findMany: jest.fn().mockResolvedValue([{ id: 'cc-1' }]) },
    productionBatch: {},
  };
  return { svc: new CustomerComplaintService(prisma), prisma };
}

describe('CustomerComplaintService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user always gets [] (missing createdById FK, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('admin gets all complaints', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(result.length).toBeGreaterThan(0);
  });
});
