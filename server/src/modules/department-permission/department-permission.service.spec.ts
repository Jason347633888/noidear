import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentPermissionService } from './department-permission.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DepartmentPermissionService', () => {
  let service: DepartmentPermissionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userPermission: {
      findMany: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentPermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DepartmentPermissionService>(DepartmentPermissionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canAccessDepartmentResource', () => {
    it('应该允许用户访问本部门资源', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([]);

      const result = await service.canAccessDepartmentResource(
        'user-1',
        'dept-1',
        'view',
        'document',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { departmentId: true },
      });
    });

    it('应该拒绝用户访问其他部门资源（无跨部门权限）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([]);

      const result = await service.canAccessDepartmentResource(
        'user-1',
        'dept-2',
        'view',
        'document',
      );

      expect(result).toBe(false);
    });

    it('应该允许拥有跨部门权限的用户访问其他部门资源', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
            category: 'document',
            scope: 'cross_department',
          },
          expiresAt: null,
        },
      ]);

      const result = await service.canAccessDepartmentResource(
        'user-1',
        'dept-2',
        'view',
        'document',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          fineGrainedPermission: {
            category: 'document',
            scope: {
              in: ['cross_department', 'global'],
            },
          },
        },
        include: {
          fineGrainedPermission: true,
        },
      });
    });

    it('应该允许拥有全局权限的用户访问所有部门资源', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'manage:global:department',
            category: 'system',
            scope: 'global',
          },
          expiresAt: null,
        },
      ]);

      const result = await service.canAccessDepartmentResource(
        'user-1',
        'dept-999',
        'view',
        'document',
      );

      expect(result).toBe(true);
    });

    it('应该过滤掉已过期的权限', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // 昨天过期

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
            category: 'document',
            scope: 'cross_department',
          },
          expiresAt: expiredDate,
        },
      ]);

      const result = await service.canAccessDepartmentResource(
        'user-1',
        'dept-2',
        'view',
        'document',
      );

      expect(result).toBe(false);
    });

    it('应该在用户不存在时返回 false', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.canAccessDepartmentResource(
        'non-existent',
        'dept-1',
        'view',
        'document',
      );

      expect(result).toBe(false);
    });
  });

  describe('hasCrossDepartmentPermission', () => {
    it('应该返回 true 如果用户拥有跨部门权限', async () => {
      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
            scope: 'cross_department',
          },
          expiresAt: null,
        },
      ]);

      const result = await service.hasCrossDepartmentPermission(
        'user-1',
        'view:cross_department:document',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.userPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
          },
        },
        include: {
          fineGrainedPermission: true,
        },
      });
    });

    it('应该返回 false 如果用户没有跨部门权限', async () => {
      mockPrismaService.userPermission.findMany.mockResolvedValue([]);

      const result = await service.hasCrossDepartmentPermission(
        'user-1',
        'view:cross_department:document',
      );

      expect(result).toBe(false);
    });

    it('应该过滤掉已过期的权限', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
            scope: 'cross_department',
          },
          expiresAt: expiredDate,
        },
      ]);

      const result = await service.hasCrossDepartmentPermission(
        'user-1',
        'view:cross_department:document',
      );

      expect(result).toBe(false);
    });
  });

  describe('getAccessibleDepartments', () => {
    it('应该返回用户本部门（无跨部门权限）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([]);

      const result = await service.getAccessibleDepartments('user-1', 'document');

      expect(result).toEqual(['dept-1']);
    });

    it('应该返回所有部门（拥有全局权限）', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'manage:global:user',
            category: 'system',
            scope: 'global',
          },
          expiresAt: null,
        },
      ]);

      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-1', code: 'PROD', name: '生产部' },
        { id: 'dept-2', code: 'QA', name: '质量部' },
        { id: 'dept-3', code: 'RD', name: '研发部' },
      ]);

      const result = await service.getAccessibleDepartments('user-1', 'document');

      expect(result).toEqual(['dept-1', 'dept-2', 'dept-3']);
      expect(mockPrismaService.department.findMany).toHaveBeenCalledWith({
        select: { id: true },
      });
    });

    it('应该返回本部门和有跨部门权限的资源类型的所有部门', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrismaService.userPermission.findMany.mockResolvedValue([
        {
          id: 'up-1',
          fineGrainedPermission: {
            code: 'view:cross_department:document',
            category: 'document',
            scope: 'cross_department',
          },
          expiresAt: null,
        },
      ]);

      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-1', code: 'PROD', name: '生产部' },
        { id: 'dept-2', code: 'QA', name: '质量部' },
        { id: 'dept-3', code: 'RD', name: '研发部' },
      ]);

      const result = await service.getAccessibleDepartments('user-1', 'document');

      expect(result).toEqual(['dept-1', 'dept-2', 'dept-3']);
    });

    it('应该返回空数组如果用户不存在', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getAccessibleDepartments('non-existent', 'document');

      expect(result).toEqual([]);
    });
  });
});
