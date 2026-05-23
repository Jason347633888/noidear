/**
 * Task 42 Step 3 — EquipmentService.listForOwnership empty-set fallback
 * Equipment lacks responsiblePersonId FK until Task 46.
 * user → []; leader/admin → findMany({})
 */
import { EquipmentService } from './equipment.service';
import { OwnershipContext } from '../module-access/ownership-context';

function freshService() {
  const prisma: any = {
    equipment: { findMany: jest.fn().mockResolvedValue([{ id: 'eq-1' }]) },
  };
  return { svc: new EquipmentService(prisma), prisma };
}

describe('EquipmentService.listForOwnership', () => {
  beforeEach(() => jest.clearAllMocks());

  it('user gets [] (missing responsiblePersonId FK, deferred to Task 46)', async () => {
    const { svc } = freshService();
    const o: OwnershipContext = { userId: 'u-1', roleCode: 'user', departmentId: 'd', managedDepartmentIds: [] };
    expect(await svc.listForOwnership(o)).toEqual([]);
  });

  it('leader gets all equipment (empty-set fallback, deferred to Task 46)', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] };
    const result = await svc.listForOwnership(o);
    expect(prisma.equipment.findMany).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });

  it('admin gets all equipment', async () => {
    const { svc, prisma } = freshService();
    const o: OwnershipContext = { userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined };
    const result = await svc.listForOwnership(o);
    expect(prisma.equipment.findMany).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
  });
});
