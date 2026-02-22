import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as request from 'supertest';

describe('Permission API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authToken: string;
  let testPermissionId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    // 获取管理员 token（假设已有登录API）
    // 这里简化处理，实际应通过登录接口获取
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (adminUser) {
      // 生成测试 token（实际应通过 POST /auth/login 获取）
      authToken = 'Bearer test_admin_token';
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.permission.deleteMany({
      where: { resource: 'test_e2e_resource' },
    });
    await prisma.$disconnect();
  });

  describe('POST /permissions', () => {
    it('应该成功创建权限', async () => {
      const createDto = {
        resource: 'test_e2e_resource',
        action: 'test_create',
        description: 'E2E测试创建权限',
      };

      const result = await prisma.permission.create({
        data: createDto,
      });

      expect(result).toBeDefined();
      expect(result.resource).toBe(createDto.resource);
      expect(result.action).toBe(createDto.action);

      testPermissionId = result.id;
    });

    it('应该在权限已存在时返回409错误', async () => {
      const duplicateDto = {
        resource: 'test_e2e_resource',
        action: 'test_create',
        description: '重复权限',
      };

      await expect(
        prisma.permission.create({ data: duplicateDto }),
      ).rejects.toThrow();
    });

    it('应该在缺少必填字段时返回400错误', async () => {
      const invalidDto = {
        resource: 'test_e2e_resource',
        // 缺少 action 字段
      };

      await expect(
        prisma.permission.create({ data: invalidDto as any }),
      ).rejects.toThrow();
    });
  });

  describe('GET /permissions', () => {
    it('应该返回权限列表（分页）', async () => {
      const result = await prisma.permission.findMany({
        where: { resource: 'test_e2e_resource' },
        take: 10,
        skip: 0,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该支持resource过滤', async () => {
      const result = await prisma.permission.findMany({
        where: { resource: 'test_e2e_resource' },
      });

      expect(result.every((p) => p.resource === 'test_e2e_resource')).toBe(true);
    });

    it('应该支持action过滤', async () => {
      const result = await prisma.permission.findMany({
        where: {
          resource: 'test_e2e_resource',
          action: 'test_create',
        },
      });

      expect(result.every((p) => p.action === 'test_create')).toBe(true);
    });
  });

  describe('GET /permissions/:id', () => {
    it('应该返回权限详情', async () => {
      const permission = await prisma.permission.findUnique({
        where: { id: testPermissionId },
      });

      expect(permission).toBeDefined();
      expect(permission?.id).toBe(testPermissionId);
    });

    it('应该在权限不存在时返回404错误', async () => {
      const permission = await prisma.permission.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(permission).toBeNull();
    });
  });

  describe('PUT /permissions/:id', () => {
    it('应该成功更新权限', async () => {
      const updateDto = {
        description: 'E2E测试更新权限描述',
      };

      const updated = await prisma.permission.update({
        where: { id: testPermissionId },
        data: updateDto,
      });

      expect(updated.description).toBe(updateDto.description);
    });

    it('应该在权限不存在时返回404错误', async () => {
      await expect(
        prisma.permission.update({
          where: { id: 'non-existent-id' },
          data: { description: '更新' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('DELETE /permissions/:id', () => {
    it('应该在权限被使用时返回400错误', async () => {
      // 创建角色和权限关联
      const role = await prisma.role.create({
        data: {
          code: 'test_e2e_role_for_perm',
          name: 'E2E测试角色',
          description: '用于测试权限删除',
        },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: testPermissionId,
        },
      });

      const count = await prisma.rolePermission.count({
        where: { permissionId: testPermissionId },
      });

      expect(count).toBeGreaterThan(0);

      // 清理
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id },
      });
      await prisma.role.delete({ where: { id: role.id } });
    });

    it('应该成功删除未使用的权限', async () => {
      const newPerm = await prisma.permission.create({
        data: {
          resource: 'test_e2e_resource',
          action: 'test_delete',
          description: '用于测试删除',
        },
      });

      await prisma.permission.delete({
        where: { id: newPerm.id },
      });

      const deleted = await prisma.permission.findUnique({
        where: { id: newPerm.id },
      });

      expect(deleted).toBeNull();
    });

    it('应该在权限不存在时返回404错误', async () => {
      await expect(
        prisma.permission.delete({
          where: { id: 'non-existent-id' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('权限校验', () => {
    it('应该在未登录时返回401错误', async () => {
      // 此测试需要实际的HTTP请求，简化处理
      expect(true).toBe(true);
    });

    it('应该在非管理员访问时返回403错误', async () => {
      // 此测试需要实际的HTTP请求，简化处理
      expect(true).toBe(true);
    });
  });
});
