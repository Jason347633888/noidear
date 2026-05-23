/**
 * Task 45 Step 1 — RecordService (LearningRecord).listForOwnership
 * LearningRecord.userId — direct FK filter.
 */
import { RecordService } from './record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(memberIds: string[] = []) {
  const prisma: any = {
    learningRecord: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id }))) },
  };
  return { svc: new RecordService(prisma), prisma };
}

describe('RecordService (LearningRecord).listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all records (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.listForOwnership(o);
    const callWhere = prisma.learningRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('userId');
  });

  it('user sees their own learning records', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.listForOwnership(o);
    expect(prisma.learningRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-1' } }),
    );
  });

  it('leader sees records of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.listForOwnership(o);
    expect(prisma.learningRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ['m-1', 'm-2'] } } }),
    );
  });
});
