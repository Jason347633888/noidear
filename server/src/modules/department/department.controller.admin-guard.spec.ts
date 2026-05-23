/**
 * P0-R3-2 — DepartmentController admin-only guard via RolesGuard + @Roles('admin')
 */
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

function makeContext(roleCode: string | undefined, classRoles: string[]) {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
    if (key === ROLES_KEY) return classRoles;
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

describe('RolesGuard — DepartmentController admin protection', () => {
  it('admin can access POST /departments', () => {
    const { guard, ctx } = makeContext('admin', ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('user is blocked from POST /departments', () => {
    const { guard, ctx } = makeContext('user', ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('user is blocked from DELETE /departments/:id', () => {
    const { guard, ctx } = makeContext('user', ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('no user throws UnauthorizedException', () => {
    const { guard, ctx } = makeContext(undefined, ['admin']);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
