/**
 * UserController admin-only guard — Round 4 split:
 *   GET /users, GET /users/:id  → JwtAuthGuard only (all authenticated roles)
 *   POST, PUT, DELETE, POST reset-password → admin-only (RolesGuard + @Roles('admin'))
 *
 * Tests use real Reflector metadata from the controller class, not mocked metadata.
 */
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserController } from './user.controller';
import { UserService } from './user.service';

async function buildReflector(): Promise<Reflector> {
  const module = await Test.createTestingModule({
    controllers: [UserController],
    providers: [
      { provide: UserService, useValue: {} },
    ],
  }).compile();
  return module.get<Reflector>(Reflector);
}

function makeContext(
  roleCode: string | undefined,
  handler: Function,
  controllerClass: Function,
): any {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({
      getRequest: () => ({ user: roleCode ? { roleCode } : undefined }),
    }),
  };
}

describe('UserController — real Reflector metadata guard checks', () => {
  let reflector: Reflector;

  beforeAll(async () => {
    reflector = await buildReflector();
  });

  describe('GET /users — no @Roles (all authenticated)', () => {
    it('admin can access', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.findAll;
      const ctx = makeContext('admin', handler, UserController);
      // RolesGuard returns true when no requiredRoles set
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('leader can access', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.findAll;
      const ctx = makeContext('leader', handler, UserController);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('user role can access', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.findAll;
      const ctx = makeContext('user', handler, UserController);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('POST /users — @Roles("admin") on handler', () => {
    it('admin can create user', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.create;
      const ctx = makeContext('admin', handler, UserController);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('leader is blocked from creating user', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.create;
      const ctx = makeContext('leader', handler, UserController);
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('user role is blocked from creating user', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.create;
      const ctx = makeContext('user', handler, UserController);
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('missing user throws UnauthorizedException', () => {
      const guard = new RolesGuard(reflector);
      const handler = UserController.prototype.create;
      const ctx = makeContext(undefined, handler, UserController);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('@Roles metadata sanity check', () => {
    it('findAll handler has no @Roles metadata', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UserController.prototype.findAll);
      expect(roles).toBeUndefined();
    });

    it('create handler has @Roles("admin")', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UserController.prototype.create);
      expect(roles).toEqual(['admin']);
    });

    it('update handler has @Roles("admin")', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UserController.prototype.update);
      expect(roles).toEqual(['admin']);
    });

    it('remove handler has @Roles("admin")', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UserController.prototype.remove);
      expect(roles).toEqual(['admin']);
    });
  });
});
