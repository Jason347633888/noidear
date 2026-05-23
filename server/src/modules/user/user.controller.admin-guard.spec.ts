/**
 * P0-R3-2 — UserController admin-only guard via RolesGuard + @Roles('admin')
 */
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserController } from './user.controller';

function makeContext(roleCode: string | undefined, handlerRoles: string[], classRoles: string[]) {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  // Simulate Reflector.getAllAndOverride behavior
  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) {
      return handlerRoles.length ? handlerRoles : classRoles;
    }
    return undefined;
  });

  const ctx: any = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: roleCode ? { roleCode } : undefined }),
    }),
  };
  return { guard, ctx };
}

describe('RolesGuard — UserController admin protection', () => {
  it('admin can access', () => {
    const { guard, ctx } = makeContext('admin', [], ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('user role is blocked (returns false)', () => {
    const { guard, ctx } = makeContext('user', [], ['admin']);
    // RolesGuard throws UnauthorizedException when roleCode is missing,
    // but when roleCode is present and not matching it returns false
    // Actually current impl: throws when no roleCode, returns requiredRoles.includes(roleCode) otherwise
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('leader role is blocked', () => {
    const { guard, ctx } = makeContext('leader', [], ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('missing user throws UnauthorizedException', () => {
    const { guard, ctx } = makeContext(undefined, [], ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
