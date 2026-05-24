import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard, MODULE_DISABLED_CODE } from './module-access.guard';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { ArgumentsHost, HttpException } from '@nestjs/common';

function buildCtx(handler: any, user: any) {
  const req: any = { user };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => handler,
      getClass: () => handler?.constructor ?? class X {},
    } as any,
  };
}

describe('ModuleAccessGuard', () => {
  const reflector = new Reflector();

  function freshGuard(opts: { enabled?: string[] } = {}) {
    const svc = {
      getEnabledModulesFor: jest.fn().mockResolvedValue(opts.enabled ?? []),
    } as any;
    const ownership = {
      resolve: jest.fn().mockImplementation(async (u: any) => {
        if (u.roleCode === 'admin') {
          return { userId: u.id, roleCode: 'admin', departmentId: u.departmentId, managedDepartmentIds: undefined };
        }
        if (u.roleCode === 'leader') {
          return { userId: u.id, roleCode: 'leader', departmentId: u.departmentId, managedDepartmentIds: ['d-1'] };
        }
        return { userId: u.id, roleCode: 'user', departmentId: u.departmentId, managedDepartmentIds: [] };
      }),
    } as any;
    return { guard: new ModuleAccessGuard(reflector, svc, ownership), svc, ownership };
  }

  it('no @ModuleKey → pass-through, no ownership populated', async () => {
    class C {}
    const { guard, ownership } = freshGuard();
    const { req, ctx } = buildCtx(C, { id: 'u', roleCode: 'user', departmentId: 'd' });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(ownership.resolve).not.toHaveBeenCalled();
    expect(req.ownership).toBeUndefined();
  });

  it('missing user → UnauthorizedException', async () => {
    @ModuleKey('warehouse')
    class C {}
    const { guard } = freshGuard();
    const { ctx } = buildCtx(C, undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(/未登录/);
  });

  it('admin: ownership populated with managedDepartmentIds=undefined, bypass module check', async () => {
    @ModuleKey('warehouse')
    class C {}
    const { guard, svc } = freshGuard({ enabled: [] });
    const { req, ctx } = buildCtx(C, { id: 'a', roleCode: 'admin', departmentId: null });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(svc.getEnabledModulesFor).not.toHaveBeenCalled();
    expect(req.ownership).toEqual({
      userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined,
    });
  });

  it('leader on enabled module: ownership populated with managedDepartmentIds, allowed', async () => {
    @ModuleKey('warehouse')
    class C {}
    const { guard } = freshGuard({ enabled: ['warehouse'] });
    const { req, ctx } = buildCtx(C, { id: 'l', roleCode: 'leader', departmentId: 'd-x' });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.ownership.managedDepartmentIds).toEqual(['d-1']);
  });

  it('user on disabled module: ForbiddenException with MODULE_DISABLED payload', async () => {
    @ModuleKey('warehouse')
    class C {}
    const { guard } = freshGuard({ enabled: ['training'] });
    const { req, ctx } = buildCtx(C, { id: 'u', roleCode: 'user', departmentId: 'd' });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      response: expect.objectContaining({ code: MODULE_DISABLED_CODE, module: 'warehouse' }),
    });
    // ownership is populated before the throw
    expect(req.ownership.roleCode).toBe('user');
  });

  it('ownership is populated only once per request', async () => {
    @ModuleKey('warehouse')
    class C {}
    const { guard, ownership } = freshGuard({ enabled: ['warehouse'] });
    const { req, ctx } = buildCtx(C, { id: 'u', roleCode: 'user', departmentId: 'd' });
    req.ownership = { userId: 'pre-set', roleCode: 'user', managedDepartmentIds: [] };
    await guard.canActivate(ctx);
    expect(ownership.resolve).not.toHaveBeenCalled();
    expect(req.ownership.userId).toBe('pre-set');
  });

  /**
   * P1-R6-2: Verify that HttpExceptionFilter preserves the string `code` and `module` fields
   * thrown by ModuleAccessGuard so client-side checking of `body.code === 'MODULE_DISABLED'`
   * and `body.module` works correctly.
   */
  describe('MODULE_DISABLED response passes through HttpExceptionFilter intact', () => {
    function captureFilterOutput(exception: HttpException) {
      const filter = new HttpExceptionFilter();
      let captured: Record<string, unknown> = {};
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockImplementation((body: Record<string, unknown>) => {
          captured = body;
        }),
      };
      const host: ArgumentsHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: '/test' }),
        }),
        // stubs for unused ArgumentsHost methods
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      } as unknown as ArgumentsHost;
      filter.catch(exception, host);
      return { captured, mockResponse };
    }

    it('HTTP response body contains code: MODULE_DISABLED (string) after filter', () => {
      const exception = new HttpException(
        { code: MODULE_DISABLED_CODE, module: 'warehouse', message: '模块已关闭: warehouse' },
        403,
      );
      const { captured, mockResponse } = captureFilterOutput(exception);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(captured.code).toBe(MODULE_DISABLED_CODE);
    });

    it('HTTP response body contains module field after filter', () => {
      const exception = new HttpException(
        { code: MODULE_DISABLED_CODE, module: 'warehouse', message: '模块已关闭: warehouse' },
        403,
      );
      const { captured } = captureFilterOutput(exception);
      expect(captured.module).toBe('warehouse');
    });

    it('non-string code (numeric) is NOT treated as MODULE_DISABLED', () => {
      const exception = new HttpException({ message: 'Forbidden' }, 403);
      const { captured } = captureFilterOutput(exception);
      expect(captured.code).not.toBe(MODULE_DISABLED_CODE);
      expect(typeof captured.code).toBe('number');
    });
  });
});
