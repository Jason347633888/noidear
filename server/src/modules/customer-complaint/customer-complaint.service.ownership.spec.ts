/**
 * CustomerComplaintService.findAll with ownership filtering using createdById FK
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

describe('CustomerComplaintService.findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all complaints (no createdById filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.findAll('company-1', o);
    expect(result.length).toBeGreaterThan(0);
    const callWhere = prisma.customerComplaint.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('createdById');
  });

  it('user gets complaints where createdById = userId', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll('company-1', o);
    expect(prisma.customerComplaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdById: 'u-1' }) }),
    );
  });

  it('leader gets complaints where createdById IN members of managed depts', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll('company-1', o);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { departmentId: { in: ['d-1'] } } }),
    );
    expect(prisma.customerComplaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdById: { in: ['m-1', 'm-2'] } }) }),
    );
  });

  it('leader with no managed depts gets empty results', async () => {
    const { svc, prisma } = freshService();
    prisma.customerComplaint.findMany.mockResolvedValue([]);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: [] };
    const result = await svc.findAll('company-1', o);
    expect(result).toEqual([]);
  });
});

describe('CustomerComplaintService.create writes createdById', () => {
  const mockPrisma: any = {
    productionBatch: { findUnique: jest.fn().mockResolvedValue({ id: 'batch-1', productId: 'prod-1' }) },
    product: { findFirst: jest.fn().mockResolvedValue({ id: 'prod-1' }) },
    externalParty: { findFirst: jest.fn().mockResolvedValue({ id: 'cust-1', name: 'Acme' }) },
    customerComplaint: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'cc-new', createdById: 'u-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(() => jest.clearAllMocks());

  it('create passes userId as createdById so user can see it in findAll', async () => {
    const svc = new CustomerComplaintService(mockPrisma);
    const dto = {
      production_batch_id: 'batch-1',
      customer_id: 'cust-1',
      complaint_type: 'quality',
      description: 'test',
    } as any;
    await svc.create(dto, 'company-1', 'u-1');
    expect(mockPrisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'u-1' }),
      }),
    );
  });
});
