/**
 * Task 44 Step 3 — MaterialService admin-only write guard
 * Material is master data: writes are admin-only (service layer, not @Roles).
 */
import { MaterialService } from './material.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    material: { create: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  };
  return { svc: new MaterialService(prisma), prisma };
}

describe('MaterialService admin-only write guard', () => {
  it('admin can call createForOwnership without error', async () => {
    const { svc, prisma } = freshService();
    prisma.material.create.mockResolvedValue({ id: 'm-1' });
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    await expect(svc.createForOwnership({} as any, o)).resolves.not.toThrow();
  });

  it('leader calling createForOwnership gets ForbiddenException', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    await expect(svc.createForOwnership({} as any, o)).rejects.toMatchObject({ message: '仅管理员可写入物料主数据' });
  });

  it('user calling createForOwnership gets ForbiddenException', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    await expect(svc.createForOwnership({} as any, o)).rejects.toMatchObject({ message: '仅管理员可写入物料主数据' });
  });
});
