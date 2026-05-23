/**
 * P1-R3-4 — TaskService.listForUser user role uses department filter
 */
import { TaskService } from './task.service';
import { OwnershipContext } from '../module-access/ownership-context';

function makePrisma() {
  return {
    task: {
      findMany: jest.fn().mockResolvedValue([{ id: 'task-1', departmentId: 'dept-1' }]),
      count: jest.fn().mockResolvedValue(1),
    },
    user: { findUnique: jest.fn() },
    taskRecord: { findFirst: jest.fn() },
    notification: { createMany: jest.fn() },
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new TaskService(prisma as any, {} as any);
}

describe('TaskService.listForUser — user role department filter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user role filters by departmentId (not creatorId)', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    const ownership: OwnershipContext = {
      userId: 'u-1',
      roleCode: 'user',
      departmentId: 'dept-1',
      managedDepartmentIds: [],
    };

    await service.listForUser(ownership, { page: 1, limit: 10 });

    const callArgs = prisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ departmentId: 'dept-1' });
    expect(callArgs.where).not.toHaveProperty('creatorId');
  });

  it('leader role filters by managedDepartmentIds', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    const ownership: OwnershipContext = {
      userId: 'l-1',
      roleCode: 'leader',
      departmentId: 'dept-1',
      managedDepartmentIds: ['dept-1', 'dept-2'],
    };

    await service.listForUser(ownership, { page: 1, limit: 10 });

    const callArgs = prisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ departmentId: { in: ['dept-1', 'dept-2'] } });
  });

  it('admin role sees all tasks (no filter)', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    const ownership: OwnershipContext = {
      userId: 'a-1',
      roleCode: 'admin',
      departmentId: null,
      managedDepartmentIds: undefined,
    };

    await service.listForUser(ownership, { page: 1, limit: 10 });

    const callArgs = prisma.task.findMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty('creatorId');
    expect(callArgs.where).not.toHaveProperty('departmentId');
  });
});
