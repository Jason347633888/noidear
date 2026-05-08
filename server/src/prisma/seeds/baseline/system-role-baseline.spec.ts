import { ensureSystemRoleBaseline } from './system-role-baseline';

describe('ensureSystemRoleBaseline', () => {
  const prisma = {
    role: { upsert: jest.fn() },
    user: { upsert: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('会 upsert admin/leader/user 三个系统角色并保证 admin 用户绑定 admin roleId', async () => {
    prisma.role.upsert
      .mockResolvedValueOnce({ id: 'r-admin', code: 'admin' })
      .mockResolvedValueOnce({ id: 'r-leader', code: 'leader' })
      .mockResolvedValueOnce({ id: 'r-user', code: 'user' });
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
});
