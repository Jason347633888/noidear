/**
 * DepartmentController admin-only guard — Round 4 split:
 *   GET /departments, GET /departments/:id  → JwtAuthGuard only (all authenticated roles)
 *   POST, PUT, DELETE → admin-only (RolesGuard + @Roles('admin'))
 *
 * Tests use real Reflector metadata from the controller class, not mocked metadata.
 */
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';

async function buildReflector(): Promise<Reflector> {
  const module = await Test.createTestingModule({
    controllers: [DepartmentController],
    providers: [
      { provide: DepartmentService, useValue: {} },
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

describe('DepartmentController — real Reflector metadata guard checks', () => {
  let reflector: Reflector;

  beforeAll(async () => {
    reflector = await buildReflector();
  });

  describe('GET /departments — no @Roles (all authenticated)', () => {
    it('admin can access', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('admin', DepartmentController.prototype.findAll, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('leader can access', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('leader', DepartmentController.prototype.findAll, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('user role can access', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('user', DepartmentController.prototype.findAll, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('POST /departments — @Roles("admin") on handler', () => {
    it('admin can create department', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('admin', DepartmentController.prototype.create, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('leader is blocked from POST /departments', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('leader', DepartmentController.prototype.create, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('user is blocked from POST /departments', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('user', DepartmentController.prototype.create, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('no user throws UnauthorizedException', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext(undefined, DepartmentController.prototype.create, DepartmentController);
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('DELETE /departments/:id — @Roles("admin") on handler', () => {
    it('user is blocked from DELETE /departments/:id', () => {
      const guard = new RolesGuard(reflector);
      const ctx = makeContext('user', DepartmentController.prototype.remove, DepartmentController);
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('@Roles metadata sanity check', () => {
    it('findAll handler has no @Roles metadata', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, DepartmentController.prototype.findAll);
      expect(roles).toBeUndefined();
    });

    it('create handler has @Roles("admin")', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, DepartmentController.prototype.create);
      expect(roles).toEqual(['admin']);
    });

    it('remove handler has @Roles("admin")', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, DepartmentController.prototype.remove);
      expect(roles).toEqual(['admin']);
    });
  });
});
