import { OrgBootstrapService } from './org-bootstrap.service';

describe('OrgBootstrapService', () => {
  let prisma: any;
  let service: OrgBootstrapService;

  beforeEach(() => {
    prisma = {
      role: { count: jest.fn() },
      department: { count: jest.fn() },
      user: { count: jest.fn() },
      systemConfig: { upsert: jest.fn(), findUnique: jest.fn() },
    };
    service = new OrgBootstrapService(prisma);
  });

  it('缺部门时返回 departments 步骤', async () => {
    prisma.role.count.mockResolvedValue(3);
    prisma.department.count.mockResolvedValue(0);

    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('departments');
    expect(status.reasons).toContain('missing_department');
  });

  it('缺系统角色时返回 system_role_baseline 步骤', async () => {
    prisma.role.count.mockResolvedValue(2);
    prisma.department.count.mockResolvedValue(0);

    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('system_role_baseline');
    expect(status.reasons).toContain('missing_system_roles');
  });

  it('只有部门 + leader 负责人时仍返回 department_members 步骤', async () => {
    prisma.role.count.mockResolvedValue(3);
    // department.count is called twice: total departments, then managed departments
    prisma.department.count
      .mockResolvedValueOnce(1) // departments >= 1
      .mockResolvedValueOnce(1); // managedDepartments >= 1 (has leader manager)
    prisma.user.count.mockResolvedValue(0); // no 'user' role members with departmentId

    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('department_members');
    expect(status.reasons).toContain('missing_business_member');
  });

  it('leader 角色用户不能满足 businessMembers 条件，查询必须过滤 roleObj.code === user', async () => {
    prisma.role.count.mockResolvedValue(3);
    prisma.department.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    // Simulate: even if there's a leader in a dept, user.count with roleObj filter returns 0
    prisma.user.count.mockResolvedValue(0);

    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('department_members');

    // Verify the user.count query included roleObj filter
    const userCountCall = prisma.user.count.mock.calls[0][0];
    expect(userCountCall.where.roleObj).toBeDefined();
    expect(userCountCall.where.roleObj.code).toBe('user');
    expect(userCountCall.where.roleObj.deletedAt).toBeNull();
  });

  it('添加普通 user 角色业务成员后 completed', async () => {
    prisma.role.count.mockResolvedValue(3);
    prisma.department.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.user.count.mockResolvedValue(1); // one 'user' role member in dept
    prisma.systemConfig.upsert.mockResolvedValue({});

    const status = await service.getStatus();

    expect(status.completed).toBe(true);
    expect(status.step).toBe('completed');
    expect(prisma.systemConfig.upsert).toHaveBeenCalled();
  });

  it('缺部门负责人时返回 department_manager 步骤', async () => {
    prisma.role.count.mockResolvedValue(3);
    prisma.department.count
      .mockResolvedValueOnce(1)  // departments >= 1
      .mockResolvedValueOnce(0); // managedDepartments == 0
    prisma.user.count.mockResolvedValue(0);

    const status = await service.getStatus();

    expect(status.completed).toBe(false);
    expect(status.step).toBe('department_manager');
    expect(status.reasons).toContain('missing_department_manager');
  });
});
