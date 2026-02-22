import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { UserPermissionService } from '../../modules/user-permission/user-permission.service';
import { RedisService } from '../../modules/redis/redis.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let userPermissionService: UserPermissionService;

  const mockUserPermissionService = {
    findUserPermissions: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: UserPermissionService,
          useValue: mockUserPermissionService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    userPermissionService = module.get<UserPermissionService>(UserPermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user?: any, params?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: user || { id: 'user-1', role: 'user' },
          params: params || {},
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('应该允许没有权限装饰器的请求通过', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockUserPermissionService.findUserPermissions).not.toHaveBeenCalled();
    });

    it('应该允许管理员跳过权限检查', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('view:department:document');
      const context = createMockExecutionContext({ id: 'admin-1', role: 'admin' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockUserPermissionService.findUserPermissions).not.toHaveBeenCalled();
    });

    it('应该拒绝未登录的请求', async () => {
      mockReflector.getAllAndOverride.mockReturnValue('view:department:document');
      const context = createMockExecutionContext(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    describe('CheckPermission - 单个权限检查', () => {
      it('应该允许拥有所需权限的用户通过', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('view:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockUserPermissionService.findUserPermissions).toHaveBeenCalledWith({
          userId: 'user-1',
        });
      });

      it('应该拒绝没有所需权限的用户', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('edit:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });

      it('应该拒绝权限已过期的用户', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('view:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - 1); // 昨天过期

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: expiredDate,
            },
          ],
        });

        const context = createMockExecutionContext();

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('CheckPermissions - 多个权限 AND 逻辑', () => {
      it('应该允许拥有所有权限的用户通过', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // requiredPermission
          .mockReturnValueOnce(['view:department:document', 'edit:department:document']) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
            {
              id: 'up-2',
              fineGrainedPermission: { code: 'edit:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('应该拒绝只拥有部分权限的用户', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // requiredPermission
          .mockReturnValueOnce(['view:department:document', 'delete:department:document']) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('CheckAnyPermission - 多个权限 OR 逻辑', () => {
      it('应该允许拥有任一权限的用户通过', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(['edit:department:document', 'delete:department:document']) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
            {
              id: 'up-2',
              fineGrainedPermission: { code: 'delete:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('应该拒绝没有任何所需权限的用户', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(['edit:department:document', 'delete:department:document']) // requiredAnyPermissions
          .mockReturnValueOnce(undefined) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext();

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('Resource - 资源级别权限', () => {
      it('应该验证资源级别权限', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('view:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce({ type: 'document', idParam: 'id' }) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              resourceType: 'document',
              resourceId: 'doc-123',
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext(undefined, { id: 'doc-123' });
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('应该拒绝资源 ID 不匹配的请求', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('view:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce({ type: 'document', idParam: 'id' }) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              resourceType: 'document',
              resourceId: 'doc-456',
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext(undefined, { id: 'doc-123' });

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      });

      it('应该允许全局权限（无资源限制）', async () => {
        mockReflector.getAllAndOverride
          .mockReturnValueOnce('view:department:document') // requiredPermission
          .mockReturnValueOnce(undefined) // requiredPermissions
          .mockReturnValueOnce(undefined) // requiredAnyPermissions
          .mockReturnValueOnce({ type: 'document', idParam: 'id' }) // resourceMeta
          .mockReturnValueOnce(undefined); // legacyPermissions

        mockUserPermissionService.findUserPermissions.mockResolvedValue({
          data: [
            {
              id: 'up-1',
              fineGrainedPermission: { code: 'view:department:document' },
              resourceType: null,
              resourceId: null,
              expiresAt: null,
            },
          ],
        });

        const context = createMockExecutionContext(undefined, { id: 'doc-123' });
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });
  });
});
