/**
 * Task 45 Step 2 — TrainingService.createProjectForOwnership
 * TrainingProject writes: admin/leader only (service-layer guard, not @Roles).
 */
import { TrainingService } from './training.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    trainingPlan: { findUnique: jest.fn().mockResolvedValue({ id: 'plan-1' }) },
    trainingProject: { create: jest.fn().mockResolvedValue({ id: 'proj-1', trainees: [] }) },
    learningRecord: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    todoTask: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    document: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { svc: new TrainingService(prisma), prisma };
}

describe('TrainingService.createProjectForOwnership', () => {
  it('admin can create a project', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await expect(
      svc.createProjectForOwnership({ planId: 'plan-1', title: 'T', department: 'D', quarter: 1, trainerId: 'a', trainees: [] }, o),
    ).resolves.not.toThrow();
  });

  it('leader can create a project', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await expect(
      svc.createProjectForOwnership({ planId: 'plan-1', title: 'T', department: 'D', quarter: 1, trainerId: 'l-1', trainees: [] }, o),
    ).resolves.not.toThrow();
  });

  it('user calling createProjectForOwnership gets ForbiddenException', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await expect(
      svc.createProjectForOwnership({ planId: 'plan-1', title: 'T', department: 'D', quarter: 1, trainerId: 'u-1', trainees: [] }, o),
    ).rejects.toMatchObject({ message: '仅管理员和负责人可管理培训项目' });
  });
});
