import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

const SYSTEM_ROLES = [
  { code: 'admin', name: '系统管理员', description: '系统内置角色：admin' },
  { code: 'leader', name: '部门负责人', description: '系统内置角色：leader' },
  { code: 'user', name: '普通用户', description: '系统内置角色：user' },
] as const;

type EnsureOptions = {
  ensureAdminUser?: boolean;
  ensureMinimumOrganization?: boolean;
  adminPasswordHash?: string;
  seedUserPasswordHash?: string;
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
  const leaderRole = roles.find((item) => item.code === 'leader');
  const userRole = roles.find((item) => item.code === 'user');
  if (!adminRole) throw new Error('系统角色基线异常：admin 未创建成功');
  if (!leaderRole) throw new Error('系统角色基线异常：leader 未创建成功');
  if (!userRole) throw new Error('系统角色基线异常：user 未创建成功');

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

  let minimumOrganization:
    | { departmentCode: string; leaderUsername: string; userUsername: string }
    | undefined;

  if (options.ensureMinimumOrganization) {
    const seedUserPasswordHash = options.seedUserPasswordHash ?? options.adminPasswordHash;
    if (!seedUserPasswordHash) {
      throw new Error('创建最小组织基线需要 seedUserPasswordHash 或 adminPasswordHash');
    }

    const existingDepartment = await prisma.department.findUnique({
      where: { code: 'SEED_BASELINE' },
    });
    if (existingDepartment && existingDepartment.id !== 'dept_seed_baseline') {
      throw new Error('SEED_BASELINE 部门编码已被非基线记录占用');
    }

    const department = existingDepartment
      ? await prisma.department.update({
          where: { id: 'dept_seed_baseline' },
          data: {
            name: '基线部门',
            status: 'active',
            deletedAt: null,
          },
        })
      : await prisma.department.create({
          data: {
            id: 'dept_seed_baseline',
            code: 'SEED_BASELINE',
            name: '基线部门',
            status: 'active',
          },
        });

    const existingLeader = await prisma.user.findUnique({ where: { username: 'seed_leader' } });
    if (existingLeader && existingLeader.id !== 'user_seed_baseline_leader') {
      throw new Error('seed_leader 用户名已被非基线记录占用');
    }

    const leader = existingLeader
      ? await prisma.user.update({
          where: { id: 'user_seed_baseline_leader' },
          data: {
            name: '基线部门负责人',
            status: 'active',
            departmentId: department.id,
            roleId: leaderRole.id,
            deletedAt: null,
          },
        })
      : await prisma.user.create({
          data: {
            id: 'user_seed_baseline_leader',
            username: 'seed_leader',
            name: '基线部门负责人',
            password: seedUserPasswordHash,
            status: 'active',
            roleId: leaderRole.id,
            departmentId: department.id,
          },
        });

    const existingMember = await prisma.user.findUnique({ where: { username: 'seed_user' } });
    if (existingMember && existingMember.id !== 'user_seed_baseline_member') {
      throw new Error('seed_user 用户名已被非基线记录占用');
    }

    if (existingMember) {
      await prisma.user.update({
        where: { id: 'user_seed_baseline_member' },
        data: {
          name: '基线业务用户',
          status: 'active',
          departmentId: department.id,
          roleId: userRole.id,
          deletedAt: null,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          id: 'user_seed_baseline_member',
          username: 'seed_user',
          name: '基线业务用户',
          password: seedUserPasswordHash,
          status: 'active',
          roleId: userRole.id,
          departmentId: department.id,
        },
      });
    }

    await prisma.department.update({
      where: { id: department.id },
      data: { managerId: leader.id },
    });

    minimumOrganization = {
      departmentCode: department.code,
      leaderUsername: 'seed_leader',
      userUsername: 'seed_user',
    };
  }

  return {
    systemRoleCodes: roles.map((item) => item.code),
    adminRoleId: adminRole.id,
    minimumOrganization,
  };
}
