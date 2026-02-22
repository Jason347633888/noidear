import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../src/modules/permission/permission.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreatePermissionDto } from '../src/modules/permission/dto/create-permission.dto';
import { UpdatePermissionDto } from '../src/modules/permission/dto/update-permission.dto';
import { QueryPermissionDto } from '../src/modules/permission/dto/query-permission.dto';

describe('PermissionService', () => {
  let service: PermissionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    permission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreatePermissionDto = {
      resource: 'document',
      action: 'create',
      description: '创建文档权限',
    };

    it('应该成功创建权限', async () => {
      const mockPermission = {
        id: 'perm-1',
        resource: dto.resource,
        action: dto.action,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(null);
      mockPrismaService.permission.create.mockResolvedValue(mockPermission);

      const result = await service.create(dto);

      expect(result).toEqual({
        success: true,
        data: mockPermission,
      });
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: {
          resource_action: {
            resource: dto.resource,
            action: dto.action,
          },
        },
      });
      expect(mockPrismaService.permission.create).toHaveBeenCalled();
    });

    it('应该在权限已存在时抛出异常', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue({
        id: 'existing-perm',
        resource: dto.resource,
        action: dto.action,
      });

      await expect(service.create(dto)).rejects.toThrow(
        `权限 ${dto.resource}:${dto.action} 已存在`,
      );

      expect(mockPrismaService.permission.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('应该返回权限列表（分页）', async () => {
      const query: QueryPermissionDto = {
        page: 1,
        limit: 10,
        resource: 'document',
      };

      const mockPermissions = [
        {
          id: 'perm-1',
          resource: 'document',
          action: 'create',
          description: '创建文档',
        },
      ];

      mockPrismaService.permission.count.mockResolvedValue(1);
      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAll(query);

      expect(result).toEqual({
        success: true,
        data: mockPermissions,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.permission.count).toHaveBeenCalledWith({
        where: {
          resource: query.resource,
        },
      });

      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        where: {
          resource: query.resource,
        },
        skip: 0,
        take: 10,
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      });
    });

    it('应该支持无过滤条件查询', async () => {
      const query: QueryPermissionDto = {
        page: 1,
        limit: 20,
      };

      mockPrismaService.permission.count.mockResolvedValue(0);
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.findAll(query);

      expect(result).toEqual({
        success: true,
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      });
    });
  });

  describe('findOne', () => {
    it('应该返回权限详情', async () => {
      const permissionId = 'perm-1';
      const mockPermission = {
        id: permissionId,
        resource: 'document',
        action: 'create',
        description: '创建文档',
        createdAt: new Date(),
        updatedAt: new Date(),
        roles: [],
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findOne(permissionId);

      expect(result).toEqual({
        success: true,
        data: mockPermission,
      });
      expect(mockPrismaService.permission.findUnique).toHaveBeenCalledWith({
        where: { id: permissionId },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('应该在权限不存在时抛出异常', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow('权限不存在');
    });
  });

  describe('update', () => {
    const permissionId = 'perm-1';
    const dto: UpdatePermissionDto = {
      description: '更新后的描述',
    };

    it('应该成功更新权限', async () => {
      const mockPermission = {
        id: permissionId,
        resource: 'document',
        action: 'create',
        description: '原描述',
      };

      const updatedPermission = {
        ...mockPermission,
        description: dto.description,
        updatedAt: new Date(),
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.permission.update.mockResolvedValue(updatedPermission);

      const result = await service.update(permissionId, dto);

      expect(result).toEqual({
        success: true,
        data: updatedPermission,
      });
      expect(mockPrismaService.permission.update).toHaveBeenCalled();
    });

    it('应该在权限不存在时抛出异常', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.update(permissionId, dto)).rejects.toThrow('权限不存在');
    });
  });

  describe('remove', () => {
    const permissionId = 'perm-1';

    it('应该成功删除权限', async () => {
      const mockPermission = {
        id: permissionId,
        resource: 'document',
        action: 'create',
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.count.mockResolvedValue(0);
      mockPrismaService.permission.delete.mockResolvedValue(mockPermission);

      const result = await service.remove(permissionId);

      expect(result).toEqual({
        success: true,
        message: '删除权限成功',
      });
      expect(mockPrismaService.permission.delete).toHaveBeenCalledWith({
        where: { id: permissionId },
      });
    });

    it('应该在权限不存在时抛出异常', async () => {
      mockPrismaService.permission.findUnique.mockResolvedValue(null);

      await expect(service.remove(permissionId)).rejects.toThrow('权限不存在');
    });

    it('应该在权限正在被角色使用时抛出异常', async () => {
      const mockPermission = {
        id: permissionId,
        resource: 'document',
        action: 'create',
      };

      mockPrismaService.permission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.rolePermission.count.mockResolvedValue(3);

      await expect(service.remove(permissionId)).rejects.toThrow(
        '权限正在被 3 个角色使用，无法删除',
      );
    });
  });
});
