import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(userRoleCode: string): ExecutionContext {
    const request = { user: { id: 'user-1', username: 'testuser', roleCode: userRoleCode } };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no @Roles decorator is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'leader']);
    const context = createMockContext('admin');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access for leader when roles include leader', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'leader']);
    const context = createMockContext('leader');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'leader']);
    const context = createMockContext('user');

    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access (throw) when user role is empty string', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = createMockContext('');

    expect(() => guard.canActivate(context)).toThrow('用户缺少正式角色');
  });

  it('should handle single role requirement', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const adminCtx = createMockContext('admin');
    const userCtx = createMockContext('user');

    expect(guard.canActivate(adminCtx)).toBe(true);
    expect(guard.canActivate(userCtx)).toBe(false);
  });

  it('active 用户缺少正式角色时拒绝通过', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u-1', username: 'bad-user', roleCode: undefined } }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow('用户缺少正式角色');
  });
});
