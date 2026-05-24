/**
 * RecordService (LearningRecord).findAll with ownership filtering
 * LearningRecord.userId — direct FK filter.
 */
import { RecordService } from './record.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService(
  memberIds: string[] = [],
  trainerProject?: { id: string; trainerId: string },
  learningRecords: any[] = [],
) {
  const prisma: any = {
    learningRecord: { findMany: jest.fn().mockResolvedValue(learningRecords) },
    user: { findMany: jest.fn().mockResolvedValue(memberIds.map((id) => ({ id, name: 'n', department: 'd' }))) },
    trainingProject: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
        if (trainerProject && where.id === trainerProject.id) return Promise.resolve(trainerProject);
        return Promise.resolve(null);
      }),
    },
  };
  return { svc: new RecordService(prisma), prisma };
}

describe('RecordService (LearningRecord).findAll with ownership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin gets all records (no user filter)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await svc.findAll(o);
    const callWhere = prisma.learningRecord.findMany.mock.calls[0][0].where;
    expect(callWhere).not.toHaveProperty('userId');
  });

  it('user sees their own learning records', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o);
    expect(prisma.learningRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u-1' }) }),
    );
  });

  it('leader sees records of managed-dept members', async () => {
    const { svc, prisma } = freshService(['m-1', 'm-2']);
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await svc.findAll(o);
    expect(prisma.learningRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: { in: ['m-1', 'm-2'] } }) }),
    );
  });

  it('returned records include user.name and user.department (manual userMap lookup)', async () => {
    // Simulate one record with userId so fetchRecordsWithUser calls user.findMany
    const records = [{ id: 'rec-1', userId: 'u-1', createdAt: new Date() }];
    const { svc, prisma } = freshService([], undefined, records);
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    const result = await svc.findAll(o);
    // user.findMany should have been called with the userId to enrich records
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['u-1'] } },
        select: expect.objectContaining({ name: true, department: true }),
      }),
    );
    // returned record should have user field attached
    expect((result[0] as any).user).toBeDefined();
  });

  it('trainer with matching projectId bypasses ownership filter and sees all project records', async () => {
    const trainerProject = { id: 'proj-1', trainerId: 'trainer-1' };
    const { svc, prisma } = freshService([], trainerProject);
    const o: OwnershipContext = { userId: 'trainer-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o, 'proj-1');
    // Should query with only projectId filter (trainer bypass), no userId constraint
    const callArg = prisma.learningRecord.findMany.mock.calls[0][0];
    expect(callArg.where).toEqual({ projectId: 'proj-1' });
  });

  it('non-trainer user with projectId still sees only their own records', async () => {
    const trainerProject = { id: 'proj-1', trainerId: 'trainer-1' };
    const { svc, prisma } = freshService([], trainerProject);
    const o: OwnershipContext = { userId: 'other-user', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await svc.findAll(o, 'proj-1');
    const callArg = prisma.learningRecord.findMany.mock.calls[0][0];
    expect(callArg.where).toEqual(expect.objectContaining({ userId: 'other-user' }));
  });
});
