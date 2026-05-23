/**
 * Task 38 — RecordService.listForOwnership
 * Record.createdBy is the FK (String), no departmentId on Record directly.
 * leader: needs member lookup via user.departmentId; user: direct createdBy filter.
 */
import { RecordService } from './record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(userFindManyResult: any[] = []) {
  const prisma = {
    record: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue(userFindManyResult) },
    recordTemplate: {},
  } as any;
  const svc = new RecordService(prisma, null as any, null as any);
  return { svc, prisma };
}

describe('RecordService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all records (no createdBy filter)', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(ownership, {});
    const callWhere = prisma.record.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('createdBy');
  });

  it('user sees only records they created', async () => {
    const { svc, prisma } = freshService();
    const ownership: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] };
    await svc.listForOwnership(ownership, {});
    const callWhere = prisma.record.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ createdBy: 'u-1' });
  });

  it('leader sees records created by members of managed depts', async () => {
    const { svc, prisma } = freshService([{ id: 'm-1' }, { id: 'm-2' }]);
    const ownership: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(ownership, {});
    const callWhere = prisma.record.findMany.mock.calls[0][0].where;
    expect(callWhere).toMatchObject({ createdBy: { in: ['m-1', 'm-2'] } });
  });
});
