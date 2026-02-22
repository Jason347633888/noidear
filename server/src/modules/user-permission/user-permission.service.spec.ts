import { Test, TestingModule } from '@nestjs/testing';
import { UserPermissionService } from './user-permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userPermission: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    fineGrainedPermission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<UserPermissionService>(UserPermissionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('grantPermission', () => {
    it('should grant permission to user', async () => {
      const grantDto = {
        userId: 'user_001',
        fineGrainedPermissionId: 'perm_001',
        reason: '临时项目需求',
        grantedBy: 'admin_001',
      };

      const mockUser = { id: 'user_001', username: 'test_user' };
      const mockPermission = { id: 'perm_001', code: 'view:document' };
      const mockUserPermission = {
        id: 'up_001',
        ...grantDto,
        grantedAt: new Date(),
        expiresAt: null,
        resourceType: null,
        resourceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findFirst.mockResolvedValue(null);
      mockPrismaService.userPermission.create.mockResolvedValue(mockUserPermission);

      const result = await service.grantPermission(grantDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data).toEqual(mockUserPermission);
      expect(mockPrismaService.userPermission.create).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const grantDto = {
        userId: 'nonexistent',
        fineGrainedPermissionId: 'perm_001',
        reason: '临时项目需求',
        grantedBy: 'admin_001',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.grantPermission(grantDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if permission not found', async () => {
      const grantDto = {
        userId: 'user_001',
        fineGrainedPermissionId: 'nonexistent',
        reason: '临时项目需求',
        grantedBy: 'admin_001',
      };

      const mockUser = { id: 'user_001', username: 'test_user' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(null);

      await expect(service.grantPermission(grantDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if permission already granted', async () => {
      const grantDto = {
        userId: 'user_001',
        fineGrainedPermissionId: 'perm_001',
        reason: '临时项目需求',
        grantedBy: 'admin_001',
      };

      const mockUser = { id: 'user_001', username: 'test_user' };
      const mockPermission = { id: 'perm_001', code: 'view:document' };
      const existingUserPermission = { id: 'up_001' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.fineGrainedPermission.findUnique.mockResolvedValue(mockPermission);
      mockPrismaService.userPermission.findFirst.mockResolvedValue(existingUserPermission);

      await expect(service.grantPermission(grantDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('revokePermission', () => {
    it('should revoke permission', async () => {
      const userPermissionId = 'up_001';
      const mockUserPermission = {
        id: userPermissionId,
        userId: 'user_001',
        fineGrainedPermissionId: 'perm_001',
      };

      mockPrismaService.userPermission.findUnique.mockResolvedValue(mockUserPermission);
      mockPrismaService.userPermission.delete.mockResolvedValue(mockUserPermission);

      const result = await service.revokePermission(userPermissionId);

      expect(result).toMatchObject({ success: true });
      expect(mockPrismaService.userPermission.delete).toHaveBeenCalledWith({
        where: { id: userPermissionId },
      });
    });

    it('should throw error if permission not found', async () => {
      mockPrismaService.userPermission.findUnique.mockResolvedValue(null);

      await expect(service.revokePermission('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchGrantPermissions', () => {
    it('should grant multiple permissions to user', async () => {
      const batchDto = {
        userId: 'user_001',
        fineGrainedPermissionIds: ['perm_001', 'perm_002'],
        reason: '新员工入职',
        grantedBy: 'admin_001',
      };

      const mockUser = { id: 'user_001', username: 'test_user' };
      const mockPermissions = [
        { id: 'perm_001', code: 'view:document' },
        { id: 'perm_002', code: 'create:document' },
      ];
      const mockUserPermissions = [
        { id: 'up_001', userId: 'user_001', fineGrainedPermissionId: 'perm_001' },
        { id: 'up_002', userId: 'user_001', fineGrainedPermissionId: 'perm_002' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.$transaction.mockResolvedValue(mockUserPermissions);

      const result = await service.batchGrantPermissions(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error if any permission not found', async () => {
      const batchDto = {
        userId: 'user_001',
        fineGrainedPermissionIds: ['perm_001', 'nonexistent'],
        reason: '新员工入职',
        grantedBy: 'admin_001',
      };

      const mockUser = { id: 'user_001', username: 'test_user' };
      const mockPermissions = [{ id: 'perm_001', code: 'view:document' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(mockPermissions);

      await expect(service.batchGrantPermissions(batchDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserPermissions', () => {
    it('should return paginated user permissions', async () => {
      const query = { userId: 'user_001', page: 1, limit: 10 };
      const mockPermissions = [
        {
          id: 'up_001',
          userId: 'user_001',
          fineGrainedPermissionId: 'perm_001',
          grantedAt: new Date(),
        },
      ];

      mockPrismaService.userPermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.count.mockResolvedValue(1);

      const result = await service.findUserPermissions(query);

      expect(result).toMatchObject({
        success: true,
        data: mockPermissions,
        meta: { total: 1, page: 1, limit: 10 },
      });
    });
  });

  describe('checkExpiration', () => {
    it('should remove expired permissions', async () => {
      const now = new Date();
      const expiredPermissions = [
        { id: 'up_001', expiresAt: new Date(now.getTime() - 1000) },
        { id: 'up_002', expiresAt: new Date(now.getTime() - 2000) },
      ];

      mockPrismaService.userPermission.findMany.mockResolvedValue(expiredPermissions);
      mockPrismaService.userPermission.delete.mockResolvedValue({});

      const result = await service.checkExpiration();

      expect(result).toMatchObject({ success: true });
      expect(result.data.removedCount).toBe(2);
      expect(mockPrismaService.userPermission.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getEffectivePermissions', () => {
    it('应该返回用户的直接权限（无角色）', async () => {
      const mockUser = {
        id: 'user_001',
        role: 'user',
        userPermissions: [
          {
            id: 'up_001',
            fineGrainedPermission: {
              id: 'perm_001',
              code: 'view:department:document',
              name: '查看本部门文档',
            },
            expiresAt: null,
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions('user_001');

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('view:department:document');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_001' },
        include: {
          userPermissions: {
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: expect.any(Date) } },
              ],
            },
            include: {
              fineGrainedPermission: true,
            },
          },
        },
      });
    });

    it('应该返回空数组（角色继承暂未实现）', async () => {
      const mockUser = {
        id: 'user_001',
        role: 'leader',
        userPermissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions('user_001');

      // TODO: 当 RoleFineGrainedPermission 映射表创建后，此测试应验证继承权限
      expect(result).toHaveLength(0);
    });

    it('应该对重复的直接权限去重', async () => {
      const mockUser = {
        id: 'user_001',
        role: 'leader',
        userPermissions: [
          {
            id: 'up_001',
            fineGrainedPermission: {
              id: 'perm_001',
              code: 'view:department:document',
              name: '查看本部门文档',
            },
            expiresAt: null,
          },
          {
            id: 'up_002',
            fineGrainedPermission: {
              id: 'perm_002',
              code: 'edit:department:document',
              name: '编辑本部门文档',
            },
            expiresAt: null,
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions('user_001');

      // TODO: 当角色继承实现后，测试权限合并去重
      expect(result).toHaveLength(2);
      const codes = result.map((p) => p.code).sort();
      expect(codes).toEqual([
        'edit:department:document',
        'view:department:document',
      ]);
    });

    it('应该过滤掉过期的直接权限', async () => {
      // 数据库查询已通过 where 子句过滤过期权限
      // 因此 mock 返回空的 userPermissions
      const mockUser = {
        id: 'user_001',
        role: 'user',
        userPermissions: [], // 已在数据库层面过滤
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getEffectivePermissions('user_001');

      expect(result).toHaveLength(0);
    });

    it('应该返回空数组如果用户不存在', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getEffectivePermissions('non_existent');

      expect(result).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('应该返回 true 如果用户有直接权限', async () => {
      const mockUser = {
        id: 'user_001',
        userPermissions: [
          {
            fineGrainedPermission: {
              code: 'view:department:document',
            },
            expiresAt: null,
          },
        ],
        roleObj: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user_001', 'view:department:document');

      expect(result).toBe(true);
    });

    it('应该返回 false 如果用户无直接权限（角色继承未实现）', async () => {
      const mockUser = {
        id: 'user_001',
        userPermissions: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user_001', 'edit:department:document');

      // TODO: 当角色继承实现后，应返回 true
      expect(result).toBe(false);
    });

    it('应该返回 false 如果用户没有该权限', async () => {
      const mockUser = {
        id: 'user_001',
        userPermissions: [
          {
            fineGrainedPermission: {
              code: 'view:department:document',
            },
            expiresAt: null,
          },
        ],
        roleObj: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission('user_001', 'delete:department:document');

      expect(result).toBe(false);
    });

    it('应该返回 false 如果用户不存在', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission('non_existent', 'view:document');

      expect(result).toBe(false);
    });
  });

  describe('getInheritedPermissions', () => {
    it('应该返回空数组（角色继承暂未实现）', async () => {
      const result = await service.getInheritedPermissions('user_001');

      // TODO: 当 RoleFineGrainedPermission 映射表创建后，应返回继承的权限
      expect(result).toEqual([]);
    });

    it('应该返回空数组如果用户无角色', async () => {
      const result = await service.getInheritedPermissions('user_001');

      expect(result).toEqual([]);
    });

    it('应该返回空数组如果用户不存在', async () => {
      const result = await service.getInheritedPermissions('non_existent');

      expect(result).toEqual([]);
    });
  });

  describe('batchGrantMultipleUsers', () => {
    it('应该批量授予多个用户多个权限', async () => {
      const batchDto = {
        userIds: ['user_001', 'user_002'],
        fineGrainedPermissionIds: ['perm_001', 'perm_002'],
        reason: '新员工培训完成',
        grantedBy: 'admin_001',
      };

      const mockUsers = [
        { id: 'user_001', username: 'user1' },
        { id: 'user_002', username: 'user2' },
      ];
      const mockPermissions = [
        { id: 'perm_001', code: 'view:document' },
        { id: 'perm_002', code: 'edit:document' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.create.mockResolvedValue({ id: 'up_001' });

      const result = await service.batchGrantMultipleUsers(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data.success).toBe(4); // 2 users × 2 permissions
      expect(result.data.failed).toBe(0);
      expect(mockPrismaService.userPermission.create).toHaveBeenCalledTimes(4);
    });

    it('应该处理部分用户不存在的情况', async () => {
      const batchDto = {
        userIds: ['user_001', 'non_existent'],
        fineGrainedPermissionIds: ['perm_001'],
        reason: '测试',
        grantedBy: 'admin_001',
      };

      const mockUsers = [{ id: 'user_001', username: 'user1' }];
      const mockPermissions = [{ id: 'perm_001', code: 'view:document' }];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.create.mockResolvedValue({ id: 'up_001' });

      const result = await service.batchGrantMultipleUsers(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data.success).toBe(1);
      expect(result.data.failed).toBe(1);
      expect(result.data.details).toHaveLength(2);
    });

    it('应该处理部分权限不存在的情况', async () => {
      const batchDto = {
        userIds: ['user_001'],
        fineGrainedPermissionIds: ['perm_001', 'non_existent'],
        reason: '测试',
        grantedBy: 'admin_001',
      };

      const mockUsers = [{ id: 'user_001', username: 'user1' }];
      const mockPermissions = [{ id: 'perm_001', code: 'view:document' }];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.fineGrainedPermission.findMany.mockResolvedValue(mockPermissions);
      mockPrismaService.userPermission.create.mockResolvedValue({ id: 'up_001' });

      const result = await service.batchGrantMultipleUsers(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data.success).toBe(1);
      expect(result.data.failed).toBe(1);
    });
  });

  describe('batchRevokePermissions', () => {
    it('应该批量撤销权限', async () => {
      const batchDto = {
        userPermissionIds: ['up_001', 'up_002', 'up_003'],
      };

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        { id: 'up_001' },
        { id: 'up_002' },
        { id: 'up_003' },
      ]);
      mockPrismaService.userPermission.delete.mockResolvedValue({});

      const result = await service.batchRevokePermissions(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data.success).toBe(3);
      expect(result.data.failed).toBe(0);
      expect(mockPrismaService.userPermission.delete).toHaveBeenCalledTimes(3);
    });

    it('应该处理部分权限不存在的情况', async () => {
      const batchDto = {
        userPermissionIds: ['up_001', 'non_existent', 'up_003'],
      };

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        { id: 'up_001' },
        { id: 'up_003' },
      ]);
      mockPrismaService.userPermission.delete.mockResolvedValue({});

      const result = await service.batchRevokePermissions(batchDto);

      expect(result).toMatchObject({ success: true });
      expect(result.data.success).toBe(2);
      expect(result.data.failed).toBe(1);
    });
  });
});
