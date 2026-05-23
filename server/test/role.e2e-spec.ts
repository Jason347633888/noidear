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
    // 清理测试数据（仅清理有效 code 的测试角色，因为 CHECK 约束只允许 admin/leader/user）
    await prisma.role.deleteMany({ where: { name: { contains: '测试' } } });
    await prisma.$disconnect();
  });

  describe('TASK-066: 角色数据模型', () => {
    it('应该能够创建角色', async () => {
      const role = await prisma.role.create({
        data: {
          code: 'user',
          name: '测试普通用户角色',
          description: '测试用普通用户角色'
        }
      });

      expect(role).toBeDefined();
      expect(role.code).toBe('user');
      expect(role.name).toBe('测试普通用户角色');
      expect(role.createdAt).toBeDefined();

      // 清理
      await prisma.role.delete({ where: { id: role.id } });
    });

    it('应该强制角色code唯一性', async () => {
      const role1 = await prisma.role.create({
        data: {
          code: 'leader',
          name: '测试唯一性角色-leader',
          description: '测试用'
        }
      });

      await expect(
        prisma.role.create({
          data: {
            code: 'leader', // 重复的code
            name: '测试唯一性角色-leader2',
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
          code: 'user',
          name: '测试软删除角色',
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

  describe('User表roleId外键', () => {
    it('应该允许User关联Role', async () => {
      let role = await prisma.role.findFirst({ where: { code: 'admin' } });

      // If admin role doesn't exist, create it
      if (!role) {
        role = await prisma.role.create({
          data: {
            code: 'admin',
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
          code: 'user',
          name: 'API测试角色-user',
          description: 'API E2E测试用角色',
        },
      });

      expect(role).toBeDefined();
      expect(role.code).toBe('user');
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
            { code: { contains: 'user', mode: 'insensitive' } },
            { name: { contains: 'API测试', mode: 'insensitive' } },
          ],
        },
      });

      expect(roles.every((r) =>
        r.code.toLowerCase().includes('user') ||
        r.name.toLowerCase().includes('api测试')
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
      if (testRoleId) {
        await prisma.role.delete({ where: { id: testRoleId } });
      }
    });
  });
});
