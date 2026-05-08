import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const SYSTEM_ROLES = [
  { code: 'admin', name: '系统管理员', description: '系统内置角色：admin' },
  { code: 'leader', name: '部门负责人', description: '系统内置角色：leader' },
  { code: 'user', name: '普通用户', description: '系统内置角色：user' },
] as const;

type EnsureOptions = {
  ensureAdminUser?: boolean;
  adminPasswordHash?: string;
};

export async function ensureSystemRoleBaseline(prisma: PrismaClient, options: EnsureOptions = {}) {
  const roles = await Promise.all(
    SYSTEM_ROLES.map((item) =>
      prisma.role.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          deletedAt: null,
        },
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
        },
      }),
    ),
  );

  const adminRole = roles.find((item) => item.code === 'admin');
  if (!adminRole) throw new Error('系统角色基线异常：admin 未创建成功');

  if (options.ensureAdminUser) {
    const admin = await prisma.user.findFirst({
      where: { username: 'admin', deletedAt: null },
      select: { id: true },
    });

    if (admin) {
      await prisma.user.updateMany({
        where: { username: 'admin', deletedAt: null },
        data: { roleId: adminRole.id },
      });
    } else {
      await prisma.user.create({
        data: {
          id: randomUUID(),
          username: 'admin',
          name: '系统管理员',
          password: options.adminPasswordHash!,
          status: 'active',
          roleId: adminRole.id,
        },
      });
    }
  }

  return {
    systemRoleCodes: roles.map((item) => item.code),
    adminRoleId: adminRole.id,
  };
}
