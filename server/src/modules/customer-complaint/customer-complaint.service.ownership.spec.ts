/**
 * Task 46 update — CustomerComplaintService.listForOwnership with createdById FK
 * admin → all; user → createdById = userId; leader → IN members(managedDepts)
 */
import { CustomerComplaintService } from './customer-complaint.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    customerComplaint: { findMany: jest.fn().mockResolvedValue([{ id: 'cc-1' }]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new CustomerComplaintService(prisma), prisma };
}

describe('CustomerComplaintService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all complaints (no filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.customerComplaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: 'desc' } }),
    );
  });

  it('user gets complaints where createdById = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.customerComplaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: 'u-1' } }),
    );
  });

  it('leader gets complaints where createdById IN members of managed depts', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1'] } } }),
    );
    expect(prisma.customerComplaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdById: { in: ['m-1', 'm-2'] } } }),
    );
  });

  it('leader with no managed depts gets []', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });
});
