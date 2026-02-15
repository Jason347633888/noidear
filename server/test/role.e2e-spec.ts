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
      const role = await prisma.role.findFirst({ where: { code: 'admin' } });

      const user = await prisma.user.findFirst();
      if (user) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { roleId: role!.id }
        });

        expect(updated.roleId).toBe(role!.id);
      }
    });

    it('应该保留role字段（向后兼容）', async () => {
      const user = await prisma.user.findFirst();
      expect(user?.role).toBeDefined();
      expect(['admin', 'leader', 'user']).toContain(user?.role);
    });
  });
});
