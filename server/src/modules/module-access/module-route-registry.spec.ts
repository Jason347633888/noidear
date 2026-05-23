import { ModuleRouteRegistry } from './module-route-registry';

describe('ModuleRouteRegistry', () => {
  it('matches by exact controller path', () => {
    const r = new ModuleRouteRegistry({
      modules: { warehouse: [{ path: 'warehouse/materials', mode: 'exact' }] },
      adminOnly: [],
      public: [],
      auxiliary: [],
    });
    expect(r.match('warehouse/materials')?.kind).toBe('module');
    expect(r.match('warehouse/materials')?.moduleKey).toBe('warehouse');
    expect(r.match('warehouse/suppliers')).toBeNull();
  });

  it('matches by longest prefix when mode=prefix', () => {
    const r = new ModuleRouteRegistry({
      modules: {
        traceability_batch: [{ path: 'batch-trace', mode: 'prefix' }],
        production_execution: [{ path: 'batch-trace/production-batches', mode: 'exact' }],
      },
      adminOnly: [], public: [], auxiliary: [],
    });
    // longest-first: production_execution wins
    expect(r.match('batch-trace/production-batches')?.moduleKey).toBe('production_execution');
    // falls through to the prefix
    expect(r.match('batch-trace/material-batches')?.moduleKey).toBe('traceability_batch');
  });

  it('flags multi-hit configs at validate() time', () => {
    const r = new ModuleRouteRegistry({
      modules: {
        warehouse: [{ path: 'warehouse', mode: 'prefix' }],
        traceability_batch: [{ path: 'warehouse', mode: 'prefix' }],
      },
      adminOnly: [], public: [], auxiliary: [],
    });
    expect(() => r.validate(['warehouse/materials'])).toThrow(/multi-hit/i);
  });

  it('public > adminOnly > module > auxiliary precedence', () => {
    const r = new ModuleRouteRegistry({
      modules: { warehouse: [{ path: 'warehouse', mode: 'prefix' }] },
      adminOnly: [{ path: 'users', mode: 'exact' }],
      public: [{ path: 'auth', mode: 'prefix' }],
      auxiliary: [{ path: 'upload', mode: 'exact', guard: 'authenticated' }],
    });
    expect(r.match('auth/login')?.kind).toBe('public');
    expect(r.match('users')?.kind).toBe('admin-only');
    expect(r.match('warehouse/materials')?.kind).toBe('module');
    expect(r.match('upload')?.kind).toBe('auxiliary');
  });

  it('validate() reports unmapped controllers', () => {
    const r = new ModuleRouteRegistry({
      modules: { warehouse: [{ path: 'warehouse', mode: 'prefix' }] },
      adminOnly: [], public: [], auxiliary: [],
    });
    expect(() => r.validate(['warehouse/materials', 'unknown-controller']))
      .toThrow(/unmapped.*unknown-controller/i);
  });

  it('strict=false downgrades unmapped to warning', () => {
    const r = new ModuleRouteRegistry({
      modules: { warehouse: [{ path: 'warehouse', mode: 'prefix' }] },
      adminOnly: [], public: [], auxiliary: [],
    });
    const warn = jest.fn();
    r.validate(['warehouse/materials', 'unknown-controller'], { strict: false, logger: { warn } as any });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/unknown-controller/));
  });
});
