/**
 * Task 41 — ReworkRecordService.listForOwnership
 * ReworkRecord.operator_id (nullable) is the user FK.
 */
import { ReworkRecordService } from './rework-record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    reworkRecord: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
    nonConformance: {},
  };
  return { svc: new ReworkRecordService(prisma), prisma };
}

describe('ReworkRecordService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees all rework records (no operator_id filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.reworkRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('operator_id');
  });

  it('user sees only rework records they operated', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.reworkRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operator_id: 'u-1' }) }),
    );
  });

  it('leader sees rework records of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.reworkRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ operator_id: { in: ['m-1', 'm-2'] } }) }),
    );
  });
});
