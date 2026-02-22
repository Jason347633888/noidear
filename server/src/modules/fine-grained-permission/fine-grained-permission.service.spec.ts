import { Test, TestingModule } from '@nestjs/testing';
import { FineGrainedPermissionService } from './fine-grained-permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PermissionCategory,
  PermissionScope,
  PermissionStatus,
} from './dto/fine-grained-permission.dto';

describe('FineGrainedPermissionService', () => {
  let service: FineGrainedPermissionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    fineGrainedPermission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FineGrainedPermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FineGrainedPermissionService>(
      FineGrainedPermissionService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new fine-grained permission', async () => {
      const createDto = {
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        description: '可查看本部门的文档',
      };

      const expectedPermission = {
        id: 'perm_001',
        ...createDto,
        status: PermissionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);
      mockPrismaService.fineGrainedPermission.create.mockResolvedValue(
        expectedPermission,
      );

      const result = await service.create(createDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data).toEqual(expectedPermission);
      expect(mockPrismaService.fineGrainedPermission.create).toHaveBeenCalledWith(
        {
          data: {
            ...createDto,
            status: PermissionStatus.ACTIVE,
          },
        },
      );
    });

    it('should throw error if permission code already exists', async () => {
      const createDto = {
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        description: '可查看本部门的文档',
      };

      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue({
        id: 'existing_perm',
        ...createDto,
        status: PermissionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.create(createDto)).rejects.toThrow('权限编码 view:department:document 已存在');
    });

    it('should handle database errors gracefully', async () => {
      const createDto = {
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        description: '可查看本部门的文档',
      };

      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);
      mockPrismaService.fineGrainedPermission.create.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(service.create(createDto)).rejects.toThrow('创建权限定义失败');
    });
  });

  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      const mockPermissions = [
        {
          id: 'perm_001',
          code: 'view:department:document',
          name: '查看本部门文档',
          category: PermissionCategory.DOCUMENT,
          scope: PermissionScope.DEPARTMENT,
          status: PermissionStatus.ACTIVE,
          description: '可查看本部门的文档',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm_002',
          code: 'create:department:document',
          name: '创建本部门文档',
          category: PermissionCategory.DOCUMENT,
          scope: PermissionScope.DEPARTMENT,
          status: PermissionStatus.ACTIVE,
          description: '可创建本部门的文档',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(
        mockPermissions,
      );
      mockPrismaService.fineGrainedPermission.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result).toMatchObject({
        success: true,
        data: mockPermissions,
        meta: { total: 2 },
      });
      expect(mockPrismaService.fineGrainedPermission.findMany).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue([]);
      mockPrismaService.fineGrainedPermission.count.mockResolvedValue(0);

      await service.findAll({ category: PermissionCategory.DOCUMENT });

      expect(mockPrismaService.fineGrainedPermission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'document' },
        }),
      );
    });

    it('should filter by scope', async () => {
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue([]);
      mockPrismaService.fineGrainedPermission.count.mockResolvedValue(0);

      await service.findAll({ scope: PermissionScope.DEPARTMENT });

      expect(mockPrismaService.fineGrainedPermission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { scope: 'department' },
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue([]);
      mockPrismaService.fineGrainedPermission.count.mockResolvedValue(0);

      await service.findAll({ status: PermissionStatus.ACTIVE });

      expect(mockPrismaService.fineGrainedPermission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a permission by id', async () => {
      const mockPermission = {
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(
        mockPermission,
      );

      const result = await service.findOne('perm_001');

      expect(result).toMatchObject({ success: true });
      expect(result.data).toEqual(mockPermission);
      expect(mockPrismaService.fineGrainedPermission.findUnique).toHaveBeenCalledWith(
        {
          where: { id: 'perm_001' },
        },
      );
    });

    it('should return null if permission not found', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow('权限 ID nonexistent 不存在');
    });
  });

  describe('update', () => {
    it('should update a permission', async () => {
      const updateDto = {
        name: '查看部门文档（更新）',
        description: '更新后的描述',
      };

      const updatedPermission = {
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看部门文档（更新）',
        description: '更新后的描述',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.fineGrainedPermission.update.mockResolvedValue(
        updatedPermission,
      );

      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue({
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('perm_001', updateDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data).toEqual(updatedPermission);
      expect(mockPrismaService.fineGrainedPermission.update).toHaveBeenCalledWith(
        {
          where: { id: 'perm_001' },
          data: updateDto,
        },
      );
    });
  });

  describe('disable', () => {
    it('should soft delete a permission', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue({
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const deletedPermission = {
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.INACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.fineGrainedPermission.update.mockResolvedValue(
        deletedPermission,
      );

      const result = await service.disable('perm_001');

      expect(result).toMatchObject({ success: true });
      expect(result.data).toEqual(deletedPermission);
      expect(mockPrismaService.fineGrainedPermission.update).toHaveBeenCalledWith(
        {
          where: { id: 'perm_001' },
          data: { status: PermissionStatus.INACTIVE },
        },
      );
    });

    it('should throw error when permission not found', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);

      await expect(service.disable('nonexistent')).rejects.toThrow('权限 ID nonexistent 不存在');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue({
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.fineGrainedPermission.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.disable('perm_001')).rejects.toThrow('停用权限失败');
    });
  });

  describe('update error handling', () => {
    it('should throw error when permission not found', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New name' })).rejects.toThrow('权限 ID nonexistent 不存在');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue({
        id: 'perm_001',
        code: 'view:department:document',
        name: '查看本部门文档',
        category: PermissionCategory.DOCUMENT,
        scope: PermissionScope.DEPARTMENT,
        status: PermissionStatus.ACTIVE,
        description: '可查看本部门的文档',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.fineGrainedPermission.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update('perm_001', { name: 'New name' })).rejects.toThrow('更新权限定义失败');
    });
  });

  describe('findOne error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrismaService.fineGrainedPermission.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne('perm_001')).rejects.toThrow('查询权限详情失败');
    });
  });
});
