import { ensureSystemRoleBaseline } from './system-role-baseline';

describe('ensureSystemRoleBaseline', () => {
  const prisma = {
    role: { upsert: jest.fn() },
    department: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  } as any;

  const mockRoles = () => {
    prisma.role.upsert
      .mockResolvedValueOnce({ id: 'r-admin', code: 'admin' })
      .mockResolvedValueOnce({ id: 'r-leader', code: 'leader' })
      .mockResolvedValueOnce({ id: 'r-user', code: 'user' });
  };

  beforeEach(() => jest.clearAllMocks());

  it('会 upsert admin/leader/user 三个系统角色并保证 admin 用户绑定 admin roleId', async () => {
    mockRoles();
    prisma.user.findFirst.mockResolvedValue({ id: 'u-admin', username: 'admin' });
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await ensureSystemRoleBaseline(prisma, {
      ensureAdminUser: true,
      adminPasswordHash: 'hashed-admin-password',
    });

    expect(result.systemRoleCodes).toEqual(['admin', 'leader', 'user']);
    expect(prisma.role.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { username: 'admin', deletedAt: null },
      data: expect.objectContaining({ roleId: 'r-admin' }),
    });
  });

  it('does not create any department during baseline seed', async () => {
    mockRoles();
    prisma.user.findFirst.mockResolvedValue(null);

    await ensureSystemRoleBaseline(prisma, {
      ensureAdminUser: true,
      adminPasswordHash: 'hash',
    });

    expect(prisma.department.create).not.toHaveBeenCalled();
  });

  it('does not create seed_leader or seed_user during baseline seed', async () => {
    mockRoles();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u-admin', username: 'admin' });

    await ensureSystemRoleBaseline(prisma, {
      ensureAdminUser: true,
      adminPasswordHash: 'hash',
    });

    expect(prisma.user.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: 'seed_leader' }),
      }),
    );
    expect(prisma.user.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: 'seed_user' }),
      }),
    );
  });

  it('creates only admin user when ensureAdminUser is true and admin does not exist', async () => {
    mockRoles();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u-admin', username: 'admin' });

    await ensureSystemRoleBaseline(prisma, {
      ensureAdminUser: true,
      adminPasswordHash: 'hash',
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: 'admin' }),
      }),
    );
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('returns systemRoleCodes without minimumOrganization', async () => {
    mockRoles();

    const result = await ensureSystemRoleBaseline(prisma, {});

    expect(result.systemRoleCodes).toEqual(['admin', 'leader', 'user']);
    expect(result).not.toHaveProperty('minimumOrganization');
  });
});
