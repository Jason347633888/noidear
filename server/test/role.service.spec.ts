import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RoleService } from '../src/modules/role/role.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreateRoleDto } from '../src/modules/role/dto/create-role.dto';
import { UpdateRoleDto } from '../src/modules/role/dto/update-role.dto';
import { QueryRoleDto } from '../src/modules/role/dto/query-role.dto';
import { AssignPermissionsDto } from '../src/modules/role/dto/assign-permissions.dto';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';

describe('RoleService', () => {
  let service: RoleService;
  let prismaService: PrismaService;

  const mockPrismaService: any = {
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  mockPrismaService.$transaction = jest.fn((callback: any) => callback(mockPrismaService));

  const mockRedisClient = {
    del: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateRoleDto = {
      code: 'test_role',
      name: '测试角色',
      description: '测试描述',
    };

    it('应该成功创建角色', async () => {
      const mockRole = {
        id: 'role-1',
        code: dto.code,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.role.findUnique.mockResolvedValue(null);
      mockPrismaService.role.create.mockResolvedValue(mockRole);

      const result = await service.create(dto);

      expect(result).toEqual({
        success: true,
        data: mockRole,
      });
      expect(mockPrismaService.role.findUnique).toHaveBeenCalledWith({
        where: { code: dto.code },
      });
      expect(mockPrismaService.role.create).toHaveBeenCalled();
    });

    it('应该在角色代码已存在时抛出异常', async () => {
      mockPrismaService.role.findUnique.mockResolvedValue({
        id: 'existing-role',
        code: dto.code,
        deletedAt: null,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);

      expect(mockPrismaService.role.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('应该返回角色列表（分页）', async () => {
      const query: QueryRoleDto = {
        page: 1,
        limit: 10,
        keyword: '测试',
      };

      const mockRoles = [
        { id: 'role-1', code: 'test1', name: '测试角色1' },
        { id: 'role-2', code: 'test2', name: '测试角色2' },
      ];

      mockPrismaService.role.count.mockResolvedValue(2);
      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await service.findAll(query);

      expect(result).toEqual({
        success: true,
        data: mockRoles,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.role.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: query.keyword, mode: 'insensitive' } },
            { name: { contains: query.keyword, mode: 'insensitive' } },
          ],
        },
      });

      expect(mockPrismaService.role.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { code: { contains: query.keyword, mode: 'insensitive' } },
            { name: { contains: query.keyword, mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应该支持无关键词查询', async () => {
      const query: QueryRoleDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.role.count.mockResolvedValue(0);
      mockPrismaService.role.findMany.mockResolvedValue([]);

      const result = await service.findAll(query);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('应该返回角色详情', async () => {
      const roleId = 'role-1';
      const mockRole = {
        id: roleId,
        code: 'admin',
        name: '管理员',
        description: '系统管理员',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);

      const result = await service.findOne(roleId);

      expect(result).toEqual({
        success: true,
        data: mockRole,
      });
      expect(mockPrismaService.role.findFirst).toHaveBeenCalledWith({
        where: { id: roleId, deletedAt: null },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('应该在角色已删除时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.findOne('role-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const roleId = 'role-1';
    const dto: UpdateRoleDto = {
      name: '更新后的名称',
      description: '更新后的描述',
    };

    it('应该成功更新角色', async () => {
      const mockRole = {
        id: roleId,
        code: 'test_role',
        name: '原名称',
        deletedAt: null,
      };

      const updatedRole = {
        ...mockRole,
        name: dto.name,
        description: dto.description,
        updatedAt: new Date(),
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.role.update.mockResolvedValue(updatedRole);

      const result = await service.update(roleId, dto);

      expect(result).toEqual({
        success: true,
        data: updatedRole,
      });
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: {
          ...dto,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.update(roleId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const roleId = 'role-1';

    it('应该成功删除角色（软删除）', async () => {
      const mockRole = {
        id: roleId,
        code: 'test_role',
        deletedAt: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.role.update.mockResolvedValue({
        ...mockRole,
        deletedAt: new Date(),
      });

      await service.remove(roleId);

      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.remove(roleId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在角色正在被用户使用时抛出异常', async () => {
      const mockRole = {
        id: roleId,
        code: 'test_role',
        name: '测试角色',
        deletedAt: null,
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.user.count.mockResolvedValue(5);

      await expect(service.remove(roleId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignPermissions', () => {
    const roleId = 'role-1';
    const dto: AssignPermissionsDto = {
      permissionIds: ['perm-1', 'perm-2', 'perm-3'],
    };

    it('应该成功批量分配权限', async () => {
      const mockRole = { id: roleId, code: 'test_role', deletedAt: null };
      const mockPermissions = [
        { id: 'perm-1', resource: 'document', action: 'create' },
        { id: 'perm-2', resource: 'document', action: 'read' },
        { id: 'perm-3', resource: 'document', action: 'update' },
      ];

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaService);
      });

      await service.assignPermissions(roleId, dto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.assignPermissions(roleId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在部分权限ID不存在时抛出异常', async () => {
      const mockRole = { id: roleId, code: 'test_role', deletedAt: null };
      const mockPermissions = [
        { id: 'perm-1', resource: 'document', action: 'create' },
      ];

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      await expect(service.assignPermissions(roleId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokePermission', () => {
    const roleId = 'role-1';
    const permissionId = 'perm-1';

    it('应该成功撤销权限', async () => {
      const mockRole = { id: roleId, code: 'test_role', deletedAt: null };
      const mockRolePermission = { id: 'rp-1', roleId, permissionId };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.rolePermission.findFirst.mockResolvedValue(mockRolePermission);
      mockPrismaService.rolePermission.delete.mockResolvedValue(mockRolePermission);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.revokePermission(roleId, permissionId);

      expect(mockPrismaService.rolePermission.delete).toHaveBeenCalledWith({
        where: { id: mockRolePermission.id },
      });
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.revokePermission(roleId, permissionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在权限不存在时抛出异常', async () => {
      const mockRole = { id: roleId, code: 'test_role', deletedAt: null };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRole);
      mockPrismaService.rolePermission.findFirst.mockResolvedValue(null);

      await expect(service.revokePermission(roleId, permissionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRolePermissions', () => {
    const roleId = 'role-1';

    it('应该返回角色的所有权限', async () => {
      const mockRoleWithPermissions = {
        id: roleId,
        code: 'test_role',
        deletedAt: null,
        permissions: [
          {
            permission: {
              id: 'perm-1',
              resource: 'document',
              action: 'create',
              description: '创建文档',
            },
          },
          {
            permission: {
              id: 'perm-2',
              resource: 'document',
              action: 'read',
              description: '查看文档',
            },
          },
        ],
      };

      mockPrismaService.role.findFirst.mockResolvedValue(mockRoleWithPermissions);

      const result = await service.getRolePermissions(roleId);

      expect(result.data).toEqual([
        {
          id: 'perm-1',
          resource: 'document',
          action: 'create',
          description: '创建文档',
        },
        {
          id: 'perm-2',
          resource: 'document',
          action: 'read',
          description: '查看文档',
        },
      ]);

      // getRolePermissions uses role.findFirst with include, not rolePermission.findMany
    });

    it('应该在角色不存在时抛出异常', async () => {
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(service.getRolePermissions(roleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
