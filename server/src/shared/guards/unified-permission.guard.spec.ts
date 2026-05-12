import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UnifiedPermissionGuard } from './unified-permission.guard';
import { REQUIRE_DEPARTMENT_ACCESS_KEY, REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';

describe('UnifiedPermissionGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
  const roleService = { getRolePermissions: jest.fn() };
  const departmentPermissionService = { canAccessDepartmentResource: jest.fn() };
  const context = (user: any, params: any = {}) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as any);

  beforeEach(() => jest.clearAllMocks());

  it('allows requests without permission metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new UnifiedPermissionGuard(reflector, roleService as any, departmentPermissionService as any);
    await expect(guard.canActivate(context({ id: 'u1', roleId: 'r1' }))).resolves.toBe(true);
  });

  it('allows admin without extra checks', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === REQUIRE_PERMISSION_KEY ? 'document:read' : undefined);
    const guard = new UnifiedPermissionGuard(reflector, roleService as any, departmentPermissionService as any);
    await expect(guard.canActivate(context({ id: 'admin', roleCode: 'admin' }))).resolves.toBe(true);
    expect(roleService.getRolePermissions).not.toHaveBeenCalled();
  });

  it('rejects when role lacks function permission', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === REQUIRE_PERMISSION_KEY ? 'document:read' : undefined);
    roleService.getRolePermissions.mockResolvedValue([{ code: 'document:write' }]);
    const guard = new UnifiedPermissionGuard(reflector, roleService as any, departmentPermissionService as any);
    await expect(guard.canActivate(context({ id: 'u1', roleId: 'r1' }))).rejects.toThrow(ForbiddenException);
  });

  it('rejects when department access fails', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === REQUIRE_PERMISSION_KEY) return 'document:read';
      if (key === REQUIRE_DEPARTMENT_ACCESS_KEY) return { departmentParam: 'departmentId', action: 'view', resourceType: 'document' };
      return undefined;
    });
    roleService.getRolePermissions.mockResolvedValue([{ code: 'document:read' }]);
    departmentPermissionService.canAccessDepartmentResource.mockResolvedValue(false);
    const guard = new UnifiedPermissionGuard(reflector, roleService as any, departmentPermissionService as any);
    await expect(guard.canActivate(context({ id: 'u1', roleId: 'r1' }, { departmentId: 'd2' }))).rejects.toThrow(ForbiddenException);
  });
});
