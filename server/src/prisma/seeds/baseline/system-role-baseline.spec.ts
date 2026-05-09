import { ensureSystemRoleBaseline } from './system-role-baseline';

describe('ensureSystemRoleBaseline', () => {
  const prisma = {
    role: { upsert: jest.fn() },
    department: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  describe('ensureMinimumOrganization', () => {
    it('creates department, leader, member and sets department manager when opt-in', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue(null);
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.department.create.mockResolvedValue({
        id: 'dept_seed_baseline',
        code: 'SEED_BASELINE',
        name: '基线部门',
        status: 'active',
      });
      prisma.user.create
        .mockResolvedValueOnce({
          id: 'user_seed_baseline_leader',
          username: 'seed_leader',
        })
        .mockResolvedValueOnce({
          id: 'user_seed_baseline_member',
          username: 'seed_user',
        });
      prisma.department.update.mockResolvedValue({});

      const result = await ensureSystemRoleBaseline(prisma, {
        ensureMinimumOrganization: true,
        seedUserPasswordHash: 'hashed-seed-password',
      });

      expect(prisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'dept_seed_baseline',
          code: 'SEED_BASELINE',
          name: '基线部门',
          status: 'active',
        }),
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'user_seed_baseline_leader',
            username: 'seed_leader',
            roleId: 'r-leader',
          }),
        }),
      );
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'user_seed_baseline_member',
            username: 'seed_user',
            roleId: 'r-user',
          }),
        }),
      );
      expect(prisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept_seed_baseline' },
        data: { managerId: 'user_seed_baseline_leader' },
      });
      expect(result.minimumOrganization).toEqual({
        departmentCode: 'SEED_BASELINE',
        leaderUsername: 'seed_leader',
        userUsername: 'seed_user',
      });
    });

    it('repairs existing seed-owned records without resetting passwords', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue({
        id: 'dept_seed_baseline',
        code: 'SEED_BASELINE',
      });
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user_seed_baseline_leader', username: 'seed_leader' })
        .mockResolvedValueOnce({ id: 'user_seed_baseline_member', username: 'seed_user' });
      prisma.department.update.mockResolvedValue({
        id: 'dept_seed_baseline',
        code: 'SEED_BASELINE',
      });
      prisma.user.update.mockResolvedValue({});

      await ensureSystemRoleBaseline(prisma, {
        ensureMinimumOrganization: true,
        seedUserPasswordHash: 'hashed-seed-password',
      });

      expect(prisma.department.create).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.department.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dept_seed_baseline' },
          data: expect.objectContaining({
            name: '基线部门',
            status: 'active',
            deletedAt: null,
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_seed_baseline_leader' },
          data: expect.not.objectContaining({ password: expect.anything() }),
        }),
      );
    });

    it('throws when SEED_BASELINE department code is owned by a different id', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue({
        id: 'some-other-id',
        code: 'SEED_BASELINE',
      });

      await expect(
        ensureSystemRoleBaseline(prisma, {
          ensureMinimumOrganization: true,
          seedUserPasswordHash: 'hashed-seed-password',
        }),
      ).rejects.toThrow('SEED_BASELINE 部门编码已被非基线记录占用');
    });

    it('throws when seed_leader username is owned by a different id', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue(null);
      prisma.department.create.mockResolvedValue({
        id: 'dept_seed_baseline',
        code: 'SEED_BASELINE',
      });
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'some-other-id',
        username: 'seed_leader',
      });

      await expect(
        ensureSystemRoleBaseline(prisma, {
          ensureMinimumOrganization: true,
          seedUserPasswordHash: 'hashed-seed-password',
        }),
      ).rejects.toThrow('seed_leader 用户名已被非基线记录占用');
    });

    it('throws when seed_user username is owned by a different id', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue(null);
      prisma.department.create.mockResolvedValue({
        id: 'dept_seed_baseline',
        code: 'SEED_BASELINE',
      });
      prisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'some-other-id', username: 'seed_user' });
      prisma.user.create.mockResolvedValueOnce({
        id: 'user_seed_baseline_leader',
        username: 'seed_leader',
      });

      await expect(
        ensureSystemRoleBaseline(prisma, {
          ensureMinimumOrganization: true,
          seedUserPasswordHash: 'hashed-seed-password',
        }),
      ).rejects.toThrow('seed_user 用户名已被非基线记录占用');
    });

    it('does not create department or users when ensureMinimumOrganization is false', async () => {
      mockRoles();
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await ensureSystemRoleBaseline(prisma, {
        ensureMinimumOrganization: false,
      });

      expect(prisma.department.findUnique).not.toHaveBeenCalled();
      expect(prisma.department.create).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result.minimumOrganization).toBeUndefined();
    });

    it('does not create department or users when ensureMinimumOrganization is omitted', async () => {
      mockRoles();

      const result = await ensureSystemRoleBaseline(prisma, {});

      expect(prisma.department.findUnique).not.toHaveBeenCalled();
      expect(prisma.department.create).not.toHaveBeenCalled();
      expect(result.minimumOrganization).toBeUndefined();
    });
  });
});
