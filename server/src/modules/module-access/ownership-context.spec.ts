import { OwnershipContextResolver } from './ownership-context';

describe('OwnershipContextResolver', () => {
  it('admin context: roleCode=admin, managedDepartmentIds undefined (means 全量)', async () => {
    const prisma = { department: { findMany: jest.fn() } } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'admin', departmentId: 'd1' });
    expect(ctx.roleCode).toBe('admin');
    expect(ctx.managedDepartmentIds).toBeUndefined();
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it('leader context: managedDepartmentIds = depts where managerId == userId', async () => {
    const prisma = {
      department: {
        findMany: jest.fn().mockResolvedValue([{ id: 'd-1' }, { id: 'd-2' }]),
      },
    } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'leader', departmentId: 'd-x' });
    expect(ctx.managedDepartmentIds).toEqual(['d-1', 'd-2']);
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: { managerId: 'u' },
      select: { id: true },
    });
  });

  it('user context: managedDepartmentIds = empty', async () => {
    const prisma = { department: { findMany: jest.fn() } } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'user', departmentId: 'd-1' });
    expect(ctx.managedDepartmentIds).toEqual([]);
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });
});
