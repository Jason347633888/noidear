import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard, MODULE_DISABLED_CODE } from './module-access.guard';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';

function buildCtx(handler: any, user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => handler?.constructor ?? class X {},
  } as any;
}

describe('ModuleAccessGuard', () => {
  it('admin bypass — always allowed', async () => {
    @ModuleKey('warehouse')
    class C {}
    const reflector = new Reflector();
    const svc = { getEnabledModulesFor: jest.fn().mockResolvedValue([]) } as any;
    const guard = new ModuleAccessGuard(reflector, svc);
    expect(await guard.canActivate(buildCtx(C, { roleCode: 'admin' }))).toBe(true);
    expect(svc.getEnabledModulesFor).not.toHaveBeenCalled();
  });

  it('no @ModuleKey on handler → pass-through', async () => {
    class C {}
    const guard = new ModuleAccessGuard(new Reflector(), { getEnabledModulesFor: jest.fn() } as any);
    expect(await guard.canActivate(buildCtx(C, { roleCode: 'user' }))).toBe(true);
  });

  it('enabled module → allowed', async () => {
    @ModuleKey('warehouse')
    class C {}
    const svc = { getEnabledModulesFor: jest.fn().mockResolvedValue(['warehouse']) } as any;
    const guard = new ModuleAccessGuard(new Reflector(), svc);
    expect(await guard.canActivate(buildCtx(C, { roleCode: 'user' }))).toBe(true);
  });

  it('disabled module → ForbiddenException with MODULE_DISABLED payload', async () => {
    @ModuleKey('warehouse')
    class C {}
    const svc = { getEnabledModulesFor: jest.fn().mockResolvedValue(['training']) } as any;
    const guard = new ModuleAccessGuard(new Reflector(), svc);
    await expect(guard.canActivate(buildCtx(C, { roleCode: 'user' })))
      .rejects.toMatchObject({
        response: expect.objectContaining({ code: MODULE_DISABLED_CODE, module: 'warehouse' }),
      });
  });

  it('missing user → UnauthorizedException', async () => {
    @ModuleKey('warehouse')
    class C {}
    const guard = new ModuleAccessGuard(new Reflector(), {} as any);
    await expect(guard.canActivate(buildCtx(C, undefined))).rejects.toThrow(/未登录/);
  });
});
