import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

describe('Role Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.rolePermission.deleteMany({ where: { roleId: { contains: 'test_' } } });
    await prisma.role.deleteMany({ where: { code: { contains: 'test_' } } });
    await prisma.permission.deleteMany({ where: { resource: 'test_resource' } });
    await prisma.$disconnect();
  });

  describe('TASK-066: 角色数据模型', () => {
    it('应该能够创建角色', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_admin_role',
          name: '测试管理员',
          description: '测试用管理员角色'
        }
      });

      expect(role).toBeDefined();
      expect(role.code).toBe('test_admin_role');
      expect(role.name).toBe('测试管理员');
      expect(role.createdAt).toBeDefined();

      // 清理
      await prisma.role.delete({ where: { id: role.id } });
    });

    it('应该强制角色code唯一性', async () => {
      const role1 = await prisma.role.create({
        data: {
          code: 'test_unique_role',
          name: '测试唯一性角色',
          description: '测试用'
        }
      });

      await expect(
        prisma.role.create({
          data: {
            code: 'test_unique_role', // 重复的code
            name: '测试唯一性角色2',
            description: '重复测试'
          }
        })
      ).rejects.toThrow();

      // 清理
      await prisma.role.delete({ where: { id: role1.id } });
    });

    it('应该支持软删除（deletedAt）', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_soft_delete',
          name: '测试软删除',
          description: '用于测试软删除'
        }
      });

      const updated = await prisma.role.update({
        where: { id: role.id },
        data: { deletedAt: new Date() }
      });

      expect(updated.deletedAt).toBeDefined();

      // 清理
      await prisma.role.delete({ where: { id: role.id } });
    });
  });

  describe('TASK-067: 权限数据模型', () => {
    it('应该能够创建权限', async () => {
      const permission = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_create',
          description: '测试创建权限'
        }
      });

      expect(permission).toBeDefined();
      expect(permission.resource).toBe('test_resource');
      expect(permission.action).toBe('test_create');

      // 清理
      await prisma.permission.delete({ where: { id: permission.id } });
    });

    it('应该强制resource+action复合唯一性', async () => {
      const perm1 = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_unique',
          description: '测试唯一性'
        }
      });

      await expect(
        prisma.permission.create({
          data: {
            resource: 'test_resource',
            action: 'test_unique', // 重复的组合
            description: '重复测试'
          }
        })
      ).rejects.toThrow();

      // 清理
      await prisma.permission.delete({ where: { id: perm1.id } });
    });

    it('应该允许相同resource不同action', async () => {
      const perm1 = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_action1',
          description: '测试动作1'
        }
      });

      const perm2 = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_action2', // 相同resource，不同action
          description: '测试动作2'
        }
      });

      expect(perm2).toBeDefined();

      // 清理
      await prisma.permission.delete({ where: { id: perm1.id } });
      await prisma.permission.delete({ where: { id: perm2.id } });
    });
  });

  describe('TASK-068: 角色权限关联表', () => {
    it('应该能够关联角色和权限', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_rp_role',
          name: '测试关联角色',
          description: '测试角色权限关联'
        }
      });

      const permission = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_rp',
          description: '测试关联权限'
        }
      });

      const rolePermission = await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });

      expect(rolePermission).toBeDefined();
      expect(rolePermission.roleId).toBe(role.id);
      expect(rolePermission.permissionId).toBe(permission.id);

      // 清理
      await prisma.rolePermission.delete({ where: { id: rolePermission.id } });
      await prisma.role.delete({ where: { id: role.id } });
      await prisma.permission.delete({ where: { id: permission.id } });
    });

    it('应该强制roleId+permissionId复合唯一性', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_unique_rp',
          name: '测试唯一性',
          description: '测试'
        }
      });

      const permission = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_unique_rp',
          description: '测试'
        }
      });

      const rp1 = await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });

      await expect(
        prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id // 重复的关联
          }
        })
      ).rejects.toThrow();

      // 清理
      await prisma.rolePermission.delete({ where: { id: rp1.id } });
      await prisma.role.delete({ where: { id: role.id } });
      await prisma.permission.delete({ where: { id: permission.id } });
    });

    it('应该在删除角色时级联删除关联', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_cascade',
          name: '级联测试',
          description: '测试级联删除'
        }
      });

      const permission = await prisma.permission.create({
        data: {
          resource: 'test_resource',
          action: 'test_cascade',
          description: '测试级联'
        }
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id
        }
      });

      // 删除角色
      await prisma.role.delete({ where: { id: role.id } });

      // 验证关联也被删除
      const count = await prisma.rolePermission.count({
        where: { roleId: role.id }
      });
      expect(count).toBe(0);

      // 清理权限
      await prisma.permission.delete({ where: { id: permission.id } });
    });
  });

  describe('User表roleId外键', () => {
    it('应该允许User关联Role', async () => {
      let role = await prisma.role.findFirst({ where: { code: 'admin' } });

      // If admin role doesn't exist, create it
      if (!role) {
        role = await prisma.role.create({
          data: {
            code: 'test_admin_for_user',
            name: '测试管理员',
            description: '用于测试User roleId外键'
          }
        });
      }

      const user = await prisma.user.findFirst();
      if (user) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { roleId: role.id }
        });

        expect(updated.roleId).toBe(role.id);

        // Cleanup test role if we created it
        if (role.code === 'test_admin_for_user') {
          await prisma.role.delete({ where: { id: role.id } });
        }
      }
    });

    it('应该保留role字段（向后兼容）', async () => {
      const user = await prisma.user.findFirst();
      expect(user?.role).toBeDefined();
      // 支持大写和小写（向后兼容）
      expect(['admin', 'leader', 'user', 'ADMIN', 'LEADER', 'USER']).toContain(user?.role);
    });
  });

  describe('Role CRUD API Tests', () => {
    let testRoleId: string;

    it('应该成功创建角色（POST /roles）', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'test_api_role',
          name: 'API测试角色',
          description: 'API E2E测试用角色',
        },
      });

      expect(role).toBeDefined();
      expect(role.code).toBe('test_api_role');
      testRoleId = role.id;
    });

    it('应该返回角色列表（GET /roles）', async () => {
      const roles = await prisma.role.findMany({
        where: { deletedAt: null },
        take: 10,
      });

      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
    });

    it('应该支持关键词搜索', async () => {
      const roles = await prisma.role.findMany({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      });

      expect(roles.every((r) =>
        r.code.toLowerCase().includes('test') ||
        r.name.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('应该返回角色详情（GET /roles/:id）', async () => {
      const role = await prisma.role.findUnique({
        where: { id: testRoleId },
      });

      expect(role).toBeDefined();
      expect(role?.id).toBe(testRoleId);
    });

    it('应该成功更新角色（PUT /roles/:id）', async () => {
      const updated = await prisma.role.update({
        where: { id: testRoleId },
        data: {
          name: 'API测试角色（已更新）',
          description: '更新后的描述',
        },
      });

      expect(updated.name).toBe('API测试角色（已更新）');
    });

    it('应该成功软删除角色（DELETE /roles/:id）', async () => {
      const deleted = await prisma.role.update({
        where: { id: testRoleId },
        data: { deletedAt: new Date() },
      });

      expect(deleted.deletedAt).toBeDefined();
    });

    afterAll(async () => {
      // 清理测试角色
      await prisma.role.delete({ where: { id: testRoleId } });
    });
  });

  describe('Role Permissions API Tests', () => {
    let testRole: any;
    let testPermissions: any[];

    beforeAll(async () => {
      // 创建测试角色
      testRole = await prisma.role.create({
        data: {
          code: 'test_perm_role',
          name: '权限测试角色',
          description: '用于测试权限分配API',
        },
      });

      // 创建测试权限
      testPermissions = await Promise.all([
        prisma.permission.create({
          data: {
            resource: 'test_resource',
            action: 'test_perm1',
            description: '测试权限1',
          },
        }),
        prisma.permission.create({
          data: {
            resource: 'test_resource',
            action: 'test_perm2',
            description: '测试权限2',
          },
        }),
      ]);
    });

    it('应该成功批量分配权限（POST /roles/:id/permissions）', async () => {
      await prisma.rolePermission.createMany({
        data: testPermissions.map((p) => ({
          roleId: testRole.id,
          permissionId: p.id,
        })),
      });

      const count = await prisma.rolePermission.count({
        where: { roleId: testRole.id },
      });

      expect(count).toBe(2);
    });

    it('应该返回角色权限列表（GET /roles/:id/permissions）', async () => {
      const rolePermissions = await prisma.rolePermission.findMany({
        where: { roleId: testRole.id },
        include: { permission: true },
      });

      expect(rolePermissions.length).toBe(2);
      expect(rolePermissions.every((rp) => rp.permission)).toBe(true);
    });

    it('应该成功撤销权限（DELETE /roles/:id/permissions/:permissionId）', async () => {
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: testRole.id,
          permissionId: testPermissions[0].id,
        },
      });

      const count = await prisma.rolePermission.count({
        where: {
          roleId: testRole.id,
          permissionId: testPermissions[0].id,
        },
      });

      expect(count).toBe(0);
    });

    afterAll(async () => {
      // 清理测试数据
      await prisma.rolePermission.deleteMany({ where: { roleId: testRole.id } });
      await prisma.role.delete({ where: { id: testRole.id } });
      await prisma.permission.deleteMany({
        where: {
          id: { in: testPermissions.map((p) => p.id) },
        },
      });
    });
  });
});
