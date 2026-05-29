# Simple Role & Module Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 noidear 现有的多套权限抽象（Permission/RolePermission/FineGrainedPermission/UserPermission/RoleFineGrainedPermission/DepartmentPermission）替换成「三角色 + 模块开关 + 系统治理白名单 + 审批分派契约 + 数据归属过滤（OwnershipScope）」单一路径，删除旧子系统、改写审批引擎、保留 PermissionLog 审计历史。

**Architecture:** 单体 NestJS（server）+ Vue 3/Pinia（client）+ Prisma/Postgres。新增 `ModuleAccessModule` 提供模块开关数据与 API；新增 `ModuleAccessGuard` 统一拦截业务模块 API 并把 `OwnershipScope` 注入到 request 上；复用既有 `RolesGuard` + `@Roles('admin')` 守卫系统治理白名单；改写 `ApprovalAssignmentResolver` 仅允许三角色 + 部门派发；前端按 `enabledModules` 过滤菜单，被关模块路由跳 `/no-access`；各业务 service 按本 plan 的 `Appendix A: Ownership Audit Matrix` 在 list/detail 查询里落地 leader / user 的范围过滤。

**Tech Stack:** NestJS, Prisma, Postgres, Vue 3, Pinia, Element Plus, Vitest, Jest.

**Source spec:** `docs/superpowers/specs/2026-05-23-simple-role-module-access-design.md`

**Coverage:** 本 plan 覆盖 spec 全部内容。Tasks 1-33 落地角色制度 / 模块开关 / 审批契约 / 旧权限子系统下线 / 前端集成；Tasks 34-47 在此基础上完成字段审计与 OwnershipScope 数据归属过滤。

**Document boundary:** 本次只保留一个 spec 和一个 implementation plan。Ownership 字段审计、缺字段迁移清单、controller checklist 都写在本 plan 内；不得再新增任何平行的 ownership 审计/迁移持久文档。

---

## 🚦 Starting State (2026-05-23, fresh session can pick up here)

**Task 1 已经在前一会话跑完，dev DB 已就位。新会话直接从 Task 2 开始。**

| 项 | 状态 |
|---|---|
| `tmp/preflight-impact.md` | ✅ 10 个 symbol 的 GitNexus upstream impact 报告（7 LOW / 1 MEDIUM / 2 HIGH，HIGH = ApprovalEngineService + RolesGuard） |
| `tmp/preflight-data.md` | ✅ dev DB 三段 SQL 结果 + P0 处置说明 |
| dev DB users | 1 行（`admin` / 密码 `ChangeMe123!`） |
| dev DB roles | 3 行（`admin / leader / user`，code 已干净，Task 4 CHECK migration 可直接跑） |
| dev DB 其他业务表 | 全 0（user_permissions / approval_definitions / departments / record_task_assignments / users 除 admin 外） |
| Prisma migrations | 62 条全部 baseline 为 applied；`prisma migrate status` = up to date |
| 数据风险确认 | 用户确认 dev 无业务数据，整库 reset 已完成，无需迁移兼容 |

### 新会话起跑要点

1. **第一个动作**：跳到 `## Task 2: Module keys constants`，按 checkbox 顺序执行。
2. **没必要重跑 Task 1**：除非要部署到 staging / prod。staging / prod 部署时按 Task 1 的步骤再跑一遍（并对 Q1/Q2/Q3/Q4 名单签字）。
3. **DB 连接**：本地 docker `noidear-postgres`，库 `document_system`，用户 `noidear` / `noidear123`。完整 URL：`postgresql://noidear:noidear123@localhost:5432/document_system`。Prisma 命令需要这个 env，或者用项目的 `npm run prisma:* -w server` 包装（已配置）。
4. **执行约束**：每个 task 内的 step 是 TDD 顺序（红 → 绿 → commit）；不要跳步、不要批量 commit。
5. **HIGH-risk symbol**：实施 Task 15-17（审批改造）和 Task 18-22（旧权限退役）时，按 `tmp/preflight-impact.md` 中给出的 caller 清单跑全量测试，必须每 task 一个 PR、不可合并。
6. **spec § 通用约束第 7 条**（业务 controller 一次只挂一种顶层守卫）是硬规则；任何想给业务 controller 叠加 `@Roles(...)` 的诱惑都改为 service 层校验。

### 推荐执行模式

- **Subagent-Driven**（强烈推荐）：每个 task 派新 subagent + task 间 review。47 个 task 不会污染会话上下文。
- **Inline**：不建议（plan 4500+ 行，中后段质量会塌方）。

### 推荐工作区隔离

新建独立 worktree（如 `feat/simple-role-module-access`）跑这次 47 个 task，避免污染 master。worktree 建好后所有 PR 走它。

---

## File Structure

### New files

```
server/src/modules/module-access/
  module-access.module.ts
  module-access.constants.ts            # MODULE_KEYS, route registry data
  module-route-registry.ts              # exact/prefix matcher + fail-fast
  module-route-registry.spec.ts
  module-access.service.ts              # CRUD + enabledModules query
  module-access.service.spec.ts
  module-access.controller.ts           # GET /module-access  (authenticated)
  module-access.controller.spec.ts
  admin-module-access.controller.ts     # GET/PUT /admin/module-access  (admin)
  admin-module-access.controller.spec.ts
  module-access.guard.ts                # checks @ModuleKey + ModuleAccessConfig
  module-access.guard.spec.ts
  dto/save-module-access.dto.ts

server/src/shared/decorators/
  module-key.decorator.ts               # @ModuleKey('warehouse')

server/src/prisma/migrations/
  <ts>_module_access_config/migration.sql
  <ts>_role_code_check_constraint/migration.sql
  <ts>_drop_assignee_permission_code/migration.sql
  <ts>_drop_legacy_permission_tables/migration.sql

client/src/api/module-access.ts
client/src/stores/moduleAccess.ts
client/src/views/module-access/ModuleAccessManage.vue
client/src/views/module-access/__tests__/ModuleAccessManage.spec.ts
client/src/views/no-access/NoAccess.vue
client/src/views/no-access/__tests__/NoAccess.spec.ts
```

### Modified files

```
server/src/prisma/schema.prisma                         # add ModuleAccessConfig, drop perms, drop assigneePermissionCode
server/src/app.module.ts                                # add ModuleAccessModule, remove 4 perm modules
server/src/main.ts                                      # call registry.validate(); strict toggle by env
server/src/modules/unified-approval/approval-assignment.resolver.ts        # drop 'permission' branch
server/src/modules/unified-approval/approval-engine.service.ts             # drop perm fields
server/src/modules/unified-approval/approval-definition.controller.ts     # DTO + status + activate
server/src/modules/unified-approval/types.ts                              # drop assigneePermissionCode
server/src/modules/unified-approval/unified-approval.module.ts            # startup scan
server/src/modules/role/role.service.ts                                   # enforce code whitelist
server/src/modules/user/user.service.ts                                   # validate roleId.code in whitelist
server/src/modules/audit/audit.module.ts                                  # absorb permission-log readonly
server/src/modules/audit/audit.controller.ts                              # remove @RequirePermission
server/src/modules/document/document.controller.ts                        # remove @RequirePermission, add @ModuleKey
server/src/modules/warehouse/supplier.controller.ts                       # remove @RequirePermission, add @ModuleKey
… 各业务 controllers 应用 @ModuleKey (full list in Task 11)
server/src/prisma/seed.ts                                                 # remove perm fixtures, add module-access defaults
server/src/prisma/seed-baseline.ts / seed-e2e.ts / seed-org.ts / seed-demo.ts / seed-dev.ts
client/src/api/request.ts                                                 # axios MODULE_DISABLED interceptor
client/src/navigation/menu.ts                                             # filter by enabledModules + module key per group
client/src/router/index.ts                                                # add /module-access/manage, /no-access; add requireRole meta; remove old perm routes
```

### Deleted files

```
server/src/modules/permission/                          (entire dir)
server/src/modules/fine-grained-permission/             (entire dir)
server/src/modules/user-permission/                     (entire dir)
server/src/modules/department-permission/               (entire dir)
server/src/shared/guards/unified-permission.guard.ts
server/src/shared/guards/unified-permission.guard.spec.ts
server/src/shared/guards/unified-permission-module-di.spec.ts
server/src/shared/decorators/require-permission.decorator.ts
client/src/views/permission/                            (entire dir, including __tests__)
client/src/components/permission/                       (entire dir)
client/src/views/audit/PermissionLogList.vue            (merged into AuditLog page)
```

---

## Task 1: Pre-flight checks ✅ DONE (2026-05-23, dev DB)

> **Status：dev DB 已经完成全部三步，可以直接进入 Task 2。** 部署到 staging/prod 时按下方步骤重新跑一遍即可。

**Files:** `tmp/preflight-impact.md`、`tmp/preflight-data.md`（dev 运行产物）

- [x] **Step 1: Run GitNexus impact analysis on 10 key symbols** — **完成 2026-05-23**

For each of these symbols run `gitnexus_impact({target: "<symbol>", direction: "upstream"})` and save the report to `tmp/preflight-impact.md`:

```
UnifiedPermissionGuard
PermissionService
FineGrainedPermissionService
UserPermissionService
DepartmentPermissionService
ApprovalAssignmentResolver
ApprovalEngineService
RolesGuard
UserService
RoleService
```

Expected: 报告每个 symbol 的 caller count、被哪些 process 引用、风险等级。Any `HIGH/CRITICAL` 必须在 PR 描述里 call out。

**2026-05-23 dev 运行结果（`tmp/preflight-impact.md`）**：
- 7 LOW、1 MEDIUM、2 HIGH。
- HIGH：`ApprovalEngineService`（17 direct callers，跨 17 个业务 service）、`RolesGuard`（15 direct callers）。
- 两个 HIGH 都已在 plan 设计阶段处理：Tasks 15/16/17 三段拆分覆盖 ApprovalEngineService；Task 20 删 4 个旧 perm controller + spec § 通用约束第 7 条覆盖 RolesGuard。

- [x] **Step 2: Run the 3 SQL queries from spec § "上线前准备清单" against staging DB** — **完成 2026-05-23**

Run:
```sql
-- 1. Leader 没挂部门
SELECT u.id, u.username, u.name FROM users u
JOIN roles r ON r.id = u."roleId"
WHERE r.code = 'leader'
  AND NOT EXISTS (SELECT 1 FROM departments d WHERE d."managerId" = u.id);

-- 2. 单独授权用户
SELECT DISTINCT u.id, u.username, u.name FROM user_permissions up
JOIN users u ON u.id = up."userId"
WHERE up."expiresAt" IS NULL OR up."expiresAt" > NOW();

-- 3. 现有审批模板
SELECT id, module, "resourceType", "triggerKey", name FROM approval_definitions WHERE status = 'active';
```

Expected: 三份名单存到 `tmp/preflight-data.md`，必须在合并任何 Task 22（drop tables）之前由运营方签字确认。

**2026-05-23 dev 运行结果（`tmp/preflight-data.md`）**：
- Q1: 25 行，全部 E2E/auth008 测试残留 + 1 个 dev 账号（`123123`）。
- Q2: 0 行（`user_permissions` 表本来就空）。
- Q3: 0 行（`approval_definitions` 表本来就空）。
- **P0 阻断点**：`roles` 表当前有 180 行 `code` 不属于 `admin/leader/user`（全是 E2E 残留），会卡死 Task 4 的 CHECK 约束 migration。

**dev 处置（已执行 2026-05-23）**：因为 dev DB 没有真实业务数据，直接 `npm run prisma:reset -w server` 整库重置 + baseline seed 重跑。重置后状态：
- `users` 1 行（`admin` / `ChangeMe123!`）
- `roles` 3 行（`admin`、`leader`、`user`）
- `departments` 0 行
- `user_permissions / approval_definitions / record_task_assignments` 全部 0 行

dev 现在可以直接进 Task 2-47，所有迁移都跑在干净环境上。

> **staging / prod 处置（部署时按此处理）**：如果 Q1/Q2/Q3 名单非空（生产很可能非空），不允许 `prisma:reset`；改为：
> - Q1 → 由运营在 admin 页面修 `departments.managerId` 或降级 user 角色；
> - Q2 → 由运营评估每个授权用户是否调整角色/部门或接受失权；
> - Q3 → 由业务管理员重建模板（按 spec § 上线前准备清单 § 3）；
> - `roles` 表非三角色行 → 业务管理员决策保留/删除，禁止保留任何 `code ∉ {admin,leader,user}` 的行；
> - 全部对账完成才能跑 Task 4 之后的迁移。

- [x] **Step 3: Confirm checkpoint** — **完成 2026-05-23**

人工 checkpoint。如果有未确认的高风险 caller、未对账的 leader/单独授权用户/模板，停止执行后续任务。

**dev 结论（2026-05-23）**：用户确认无业务数据风险 → 整库 reset 已经把所有 E2E 残留清掉 → checkpoint 通过 → 可进入 Task 2。

> **staging / prod 部署时**：必须由运营 / 业务管理员对 Step 2 的三份名单签字（`signoff_status: keep|downgrade|accept|rebuild`），未签字不得合并 Task 17（drop column）和 Task 22（drop 6 tables）的 PR。

---

## Task 2: Module keys constants

**Files:**
- Create: `server/src/modules/module-access/module-access.constants.ts`
- Test: `server/src/modules/module-access/module-access.constants.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// server/src/modules/module-access/module-access.constants.spec.ts
import {
  MODULE_KEYS,
  MODULE_LABELS,
  isModuleKey,
  type ModuleKey,
} from './module-access.constants';

describe('MODULE_KEYS', () => {
  it('exposes exactly the 9 business module keys defined by spec', () => {
    expect(MODULE_KEYS).toEqual([
      'work_execution',
      'document_approval',
      'production_execution',
      'product_rd',
      'quality_compliance',
      'equipment_site',
      'traceability_batch',
      'warehouse',
      'training',
    ]);
  });

  it('provides Chinese labels for every key', () => {
    MODULE_KEYS.forEach((k) => {
      expect(MODULE_LABELS[k as ModuleKey]).toBeTruthy();
    });
  });

  it('isModuleKey accepts only known keys', () => {
    expect(isModuleKey('warehouse')).toBe(true);
    expect(isModuleKey('quality_manager')).toBe(false);
    expect(isModuleKey('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

`npm run test -w server -- module-access.constants -t "MODULE_KEYS"` → FAIL: cannot find module.

- [ ] **Step 3: Implement constants**

```ts
// server/src/modules/module-access/module-access.constants.ts
export const MODULE_KEYS = [
  'work_execution',
  'document_approval',
  'production_execution',
  'product_rd',
  'quality_compliance',
  'equipment_site',
  'traceability_batch',
  'warehouse',
  'training',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  work_execution: '工作执行',
  document_approval: '文控与审批',
  production_execution: '生产执行',
  product_rd: '产品研发',
  quality_compliance: '质量与合规',
  equipment_site: '设备与现场',
  traceability_batch: '追溯与批次',
  warehouse: '仓库管理',
  training: '培训',
};

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === 'string' && (MODULE_KEYS as readonly string[]).includes(value);
}

export const ROLE_CODES_WITH_TOGGLE = ['leader', 'user'] as const;
export type RoleCodeWithToggle = (typeof ROLE_CODES_WITH_TOGGLE)[number];
```

- [ ] **Step 4: Run test (expect pass)**

`npm run test -w server -- module-access.constants` → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/module-access/module-access.constants.ts \
        server/src/modules/module-access/module-access.constants.spec.ts
git commit -m "feat(module-access): add module keys and labels"
```

---

## Task 3: ModuleRouteRegistry foundation

Implements the matching algorithm (`exact` default + opt-in `prefix` with longest-first + fail-fast on multi-hit). Used by `ModuleAccessGuard` and bootstrap validation.

**Files:**
- Create: `server/src/modules/module-access/module-route-registry.ts`
- Create: `server/src/modules/module-access/module-route-registry.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/modules/module-access/module-route-registry.spec.ts
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
```

- [ ] **Step 2: Run tests (expect fail)**

`npm run test -w server -- module-route-registry` → FAIL: cannot find module.

- [ ] **Step 3: Implement registry**

```ts
// server/src/modules/module-access/module-route-registry.ts
import type { LoggerService } from '@nestjs/common';
import type { ModuleKey } from './module-access.constants';

export type MatchMode = 'exact' | 'prefix';
export interface RouteEntry { path: string; mode: MatchMode; }
export interface AuxiliaryEntry extends RouteEntry { guard: 'authenticated' | 'public'; }

export interface RegistryConfig {
  modules: Partial<Record<ModuleKey, RouteEntry[]>>;
  adminOnly: RouteEntry[];
  public: RouteEntry[];
  auxiliary: AuxiliaryEntry[];
}

export type MatchResult =
  | { kind: 'module'; moduleKey: ModuleKey; entry: RouteEntry }
  | { kind: 'admin-only'; entry: RouteEntry }
  | { kind: 'public'; entry: RouteEntry }
  | { kind: 'auxiliary'; entry: AuxiliaryEntry };

export class ModuleRouteRegistry {
  constructor(private readonly cfg: RegistryConfig) {}

  match(controllerPath: string): MatchResult | null {
    const norm = controllerPath.replace(/^\/+|\/+$/g, '');

    if (this.findEntry(this.cfg.public, norm))
      return { kind: 'public', entry: this.findEntry(this.cfg.public, norm)! };

    if (this.findEntry(this.cfg.adminOnly, norm))
      return { kind: 'admin-only', entry: this.findEntry(this.cfg.adminOnly, norm)! };

    const moduleHits: { key: ModuleKey; entry: RouteEntry }[] = [];
    for (const [key, entries] of Object.entries(this.cfg.modules) as [ModuleKey, RouteEntry[] | undefined][]) {
      if (!entries) continue;
      const hit = this.findEntry(entries, norm);
      if (hit) moduleHits.push({ key, entry: hit });
    }
    if (moduleHits.length > 1) {
      // resolve by longest path; ties => fail-fast at validate time
      moduleHits.sort((a, b) => b.entry.path.length - a.entry.path.length);
    }
    if (moduleHits.length >= 1)
      return { kind: 'module', moduleKey: moduleHits[0].key, entry: moduleHits[0].entry };

    const aux = this.findEntry(this.cfg.auxiliary, norm);
    if (aux) return { kind: 'auxiliary', entry: aux };

    return null;
  }

  validate(allControllerPaths: string[], opts: { strict?: boolean; logger?: LoggerService } = {}) {
    const strict = opts.strict ?? true;
    const log = opts.logger;
    const unmapped: string[] = [];
    const multiHits: string[] = [];

    for (const path of allControllerPaths) {
      const norm = path.replace(/^\/+|\/+$/g, '');
      const hits = this.collectAllHits(norm);
      if (hits.length === 0) {
        unmapped.push(norm);
        continue;
      }
      // multi-hit detection ignores public+anything else (public is highest priority and short-circuits)
      const tieGroups = this.detectMultiHit(hits);
      if (tieGroups.length > 0) multiHits.push(`${norm} -> ${tieGroups.join(', ')}`);
    }

    if (multiHits.length > 0) {
      throw new Error(`ModuleRouteRegistry multi-hit detected:\n  ${multiHits.join('\n  ')}`);
    }
    if (unmapped.length > 0) {
      const msg = `ModuleRouteRegistry unmapped controllers:\n  ${unmapped.join('\n  ')}`;
      if (strict) throw new Error(msg);
      log?.warn?.(msg);
    }
  }

  private findEntry(entries: RouteEntry[], path: string): RouteEntry | null {
    const exact = entries.find((e) => e.mode === 'exact' && e.path === path);
    if (exact) return exact;
    const prefixCandidates = entries
      .filter((e) => e.mode === 'prefix' && (path === e.path || path.startsWith(e.path + '/')))
      .sort((a, b) => b.path.length - a.path.length);
    return prefixCandidates[0] ?? null;
  }

  private collectAllHits(path: string) {
    const out: { kind: string; entry: RouteEntry; source?: ModuleKey }[] = [];
    if (this.findEntry(this.cfg.public, path)) out.push({ kind: 'public', entry: this.findEntry(this.cfg.public, path)! });
    if (this.findEntry(this.cfg.adminOnly, path)) out.push({ kind: 'admin-only', entry: this.findEntry(this.cfg.adminOnly, path)! });
    for (const [key, entries] of Object.entries(this.cfg.modules) as [ModuleKey, RouteEntry[] | undefined][]) {
      if (!entries) continue;
      const hit = this.findEntry(entries, path);
      if (hit) out.push({ kind: 'module', entry: hit, source: key });
    }
    if (this.findEntry(this.cfg.auxiliary, path)) out.push({ kind: 'auxiliary', entry: this.findEntry(this.cfg.auxiliary, path)! });
    return out;
  }

  private detectMultiHit(hits: { kind: string; entry: RouteEntry; source?: ModuleKey }[]): string[] {
    // multiple module hits with identical path length = unresolved tie
    const moduleHits = hits.filter((h) => h.kind === 'module');
    if (moduleHits.length < 2) return [];
    const maxLen = Math.max(...moduleHits.map((h) => h.entry.path.length));
    const top = moduleHits.filter((h) => h.entry.path.length === maxLen);
    if (top.length > 1) return top.map((h) => `${h.source}:${h.entry.path}`);
    return [];
  }
}
```

- [ ] **Step 4: Run tests (expect pass)**

`npm run test -w server -- module-route-registry` → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/module-access/module-route-registry.ts \
        server/src/modules/module-access/module-route-registry.spec.ts
git commit -m "feat(module-access): add ModuleRouteRegistry with exact/prefix matcher"
```

---

## Task 4: Prisma ModuleAccessConfig + Role.code CHECK + seed defaults

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<ts>_module_access_config/migration.sql`
- Create: `server/src/prisma/migrations/<ts>_role_code_check_constraint/migration.sql`
- Modify: `server/src/prisma/seed.ts` (only the parts that add baseline data, not the cleanup yet)

- [ ] **Step 1: Add Prisma model**

Append to `server/src/prisma/schema.prisma` (before the trailing legacy permission models if any — keep them in the file for now; Task 22 deletes them):

```prisma
// 简化角色与模块开关
model ModuleAccessConfig {
  id        String   @id @default(cuid())
  moduleKey String
  roleCode  String   // 仅允许 'leader' | 'user'
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([moduleKey, roleCode])
  @@index([moduleKey])
  @@index([roleCode])
  @@map("module_access_configs")
}
```

- [ ] **Step 2: Generate the Prisma migration**

```bash
npm run prisma:migrate -w server -- --name module_access_config --create-only
```

Edit the generated `migration.sql` to add the application-layer CHECK on roleCode (Postgres CHECK that complements the `@unique` on (moduleKey, roleCode)):

```sql
-- AddTable
CREATE TABLE "module_access_configs" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "module_access_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_access_configs_moduleKey_roleCode_key" ON "module_access_configs"("moduleKey", "roleCode");
CREATE INDEX "module_access_configs_moduleKey_idx" ON "module_access_configs"("moduleKey");
CREATE INDEX "module_access_configs_roleCode_idx" ON "module_access_configs"("roleCode");

-- spec 强制 roleCode 仅 leader|user，模块 key 由应用层校验
ALTER TABLE "module_access_configs"
  ADD CONSTRAINT "module_access_configs_role_chk"
  CHECK ("roleCode" IN ('leader', 'user'));
```

- [ ] **Step 3: Create the Role.code CHECK migration**

```bash
npm run prisma:migrate -w server -- --name role_code_check_constraint --create-only
```

Replace the generated body with:

```sql
-- Spec: roles.code 仅允许 admin/leader/user
ALTER TABLE "roles"
  ADD CONSTRAINT "roles_code_enum_chk"
  CHECK (code IN ('admin', 'leader', 'user'));
```

- [ ] **Step 4: Apply migrations & verify schema**

```bash
npm run prisma:migrate -w server
npm run prisma:generate -w server
```

Expected: 两个迁移成功；`@@unique([moduleKey, roleCode])` 索引存在；`SELECT * FROM information_schema.check_constraints WHERE constraint_name LIKE 'roles_code%';` 返回 1 行；尝试 `INSERT INTO roles(id,code,name) VALUES ('x','qm','Q')` 报 23514。

- [ ] **Step 5: Seed default module-access config**

Edit `server/src/prisma/seed.ts` and append (before the file's final `console.log` summary):

```ts
// ── 模块开关默认配置
import { MODULE_KEYS, ROLE_CODES_WITH_TOGGLE } from '../modules/module-access/module-access.constants';

for (const moduleKey of MODULE_KEYS) {
  for (const roleCode of ROLE_CODES_WITH_TOGGLE) {
    await prisma.moduleAccessConfig.upsert({
      where: { moduleKey_roleCode: { moduleKey, roleCode } },
      update: {},
      create: { moduleKey, roleCode, enabled: true },
    });
  }
}
console.log(`✅ ModuleAccessConfig seeded (${MODULE_KEYS.length} modules × 2 roles)`);
```

- [ ] **Step 6: Run seed against dev**

```bash
npm run prisma:seed -w server
```

Expected: 输出 `ModuleAccessConfig seeded (9 modules × 2 roles)`；表中 18 行，全部 `enabled = true`。

- [ ] **Step 7: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/*module_access_config* \
        server/src/prisma/migrations/*role_code_check_constraint* \
        server/src/prisma/seed.ts
git commit -m "feat(module-access): add ModuleAccessConfig model, Role.code CHECK, default seed"
```

---

## Task 5: ModuleAccessService

**Files:**
- Create: `server/src/modules/module-access/module-access.service.ts`
- Create: `server/src/modules/module-access/module-access.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/modules/module-access/module-access.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessService', () => {
  let service: ModuleAccessService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      moduleAccessConfig: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const mod = await Test.createTestingModule({
      providers: [ModuleAccessService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(ModuleAccessService);
  });

  it('admin always sees all module keys (DB not queried)', async () => {
    const enabled = await service.getEnabledModulesFor({ roleCode: 'admin' });
    expect(enabled).toContain('warehouse');
    expect(enabled.length).toBe(9);
    expect(prisma.moduleAccessConfig.findMany).not.toHaveBeenCalled();
  });

  it('leader sees only enabled=true modules from DB', async () => {
    prisma.moduleAccessConfig.findMany.mockResolvedValue([
      { moduleKey: 'warehouse', roleCode: 'leader', enabled: true },
      { moduleKey: 'training', roleCode: 'leader', enabled: false },
    ]);
    const enabled = await service.getEnabledModulesFor({ roleCode: 'leader' });
    expect(enabled).toEqual(['warehouse']);
  });

  it('listMatrix returns 9 × 2 rows ordered by spec key order', async () => {
    prisma.moduleAccessConfig.findMany.mockResolvedValue([
      { moduleKey: 'warehouse', roleCode: 'user', enabled: true },
      { moduleKey: 'warehouse', roleCode: 'leader', enabled: true },
    ]);
    const matrix = await service.listMatrix();
    expect(matrix.find((m) => m.moduleKey === 'warehouse')).toEqual({
      moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: true,
    });
  });

  it('saveMatrix upserts every (moduleKey, roleCode) pair', async () => {
    prisma.moduleAccessConfig.upsert.mockResolvedValue({});
    await service.saveMatrix([
      { moduleKey: 'warehouse', leader: false, user: true },
      { moduleKey: 'training', leader: true, user: true },
    ]);
    expect(prisma.moduleAccessConfig.upsert).toHaveBeenCalledTimes(4);
  });

  it('saveMatrix rejects unknown moduleKey', async () => {
    await expect(service.saveMatrix([{ moduleKey: 'not_a_module' as any, leader: true, user: true }]))
      .rejects.toThrow(/unknown module/i);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)** — `npm run test -w server -- module-access.service`

- [ ] **Step 3: Implement**

```ts
// server/src/modules/module-access/module-access.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MODULE_KEYS, MODULE_LABELS, ROLE_CODES_WITH_TOGGLE,
  isModuleKey, type ModuleKey, type RoleCodeWithToggle,
} from './module-access.constants';

export interface MatrixRow {
  moduleKey: ModuleKey;
  moduleLabel: string;
  leader: boolean;
  user: boolean;
}

export interface MatrixWriteInput {
  moduleKey: ModuleKey;
  leader: boolean;
  user: boolean;
}

@Injectable()
export class ModuleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnabledModulesFor(opts: { roleCode: string }): Promise<ModuleKey[]> {
    if (opts.roleCode === 'admin') return [...MODULE_KEYS];
    if (!ROLE_CODES_WITH_TOGGLE.includes(opts.roleCode as RoleCodeWithToggle)) return [];

    const rows = await this.prisma.moduleAccessConfig.findMany({
      where: { roleCode: opts.roleCode, enabled: true },
      select: { moduleKey: true },
    });
    return rows.map((r: { moduleKey: string }) => r.moduleKey as ModuleKey)
      .filter((k: ModuleKey) => MODULE_KEYS.includes(k));
  }

  async listMatrix(): Promise<MatrixRow[]> {
    const rows = await this.prisma.moduleAccessConfig.findMany();
    const lookup = new Map<string, boolean>();
    rows.forEach((r: any) => lookup.set(`${r.moduleKey}:${r.roleCode}`, r.enabled));
    return MODULE_KEYS.map((moduleKey) => ({
      moduleKey,
      moduleLabel: MODULE_LABELS[moduleKey],
      leader: lookup.get(`${moduleKey}:leader`) ?? true,
      user: lookup.get(`${moduleKey}:user`) ?? true,
    }));
  }

  async saveMatrix(rows: MatrixWriteInput[]): Promise<void> {
    for (const row of rows) {
      if (!isModuleKey(row.moduleKey)) {
        throw new BadRequestException(`Unknown moduleKey: ${row.moduleKey}`);
      }
    }
    for (const row of rows) {
      for (const roleCode of ROLE_CODES_WITH_TOGGLE) {
        const enabled = row[roleCode];
        await this.prisma.moduleAccessConfig.upsert({
          where: { moduleKey_roleCode: { moduleKey: row.moduleKey, roleCode } },
          update: { enabled },
          create: { moduleKey: row.moduleKey, roleCode, enabled },
        });
      }
    }
  }
}
```

- [ ] **Step 4: Run tests (expect pass)** — all 5 cases green.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/module-access/module-access.service.ts \
        server/src/modules/module-access/module-access.service.spec.ts
git commit -m "feat(module-access): ModuleAccessService with admin bypass + matrix CRUD"
```

---

## Task 6: GET /module-access (authenticated public)

**Files:**
- Create: `server/src/modules/module-access/module-access.controller.ts`
- Create: `server/src/modules/module-access/module-access.controller.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// server/src/modules/module-access/module-access.controller.spec.ts
import { Test } from '@nestjs/testing';
import { ModuleAccessController } from './module-access.controller';
import { ModuleAccessService } from './module-access.service';

describe('ModuleAccessController', () => {
  let controller: ModuleAccessController;
  let service: jest.Mocked<ModuleAccessService>;

  beforeEach(async () => {
    service = { getEnabledModulesFor: jest.fn() } as any;
    const mod = await Test.createTestingModule({
      controllers: [ModuleAccessController],
      providers: [{ provide: ModuleAccessService, useValue: service }],
    }).compile();
    controller = mod.get(ModuleAccessController);
  });

  it('returns roleCode + enabledModules for current user', async () => {
    service.getEnabledModulesFor.mockResolvedValue(['warehouse', 'training']);
    const result = await controller.getMine({ user: { roleCode: 'user' } } as any);
    expect(result).toEqual({ roleCode: 'user', enabledModules: ['warehouse', 'training'] });
  });

  it('admin bypass — service returns all 9 keys', async () => {
    service.getEnabledModulesFor.mockResolvedValue([
      'work_execution','document_approval','production_execution','product_rd',
      'quality_compliance','equipment_site','traceability_batch','warehouse','training',
    ]);
    const result = await controller.getMine({ user: { roleCode: 'admin' } } as any);
    expect(result.enabledModules.length).toBe(9);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

- [ ] **Step 3: Implement controller**

```ts
// server/src/modules/module-access/module-access.controller.ts
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessService } from './module-access.service';

@UseGuards(JwtAuthGuard)
@Controller('module-access')
export class ModuleAccessController {
  constructor(private readonly service: ModuleAccessService) {}

  @Get()
  async getMine(@Request() req: any) {
    const roleCode = req.user?.roleCode ?? '';
    const enabledModules = await this.service.getEnabledModulesFor({ roleCode });
    return { roleCode, enabledModules };
  }
}
```

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/module-access/module-access.controller.ts \
        server/src/modules/module-access/module-access.controller.spec.ts
git commit -m "feat(module-access): GET /module-access for current user"
```

---

## Task 7: GET / PUT /admin/module-access (admin-only)

**Files:**
- Create: `server/src/modules/module-access/dto/save-module-access.dto.ts`
- Create: `server/src/modules/module-access/admin-module-access.controller.ts`
- Create: `server/src/modules/module-access/admin-module-access.controller.spec.ts`

- [ ] **Step 1: Write DTO + tests**

```ts
// server/src/modules/module-access/dto/save-module-access.dto.ts
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { MODULE_KEYS } from '../module-access.constants';

export class SaveModuleAccessRowDto {
  @IsIn(MODULE_KEYS as readonly string[])
  moduleKey!: string;

  @IsBoolean()
  leader!: boolean;

  @IsBoolean()
  user!: boolean;
}

export class SaveModuleAccessDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveModuleAccessRowDto)
  modules!: SaveModuleAccessRowDto[];
}
```

```ts
// server/src/modules/module-access/admin-module-access.controller.spec.ts
import { Test } from '@nestjs/testing';
import { AdminModuleAccessController } from './admin-module-access.controller';
import { ModuleAccessService } from './module-access.service';

describe('AdminModuleAccessController', () => {
  let controller: AdminModuleAccessController;
  let service: jest.Mocked<ModuleAccessService>;

  beforeEach(async () => {
    service = { listMatrix: jest.fn(), saveMatrix: jest.fn() } as any;
    const mod = await Test.createTestingModule({
      controllers: [AdminModuleAccessController],
      providers: [{ provide: ModuleAccessService, useValue: service }],
    }).compile();
    controller = mod.get(AdminModuleAccessController);
  });

  it('GET returns matrix payload', async () => {
    service.listMatrix.mockResolvedValue([
      { moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: false },
    ]);
    const r = await controller.list();
    expect(r.modules.length).toBe(1);
    expect(r.modules[0].moduleKey).toBe('warehouse');
  });

  it('PUT calls saveMatrix with parsed rows', async () => {
    await controller.save({ modules: [{ moduleKey: 'warehouse', leader: false, user: true } as any] });
    expect(service.saveMatrix).toHaveBeenCalledWith([
      { moduleKey: 'warehouse', leader: false, user: true },
    ]);
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

- [ ] **Step 3: Implement controller**

```ts
// server/src/modules/module-access/admin-module-access.controller.ts
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ModuleAccessService } from './module-access.service';
import { SaveModuleAccessDto } from './dto/save-module-access.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/module-access')
export class AdminModuleAccessController {
  constructor(private readonly service: ModuleAccessService) {}

  @Get()
  async list() {
    return { modules: await this.service.listMatrix() };
  }

  @Put()
  async save(@Body() body: SaveModuleAccessDto) {
    await this.service.saveMatrix(body.modules);
    return { modules: await this.service.listMatrix() };
  }
}
```

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Wire ModuleAccessModule**

```ts
// server/src/modules/module-access/module-access.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleAccessService } from './module-access.service';
import { ModuleAccessController } from './module-access.controller';
import { AdminModuleAccessController } from './admin-module-access.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ModuleAccessController, AdminModuleAccessController],
  providers: [ModuleAccessService],
  exports: [ModuleAccessService],
})
export class ModuleAccessModule {}
```

Register in `server/src/app.module.ts` (add to the imports array — leave the legacy permission modules in place; Task 22 removes them):

```ts
import { ModuleAccessModule } from './modules/module-access/module-access.module';
// …
imports: [
  // …existing
  ModuleAccessModule,
],
```

- [ ] **Step 6: Smoke test endpoints**

```bash
npm run start:dev -w server &
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/v1/admin/module-access | jq
curl -s -H "Authorization: Bearer <leader-token>" http://localhost:3000/api/v1/module-access | jq
```

Expected: admin matrix 含 9 行；leader 看到自己 enabledModules 数组。

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/module-access/
git commit -m "feat(module-access): admin matrix GET/PUT endpoints"
```

---

## Task 8: @ModuleKey() decorator

**Files:**
- Create: `server/src/shared/decorators/module-key.decorator.ts`
- Create: `server/src/shared/decorators/module-key.decorator.spec.ts`

- [ ] **Step 1: Write test**

```ts
// server/src/shared/decorators/module-key.decorator.spec.ts
import { Reflector } from '@nestjs/core';
import { ModuleKey, MODULE_KEY_METADATA, getModuleKey } from './module-key.decorator';

describe('@ModuleKey', () => {
  it('attaches the module key as metadata', () => {
    @ModuleKey('warehouse')
    class FakeController {}
    const reflector = new Reflector();
    expect(reflector.get(MODULE_KEY_METADATA, FakeController)).toBe('warehouse');
    expect(getModuleKey(reflector, FakeController)).toBe('warehouse');
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Implement decorator**

```ts
// server/src/shared/decorators/module-key.decorator.ts
import { SetMetadata } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ModuleKey as ModuleKeyType } from '../../modules/module-access/module-access.constants';

export const MODULE_KEY_METADATA = 'module-access:module-key';

export const ModuleKey = (key: ModuleKeyType) => SetMetadata(MODULE_KEY_METADATA, key);

export function getModuleKey(reflector: Reflector, target: any): ModuleKeyType | undefined {
  return reflector.getAllAndOverride<ModuleKeyType | undefined>(MODULE_KEY_METADATA, [target, target?.constructor]);
}
```

- [ ] **Step 4: Run test (expect pass)** — `npm run test -w server -- module-key.decorator`

- [ ] **Step 5: Commit**

```bash
git add server/src/shared/decorators/module-key.decorator.ts \
        server/src/shared/decorators/module-key.decorator.spec.ts
git commit -m "feat(module-access): @ModuleKey decorator"
```

---

## Task 9: ModuleAccessGuard

Enforces `enabledModules` for the calling user; returns `{ code: 'MODULE_DISABLED', module }` on rejection.

**Files:**
- Create: `server/src/modules/module-access/module-access.guard.ts`
- Create: `server/src/modules/module-access/module-access.guard.spec.ts`

- [ ] **Step 1: Write tests**

```ts
// server/src/modules/module-access/module-access.guard.spec.ts
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
```

- [ ] **Step 2: Run tests (expect fail)**

- [ ] **Step 3: Implement guard**

```ts
// server/src/modules/module-access/module-access.guard.ts
import {
  CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus,
  Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getModuleKey } from '../../shared/decorators/module-key.decorator';
import { ModuleAccessService } from './module-access.service';

export const MODULE_DISABLED_CODE = 'MODULE_DISABLED';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const klass = context.getClass();
    const moduleKey =
      this.reflector.getAllAndOverride<string | undefined>(
        'module-access:module-key',
        [handler, klass],
      );

    if (!moduleKey) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException('未登录');
    if (user.roleCode === 'admin') return true;

    const enabled = await this.service.getEnabledModulesFor({ roleCode: user.roleCode });
    if (enabled.includes(moduleKey as any)) return true;

    throw new HttpException(
      { code: MODULE_DISABLED_CODE, module: moduleKey, message: `模块已关闭: ${moduleKey}` },
      HttpStatus.FORBIDDEN,
    );
  }
}
```

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Register guard globally**

Edit `server/src/app.module.ts` to add `ModuleAccessGuard` as an APP_GUARD (so every controller is covered; no-`@ModuleKey` controllers are pass-through):

```ts
import { APP_GUARD } from '@nestjs/core';
import { ModuleAccessGuard } from './modules/module-access/module-access.guard';
// …
providers: [
  // …existing
  { provide: APP_GUARD, useClass: ModuleAccessGuard },
],
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/module-access/module-access.guard.ts \
        server/src/modules/module-access/module-access.guard.spec.ts \
        server/src/app.module.ts
git commit -m "feat(module-access): global ModuleAccessGuard with MODULE_DISABLED contract"
```

---

## Task 10: Bootstrap registry validation (strict=false)

**Files:**
- Modify: `server/src/main.ts`
- Create: `server/src/modules/module-access/registry-config.ts` (the actual mapping data)

- [ ] **Step 1: Create the registry config from spec**

```ts
// server/src/modules/module-access/registry-config.ts
import type { RegistryConfig } from './module-route-registry';

export const REGISTRY_CONFIG: RegistryConfig = {
  public: [
    { path: 'auth', mode: 'prefix' },
    { path: 'liveness', mode: 'exact' },
    { path: 'module-access', mode: 'exact' },
  ],
  adminOnly: [
    { path: 'users', mode: 'exact' },
    { path: 'departments', mode: 'exact' },
    { path: 'roles', mode: 'exact' },
    { path: 'admin/module-access', mode: 'exact' },
    { path: 'audit', mode: 'exact' },
    { path: 'operation-logs', mode: 'exact' },
    { path: 'system-configs', mode: 'exact' },
    { path: 'permission-audit-logs', mode: 'exact' },
    { path: 'org-bootstrap', mode: 'exact' },
  ],
  auxiliary: [
    { path: 'notifications', mode: 'exact', guard: 'authenticated' },
    { path: 'upload', mode: 'exact', guard: 'authenticated' },
    { path: 'search', mode: 'exact', guard: 'authenticated' },
  ],
  modules: {
    work_execution: [
      { path: 'todos', mode: 'exact' },
      { path: 'tasks', mode: 'exact' },
      { path: 'approval-tasks', mode: 'exact' },
      { path: 'approval-instances', mode: 'exact' },
    ],
    document_approval: [
      { path: 'documents', mode: 'exact' },
      // NOTE(2026-05-24): 'templates', 'dynamic-forms', 'record-templates', 'records' 已在
      // dynamic-form-retirement (branch: codex/retire-dynamic-forms) 中退役。
      // module-access 落地时不要将这些路径写入 registry-config.ts。
      { path: 'approval-definitions', mode: 'exact' },
    ],
    production_execution: [
      { path: 'batch-trace/production-batches', mode: 'exact' },
      { path: 'production-runs', mode: 'exact' },
      { path: 'mixing', mode: 'exact' },
      { path: 'batch-trace/batch-mixing-aggregations', mode: 'exact' },
      { path: 'process/instances', mode: 'exact' },
      { path: 'process/templates', mode: 'exact' },
      { path: 'process-steps', mode: 'exact' },
      { path: 'process-records', mode: 'exact' },
      { path: 'shift-instances', mode: 'exact' },
      { path: 'team-shifts', mode: 'exact' },
      { path: 'line-change-check-records', mode: 'exact' },
    ],
    product_rd: [
      { path: 'products', mode: 'exact' },
      { path: 'recipes', mode: 'exact' },
      // NOTE(2026-05-24): 'model-landing' 已在 dynamic-form-retirement 中退役，不要写入 registry-config.ts。
      { path: 'change-events', mode: 'exact' },
      { path: 'change-verification-records', mode: 'exact' },
      { path: 'change-compliance-records', mode: 'exact' },
    ],
    quality_compliance: [
      { path: 'non-conformances', mode: 'exact' },
      { path: 'corrective-actions', mode: 'exact' },
      { path: 'product-recalls', mode: 'exact' },
      { path: 'customer-complaints', mode: 'exact' },
      { path: 'deviation-reports', mode: 'exact' },
      { path: 'deviation-analytics', mode: 'exact' },
      { path: 'rework-records', mode: 'exact' },
      { path: 'food-safety-culture-records', mode: 'exact' },
      { path: 'emergency-drills', mode: 'exact' },
      { path: 'supplier-evaluations', mode: 'exact' },
      { path: 'incoming-inspections', mode: 'exact' },
      { path: 'metal-detections', mode: 'exact' },
      { path: 'fragile-item-inspections', mode: 'exact' },
      { path: 'measuring-equipment', mode: 'exact' },
      { path: 'environment-records', mode: 'exact' },
      { path: 'medication-records', mode: 'exact' },
      { path: 'cleaning-records', mode: 'exact' },
      { path: 'ccp', mode: 'exact' },
      { path: 'waste', mode: 'exact' },
      { path: 'violation-records', mode: 'exact' },
      { path: 'visitor-records', mode: 'exact' },
      { path: 'workshop-areas', mode: 'exact' },
    ],
    equipment_site: [
      { path: 'equipment', mode: 'exact' },
      { path: 'equipment/faults', mode: 'exact' },
      { path: 'equipment/stats', mode: 'exact' },
      { path: 'maintenance-plans', mode: 'exact' },
      { path: 'maintenance-records', mode: 'exact' },
    ],
    traceability_batch: [
      { path: 'traceability', mode: 'exact' },
      { path: 'batch-trace', mode: 'exact' },
      { path: 'batch-trace/trace', mode: 'exact' },
      { path: 'batch-trace/material-batches', mode: 'exact' },
      { path: 'batch-trace/material-usage', mode: 'exact' },
      { path: 'warehouse/material-balance', mode: 'exact' },
      { path: 'warehouse/traceability', mode: 'exact' },
      { path: 'packaging-material-usages', mode: 'exact' },
    ],
    warehouse: [
      { path: 'warehouse/batches', mode: 'exact' },
      { path: 'warehouse/materials', mode: 'exact' },
      { path: 'warehouse/inbound', mode: 'exact' },
      { path: 'warehouse/requisitions', mode: 'exact' },
      { path: 'warehouse/staging-area', mode: 'exact' },
      { path: 'warehouse/suppliers', mode: 'exact' },
      { path: 'scraps', mode: 'exact' },
      { path: 'returns', mode: 'exact' },
      { path: 'external-parties', mode: 'exact' },
    ],
    training: [
      { path: 'training', mode: 'exact' },
      { path: 'training/records', mode: 'exact' },
      { path: 'training/archive', mode: 'exact' },
      { path: 'training/exam', mode: 'exact' },
      { path: 'training/questions', mode: 'exact' },
    ],
  },
};
```

- [ ] **Step 2: Add bootstrap-time validate call**

Edit `server/src/main.ts` (after `await app.listen(port)` but before final log):

```ts
import { ModuleRouteRegistry } from './modules/module-access/module-route-registry';
import { REGISTRY_CONFIG } from './modules/module-access/registry-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // …existing setup…

  // Discover all controller paths via Nest reflection
  const registry = new ModuleRouteRegistry(REGISTRY_CONFIG);
  const controllerPaths = discoverControllerPaths(app);
  const strict = process.env.MODULE_REGISTRY_STRICT === 'true';
  const logger = new Logger('ModuleRouteRegistry');
  registry.validate(controllerPaths, { strict, logger });
  logger.log(`Validated ${controllerPaths.length} controller paths (strict=${strict})`);

  await app.listen(port);
}

function discoverControllerPaths(app: import('@nestjs/common').INestApplication): string[] {
  const container = (app as any).container;
  const modules = container.getModules?.() ?? container.modules;
  const paths = new Set<string>();
  modules.forEach((m: any) => {
    m.controllers.forEach((wrapper: any) => {
      const meta = Reflect.getMetadata?.('path', wrapper.metatype);
      if (typeof meta === 'string') paths.add(meta);
    });
  });
  return [...paths];
}
```

- [ ] **Step 3: Manual run**

```bash
MODULE_REGISTRY_STRICT=false npm run start:dev -w server
```

Expected: 启动成功；日志中出现 `Validated N controller paths (strict=false)`，并对未挂模块 key 的 controller 输出 warning。Take note of warnings — Task 11 will add `@ModuleKey()` to them.

- [ ] **Step 4: Commit**

```bash
git add server/src/main.ts \
        server/src/modules/module-access/registry-config.ts
git commit -m "feat(module-access): bootstrap-time ModuleRouteRegistry validation (strict=false)"
```

---

## Task 11: Apply @ModuleKey() to every business controller

This is high-volume but mechanical. For each controller below, **(a)** add `@ModuleKey('<key>')` at class level, **(b)** ensure `@UseGuards(JwtAuthGuard)` is already present (`ModuleAccessGuard` is global, no need to add per-controller).

**Files:** (modify only)

- [ ] **Step 1: Tag controllers — `work_execution`**

Apply `@ModuleKey('work_execution')` to:
- `server/src/modules/todo/todo.controller.ts`
- `server/src/modules/task/task.controller.ts`
- `server/src/modules/unified-approval/approval-task.controller.ts`
- `server/src/modules/unified-approval/approval-instance.controller.ts`

Pattern:
```ts
import { ModuleKey } from '../../shared/decorators/module-key.decorator';

@UseGuards(JwtAuthGuard)
@ModuleKey('work_execution')
@Controller('todos')
export class TodoController { /* … */ }
```

- [ ] **Step 2: Tag controllers — `document_approval`**

- `documents.controller.ts` → `@ModuleKey('document_approval')`
- `approval-definition.controller.ts` likewise.
- **RETIRED (2026-05-24):** `templates.controller.ts`, `dynamic-forms.controller.ts`, `record-template.controller.ts`, `records.controller.ts` — 已在 dynamic-form-retirement 中删除，不需要打标签。

- [ ] **Step 3: Tag — `production_execution`**

- `batch-trace/production-batch.controller.ts`
- `production-run.controller.ts`
- `mixing.controller.ts`
- `batch-mixing-aggregation.controller.ts`
- `process/instance.controller.ts` (path `process/instances`)
- `process/template.controller.ts` (path `process/templates`)
- `process-step.controller.ts`
- `process-record.controller.ts`
- `shift-instance.controller.ts`, `team-shift.controller.ts`, `line-change-check.controller.ts`

- [ ] **Step 4: Tag — `product_rd`**

- `product.controller.ts`, `recipe.controller.ts`, `change-event.controller.ts`, `change-verification-record.controller.ts`, `change-compliance-record.controller.ts`
- **RETIRED (2026-05-24):** `model-landing.controller.ts` — 已在 dynamic-form-retirement 中删除，不需要打标签。

- [ ] **Step 5: Tag — `quality_compliance`**

Apply `@ModuleKey('quality_compliance')` to each controller below (22 in total — list mirrors `REGISTRY_CONFIG.modules.quality_compliance`):

| controller path | 文件 |
|---|---|
| `non-conformances` | `server/src/modules/non-conformance/non-conformance.controller.ts` |
| `corrective-actions` | `server/src/modules/corrective-action/corrective-action.controller.ts` |
| `product-recalls` | `server/src/modules/product-recall/product-recall.controller.ts` |
| `customer-complaints` | `server/src/modules/customer-complaint/customer-complaint.controller.ts` |
| `deviation-reports` | `server/src/modules/deviation/deviation-report.controller.ts` |
| `deviation-analytics` | `server/src/modules/deviation/deviation-analytics.controller.ts` |
| `rework-records` | `server/src/modules/rework-record/rework-record.controller.ts` |
| `food-safety-culture-records` | `server/src/modules/food-safety-culture-record/food-safety-culture-record.controller.ts` |
| `emergency-drills` | `server/src/modules/emergency-drill/emergency-drill.controller.ts` |
| `supplier-evaluations` | `server/src/modules/supplier-evaluation/supplier-evaluation.controller.ts` |
| `incoming-inspections` | `server/src/modules/incoming-inspection/incoming-inspection.controller.ts` |
| `metal-detections` | `server/src/modules/metal-detection/metal-detection.controller.ts` |
| `fragile-item-inspections` | `server/src/modules/fragile-item-inspection/fragile-item-inspection.controller.ts` |
| `measuring-equipment` | `server/src/modules/measuring-equipment/measuring-equipment.controller.ts` |
| `environment-records` | `server/src/modules/environment-record/environment-record.controller.ts` |
| `medication-records` | `server/src/modules/medication-record/medication-record.controller.ts` |
| `cleaning-records` | `server/src/modules/cleaning-record/cleaning-record.controller.ts` |
| `ccp` | `server/src/modules/ccp/ccp.controller.ts` |
| `waste` | `server/src/modules/<waste-module-path>.controller.ts` |
| `violation-records` | `server/src/modules/<violation-records-module-path>.controller.ts` |
| `visitor-records` | `server/src/modules/<visitor-records-module-path>.controller.ts` |
| `workshop-areas` | `server/src/modules/<workshop-areas-module-path>.controller.ts` |

Last 4 rows mark the controller file path as `<...>` because the exact module directory name varies — use `rg "@Controller\('waste'\)" server/src --type ts` (and similar for the other three) to locate the file, then apply the decorator. If `rg` returns zero hits, the controller doesn't exist in the project — drop the corresponding entry from `REGISTRY_CONFIG.modules.quality_compliance` to keep the Task 11 coverage test green.

- [ ] **Step 6: Tag — `equipment_site`**

- `server/src/modules/equipment/equipment.controller.ts` → `@ModuleKey('equipment_site')`
- `server/src/modules/equipment/equipment-fault.controller.ts`
- `server/src/modules/equipment/equipment-stats.controller.ts`
- `server/src/modules/maintenance-plan/maintenance-plan.controller.ts`
- `server/src/modules/maintenance-record/maintenance-record.controller.ts`

- [ ] **Step 7: Tag — `traceability_batch`**

Apply `@ModuleKey('traceability_batch')`:

| controller path | 文件（按现有目录命名约定） |
|---|---|
| `traceability` | `server/src/modules/traceability/traceability.controller.ts` |
| `batch-trace` | `server/src/modules/batch-trace/batch-trace.controller.ts` |
| `batch-trace/trace` | `server/src/modules/batch-trace/trace.controller.ts` |
| `batch-trace/material-batches` | `server/src/modules/batch-trace/material-batch.controller.ts` |
| `batch-trace/material-usage` | `server/src/modules/batch-trace/material-usage.controller.ts` |
| `warehouse/material-balance` | `server/src/modules/warehouse/material-balance.controller.ts` |
| `warehouse/traceability` | `server/src/modules/warehouse/traceability.controller.ts` |
| `packaging-material-usages` | `server/src/modules/packaging-material-usage/packaging-material-usage.controller.ts` |

- [ ] **Step 8: Tag — `warehouse`**

Apply `@ModuleKey('warehouse')`:

| controller path | 文件 |
|---|---|
| `warehouse/batches` | `server/src/modules/warehouse/batches.controller.ts` |
| `warehouse/materials` | `server/src/modules/warehouse/materials.controller.ts` |
| `warehouse/inbound` | `server/src/modules/warehouse/inbound.controller.ts` |
| `warehouse/requisitions` | `server/src/modules/warehouse/requisitions.controller.ts` |
| `warehouse/staging-area` | `server/src/modules/warehouse/staging-area.controller.ts` |
| `warehouse/suppliers` | `server/src/modules/warehouse/supplier.controller.ts` |
| `scraps` | `server/src/modules/warehouse/services/scrap.controller.ts` |
| `returns` | `server/src/modules/warehouse/services/return.controller.ts` |
| `external-parties` | `server/src/modules/external-party/external-party.controller.ts` |

- [ ] **Step 9: Tag — `training`**

Apply `@ModuleKey('training')`:

| controller path | 文件 |
|---|---|
| `training` | `server/src/modules/training/training.controller.ts` |
| `training/records` | `server/src/modules/training/records.controller.ts` |
| `training/archive` | `server/src/modules/training/archive.controller.ts` |
| `training/exam` | `server/src/modules/training/exam.controller.ts` |
| `training/questions` | `server/src/modules/training/questions.controller.ts` |

> Note: Steps 6-9 controller file paths follow the project's existing conventions but a few are best-effort guesses for less-standard layouts — confirm with `rg "@Controller\('<path>'\)" server/src --type ts` before editing if Task 11 Step 11 coverage test fails.

- [ ] **Step 10: Add unit verification**

Create `server/src/modules/module-access/coverage.spec.ts`:

```ts
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ModuleRouteRegistry } from './module-route-registry';
import { REGISTRY_CONFIG } from './registry-config';

it('every controller path is covered by REGISTRY_CONFIG', async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication();
  await app.init();
  const container = (app as any).container;
  const paths: string[] = [];
  container.getModules().forEach((m: any) =>
    m.controllers.forEach((wrapper: any) => {
      const p = Reflect.getMetadata('path', wrapper.metatype);
      if (typeof p === 'string') paths.push(p);
    }),
  );
  const registry = new ModuleRouteRegistry(REGISTRY_CONFIG);
  expect(() => registry.validate(paths, { strict: true })).not.toThrow();
  await app.close();
});
```

- [ ] **Step 11: Run coverage test**

`npm run test -w server -- module-access/coverage` → must PASS. If unmapped controllers exist, either add `@ModuleKey()` or extend `REGISTRY_CONFIG` (only for legitimately new business controllers, not workarounds).

- [ ] **Step 12: Commit per cluster**

After each cluster passes the coverage test:

```bash
git add server/src/modules/<cluster>/
git commit -m "chore(module-access): tag <cluster> controllers with @ModuleKey"
```

---

## Task 12: ApprovalDefinition DTO contract

Forbid `permission` assignments and unknown roleCodes at the DTO layer.

**Files:**
- Modify: `server/src/modules/unified-approval/approval-definition.controller.ts`
- Create: `server/src/modules/unified-approval/dto/approval-definition.dto.ts`
- Create: `server/src/modules/unified-approval/dto/approval-definition.dto.spec.ts`

- [ ] **Step 1: Write DTO tests**

```ts
// server/src/modules/unified-approval/dto/approval-definition.dto.spec.ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApprovalDefinitionDto } from './approval-definition.dto';

async function errs(payload: any) {
  const dto = plainToInstance(CreateApprovalDefinitionDto, payload);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('CreateApprovalDefinitionDto', () => {
  const valid = {
    module: 'document', resourceType: 'document', triggerKey: 'k', name: 'x', version: 1,
    steps: [{
      stepKey: 's1', stepName: 'n', mode: 'single',
      assignments: [{ type: 'ROLE', roleCode: 'leader' }],
    }],
  };

  it('accepts USER / ROLE / DEPARTMENT_ROLE assignments', async () => {
    expect((await errs(valid)).length).toBe(0);
  });

  it('rejects permission-typed assignments', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'permission', permissionCode: 'x' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects unknown roleCode', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'ROLE', roleCode: 'quality_manager' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects user without userId', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'USER' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects department-role without departmentId', async () => {
    const e = await errs({
      ...valid,
      steps: [{ ...valid.steps[0], assignments: [{ type: 'DEPARTMENT_ROLE', roleCode: 'leader' }] }],
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('rejects disabled_legacy from user input', async () => {
    const e = await errs({ ...valid, status: 'disabled_legacy' });
    expect(e.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Implement DTOs**

```ts
// server/src/modules/unified-approval/dto/approval-definition.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Min, ValidateIf, ValidateNested,
} from 'class-validator';

const ALLOWED_ASSIGNMENT_TYPES = ['USER', 'ROLE', 'DEPARTMENT_ROLE'] as const;
const ALLOWED_ROLE_CODES = ['admin', 'leader', 'user'] as const;

export class AssignmentDto {
  @IsIn(ALLOWED_ASSIGNMENT_TYPES as readonly string[])
  type!: 'USER' | 'ROLE' | 'DEPARTMENT_ROLE';

  @ValidateIf((o) => o.type === 'USER')
  @IsString() @IsNotEmpty()
  userId?: string;

  @ValidateIf((o) => o.type === 'ROLE' || o.type === 'DEPARTMENT_ROLE')
  @IsIn(ALLOWED_ROLE_CODES as readonly string[])
  roleCode?: 'admin' | 'leader' | 'user';

  @ValidateIf((o) => o.type === 'DEPARTMENT_ROLE')
  @IsString() @IsNotEmpty()
  departmentId?: string;

  @IsOptional() @IsString()
  label?: string;
}

export class StepDto {
  @IsString() @IsNotEmpty()
  stepKey!: string;

  @IsString() @IsNotEmpty()
  stepName!: string;

  @IsString() @IsNotEmpty()
  mode!: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentDto)
  assignments!: AssignmentDto[];

  @IsOptional() @IsString()
  rejectPolicy?: string;

  @IsOptional() @IsString()
  onApproved?: string;
}

export class CreateApprovalDefinitionDto {
  @IsString() module!: string;
  @IsString() resourceType!: string;
  @IsString() triggerKey!: string;
  @IsString() name!: string;
  @IsInt() @Min(1) version!: number;

  // 用户写入只允许 active|inactive；disabled_legacy 由系统内部置位
  @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;

  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps!: StepDto[];
}

export class UpdateApprovalDefinitionDto {
  @IsOptional() @IsString() name?: string;

  @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional() @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps?: StepDto[];
}
```

Replace existing inline DTOs in `approval-definition.controller.ts`:

```ts
import { CreateApprovalDefinitionDto, UpdateApprovalDefinitionDto } from './dto/approval-definition.dto';
// delete the previous inline classes
```

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/unified-approval/dto/ \
        server/src/modules/unified-approval/approval-definition.controller.ts
git commit -m "feat(approval): strict DTO contract — USER/ROLE/DEPARTMENT_ROLE only, three role codes"
```

---

## Task 13: ApprovalDefinition status contract (`disabled_legacy`)

Activate must re-validate steps; deactivate refuses to overwrite `disabled_legacy`.

**Files:**
- Modify: `server/src/modules/unified-approval/approval-definition.controller.ts`
- Modify: `server/src/modules/unified-approval/approval-definition.controller.spec.ts` (create if missing)

- [ ] **Step 1: Write tests**

```ts
// server/src/modules/unified-approval/approval-definition.controller.spec.ts (replace if exists)
import { Test } from '@nestjs/testing';
import { ApprovalDefinitionController } from './approval-definition.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('ApprovalDefinitionController status flow', () => {
  let controller: ApprovalDefinitionController;
  let prisma: any;
  const adminReq = { user: { roleCode: 'admin' } } as any;

  beforeEach(async () => {
    prisma = {
      approvalDefinition: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const mod = await Test.createTestingModule({
      controllers: [ApprovalDefinitionController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = mod.get(ApprovalDefinitionController);
  });

  it('activate rejects when current steps are invalid', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({
      id: 'd1', status: 'disabled_legacy',
      steps: [{ assignments: [{ type: 'permission', permissionCode: 'x' }] }],
    });
    await expect(controller.activate('d1', adminReq)).rejects.toThrow(/失效|invalid/i);
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalled();
  });

  it('activate succeeds when current steps are valid', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({
      id: 'd1', status: 'disabled_legacy',
      steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
                 assignments: [{ type: 'ROLE', roleCode: 'leader' }] }],
    });
    prisma.approvalDefinition.update.mockResolvedValue({ id: 'd1', status: 'active' });
    await controller.activate('d1', adminReq);
    expect(prisma.approvalDefinition.update).toHaveBeenCalledWith({
      where: { id: 'd1' }, data: { status: 'active' },
    });
  });

  it('deactivate refuses to overwrite disabled_legacy', async () => {
    prisma.approvalDefinition.findUnique.mockResolvedValue({ id: 'd1', status: 'disabled_legacy' });
    await expect(controller.deactivate('d1', adminReq)).rejects.toThrow(/disabled_legacy/);
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests (expect fail)**

- [ ] **Step 3: Implement status flow**

Replace `activate` and `deactivate` methods in `approval-definition.controller.ts` and add a step validator helper:

```ts
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StepDto } from './dto/approval-definition.dto';

// helper inside the class:
private async assertStepsValid(def: { steps: unknown }) {
  const steps = (def.steps as any[]) ?? [];
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new BadRequestException('审批模板缺少步骤');
  }
  for (const raw of steps) {
    const instance = plainToInstance(StepDto, raw);
    try {
      await validateOrReject(instance, { whitelist: true, forbidNonWhitelisted: true });
    } catch (err) {
      throw new BadRequestException({ code: 'APPROVAL_DEFINITION_INVALID', detail: err });
    }
  }
}

@Post(':id/activate')
async activate(@Param('id') id: string, @Request() req: any) {
  assertAdmin(req);
  const current = await this.prisma.approvalDefinition.findUnique({ where: { id } });
  if (!current) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
  await this.assertStepsValid(current);
  return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'active' } });
}

@Post(':id/deactivate')
async deactivate(@Param('id') id: string, @Request() req: any) {
  assertAdmin(req);
  const current = await this.prisma.approvalDefinition.findUnique({ where: { id } });
  if (!current) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
  if (current.status === 'disabled_legacy') {
    throw new BadRequestException(
      '该模板处于 disabled_legacy 状态，必须先修改 steps 后再 activate，禁止直接 deactivate。',
    );
  }
  return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'inactive' } });
}
```

Don't forget to import `BadRequestException`.

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/unified-approval/approval-definition.controller.ts \
        server/src/modules/unified-approval/approval-definition.controller.spec.ts
git commit -m "feat(approval): status contract with disabled_legacy + activate re-validate"
```

---

## Task 14: ApprovalDefinition startup scan

On boot, scan all `status='active'` definitions and demote violators to `disabled_legacy`.

**Files:**
- Modify: `server/src/modules/unified-approval/unified-approval.module.ts`
- Create: `server/src/modules/unified-approval/approval-definition.startup-scan.ts`
- Create: `server/src/modules/unified-approval/approval-definition.startup-scan.spec.ts`

- [ ] **Step 1: Write test**

```ts
// server/src/modules/unified-approval/approval-definition.startup-scan.spec.ts
import { ApprovalDefinitionStartupScan } from './approval-definition.startup-scan';

describe('ApprovalDefinitionStartupScan', () => {
  it('demotes definitions with illegal assignments to disabled_legacy', async () => {
    const prisma = {
      approvalDefinition: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'good', status: 'active', steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
            assignments: [{ type: 'ROLE', roleCode: 'leader' }] }] },
          { id: 'bad', status: 'active', steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
            assignments: [{ type: 'permission', permissionCode: 'x' }] }] },
        ]),
        update: jest.fn(),
      },
    } as any;
    const logger = { log: jest.fn(), warn: jest.fn() } as any;
    const scan = new ApprovalDefinitionStartupScan(prisma, logger);
    await scan.run();
    expect(prisma.approvalDefinition.update).toHaveBeenCalledWith({
      where: { id: 'bad' }, data: { status: 'disabled_legacy' },
    });
    expect(prisma.approvalDefinition.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'good' } }));
  });

  it('does not abort startup when scan errors', async () => {
    const prisma = {
      approvalDefinition: {
        findMany: jest.fn().mockRejectedValue(new Error('db down')),
        update: jest.fn(),
      },
    } as any;
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;
    const scan = new ApprovalDefinitionStartupScan(prisma, logger);
    await expect(scan.run()).resolves.not.toThrow();
    expect(logger.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Implement scanner**

```ts
// server/src/modules/unified-approval/approval-definition.startup-scan.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { StepDto } from './dto/approval-definition.dto';

@Injectable()
export class ApprovalDefinitionStartupScan implements OnModuleInit {
  private readonly logger: Logger;
  constructor(private readonly prisma: PrismaService, logger?: Logger) {
    this.logger = logger ?? new Logger(ApprovalDefinitionStartupScan.name);
  }

  async onModuleInit() {
    await this.run();
  }

  async run(): Promise<void> {
    try {
      const rows = await this.prisma.approvalDefinition.findMany({ where: { status: 'active' } });
      const failed: string[] = [];
      for (const row of rows) {
        const ok = await this.stepsValid((row as any).steps);
        if (!ok) {
          await this.prisma.approvalDefinition.update({
            where: { id: row.id }, data: { status: 'disabled_legacy' },
          });
          failed.push(row.id);
        }
      }
      if (failed.length > 0) {
        this.logger.warn(`Demoted ${failed.length} ApprovalDefinitions to disabled_legacy: ${failed.join(', ')}`);
      } else {
        this.logger.log('All active ApprovalDefinitions pass new contract.');
      }
    } catch (err) {
      this.logger.error('ApprovalDefinitionStartupScan failed', err as any);
    }
  }

  private async stepsValid(steps: unknown): Promise<boolean> {
    if (!Array.isArray(steps) || steps.length === 0) return false;
    for (const raw of steps) {
      try {
        await validateOrReject(plainToInstance(StepDto, raw), {
          whitelist: true, forbidNonWhitelisted: true,
        });
      } catch {
        return false;
      }
    }
    return true;
  }
}
```

Add to module providers:

```ts
// server/src/modules/unified-approval/unified-approval.module.ts
import { ApprovalDefinitionStartupScan } from './approval-definition.startup-scan';

@Module({
  // existing imports
  providers: [
    // existing providers
    ApprovalDefinitionStartupScan,
  ],
})
export class UnifiedApprovalModule {}
```

- [ ] **Step 4: Run tests (expect pass)**

- [ ] **Step 5: Manual integration test**

Seed an illegal definition into dev DB then start the server:

```sql
UPDATE approval_definitions
SET steps = '[{"stepKey":"s","stepName":"n","mode":"single","assignments":[{"type":"permission","permissionCode":"foo"}]}]'::jsonb
WHERE id = (SELECT id FROM approval_definitions LIMIT 1);
```

`npm run start:dev -w server` → log line `Demoted 1 ApprovalDefinitions to disabled_legacy: …`; status in DB is now `disabled_legacy`.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/unified-approval/approval-definition.startup-scan.ts \
        server/src/modules/unified-approval/approval-definition.startup-scan.spec.ts \
        server/src/modules/unified-approval/unified-approval.module.ts
git commit -m "feat(approval): boot-time scan, demote illegal definitions to disabled_legacy"
```

---

## Task 15: Rewrite ApprovalAssignmentResolver

Drop the `permission` branch; keep `user / role / department`.

**Files:**
- Modify: `server/src/modules/unified-approval/approval-assignment.resolver.ts`
- Modify: `server/src/modules/unified-approval/approval-assignment.resolver.spec.ts`
- Modify: `server/src/modules/unified-approval/types.ts`

- [ ] **Step 1: Update types**

```ts
// server/src/modules/unified-approval/types.ts (relevant section)
export type ApprovalAssignmentDefinition =
  | { type: 'USER'; userId: string; label?: string }
  | { type: 'ROLE'; roleCode: 'admin' | 'leader' | 'user'; label?: string }
  | { type: 'DEPARTMENT_ROLE'; departmentId: string; roleCode: 'admin' | 'leader' | 'user'; label?: string };

export interface ResolvedAssignment {
  assignment: ApprovalAssignmentDefinition;
  assigneeUserIds: string[];
  assigneeRoleCode?: string;
  assigneeDepartmentId?: string;
  claimMode: 'DIRECT' | 'CLAIMABLE';
}

// REMOVE: assigneePermissionCode from anywhere in this file.
```

- [ ] **Step 2: Rewrite resolver tests**

Replace the entire `approval-assignment.resolver.spec.ts` body:

```ts
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';

describe('ApprovalAssignmentResolver', () => {
  const prisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    department: { findUnique: jest.fn() },
  } as any;
  const resolver = new ApprovalAssignmentResolver(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('USER assignment returns DIRECT claim with single user', async () => {
    const r = await resolver.resolveAssignment({ type: 'USER', userId: 'u-1' });
    expect(r).toEqual({ assignment: { type: 'USER', userId: 'u-1' }, assigneeUserIds: ['u-1'], claimMode: 'DIRECT' });
  });

  it('ROLE assignment returns all active users with that role', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
    const r = await resolver.resolveAssignment({ type: 'ROLE', roleCode: 'leader' });
    expect(r.assigneeUserIds).toEqual(['u-1', 'u-2']);
    expect(r.assigneeRoleCode).toBe('leader');
    expect(r.claimMode).toBe('CLAIMABLE');
  });

  it('DEPARTMENT_ROLE filters by department + role', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-9' }]);
    const r = await resolver.resolveAssignment({ type: 'DEPARTMENT_ROLE', departmentId: 'd-1', roleCode: 'leader' });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'active', departmentId: 'd-1', roleObj: { code: 'leader' } },
      select: { id: true },
    });
    expect(r.assigneeUserIds).toEqual(['u-9']);
    expect(r.assigneeDepartmentId).toBe('d-1');
  });

  it('assertCanAct: admin always allowed', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'admin' }, departmentId: null });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: matches assigneeUserId', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'user' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: 'u-x', assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: matches assigneeRoleCode', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'leader' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: null, status: 'PENDING' },
    })).resolves.not.toThrow();
  });

  it('assertCanAct: DEPARTMENT_ROLE requires both department AND role match', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'leader' }, departmentId: 'd-1' });
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-1', status: 'PENDING' },
    })).resolves.not.toThrow();
    // wrong department
    await expect(resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: null, assigneeRoleCode: 'leader', assigneeDepartmentId: 'd-2', status: 'PENDING' },
    })).rejects.toThrow();
  });

  it('does not read userPermissions / permissionCode under any branch', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-x', roleObj: { code: 'user' }, departmentId: 'd-1' });
    await resolver.assertCanAct({
      userId: 'u-x',
      task: { assigneeUserId: 'u-x', assigneeRoleCode: null, assigneeDepartmentId: null, status: 'PENDING' },
    });
    const call = prisma.user.findUnique.mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain('userPermissions');
    expect(JSON.stringify(call)).not.toContain('fineGrainedPermission');
  });
});
```

- [ ] **Step 3: Run tests (expect fail / outdated)**

- [ ] **Step 4: Rewrite resolver**

```ts
// server/src/modules/unified-approval/approval-assignment.resolver.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalAssignmentDefinition, ResolvedAssignment } from './types';

interface CanActInput {
  userId: string;
  task: {
    assigneeUserId?: string | null;
    assigneeRoleCode?: string | null;
    assigneeDepartmentId?: string | null;
    status: string;
  };
}

@Injectable()
export class ApprovalAssignmentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAssignment(assignment: ApprovalAssignmentDefinition): Promise<ResolvedAssignment> {
    if (assignment.type === 'USER') {
      if (!assignment.userId) throw new NotFoundException('审批定义缺少 userId');
      return { assignment, assigneeUserIds: [assignment.userId], claimMode: 'DIRECT' };
    }

    if (assignment.type === 'ROLE') {
      if (!assignment.roleCode) throw new NotFoundException('审批定义缺少 roleCode');
      const users = await this.prisma.user.findMany({
        where: { status: 'active', roleObj: { code: assignment.roleCode } },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeRoleCode: assignment.roleCode,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'DEPARTMENT_ROLE') {
      if (!assignment.departmentId || !assignment.roleCode) {
        throw new NotFoundException('审批定义缺少 departmentId 或 roleCode');
      }
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          departmentId: assignment.departmentId,
          roleObj: { code: assignment.roleCode },
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeRoleCode: assignment.roleCode,
        assigneeDepartmentId: assignment.departmentId,
        claimMode: 'CLAIMABLE',
      };
    }

    throw new NotFoundException('不支持的审批分配类型');
  }

  async assertCanAct(input: CanActInput): Promise<void> {
    if (input.task.status !== 'PENDING') {
      throw new ForbiddenException('审批任务不是待处理状态');
    }
    const user = (await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: { roleObj: true },
    })) as any;
    if (!user) throw new ForbiddenException('用户不存在');
    const roleCode = user.roleObj?.code as string | undefined;
    if (!roleCode) throw new ForbiddenException('用户缺少正式角色');
    if (roleCode === 'admin') return;

    if (input.task.assigneeUserId && input.task.assigneeUserId === input.userId) return;
    if (input.task.assigneeRoleCode && input.task.assigneeRoleCode === roleCode) {
      if (input.task.assigneeDepartmentId) {
        if (input.task.assigneeDepartmentId === user.departmentId) return;
      } else return;
    }
    if (
      input.task.assigneeDepartmentId &&
      !input.task.assigneeRoleCode &&
      input.task.assigneeDepartmentId === user.departmentId
    ) return;

    throw new ForbiddenException('无权处理该审批任务');
  }
}
```

- [ ] **Step 5: Run tests (expect pass)**

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/unified-approval/approval-assignment.resolver.ts \
        server/src/modules/unified-approval/approval-assignment.resolver.spec.ts \
        server/src/modules/unified-approval/types.ts
git commit -m "refactor(approval): resolver supports only USER/ROLE/DEPARTMENT_ROLE"
```

---

## Task 16: ApprovalEngineService cleanup

Drop any reference to `assigneePermissionCode` in inputs and outputs.

**Files:**
- Modify: `server/src/modules/unified-approval/approval-engine.service.ts`
- Modify: `server/src/modules/unified-approval/approval-engine.service.spec.ts`

- [ ] **Step 1: grep & replace**

```bash
cd server/src/modules/unified-approval
rg -n "assigneePermissionCode|permissionCode" .
```

For every hit:
- In `approval-engine.service.ts`: delete the literal `assigneePermissionCode: resolved.assigneePermissionCode` lines and corresponding object spread.
- In `approval-engine.service.spec.ts`: delete `assigneePermissionCode: null` lines from fixtures.

- [ ] **Step 2: Run the full unified-approval test suite**

`npm run test -w server -- unified-approval` → all PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/unified-approval/
git commit -m "refactor(approval): drop assigneePermissionCode from engine"
```

---

## Task 17: Drop `ApprovalTask.assigneePermissionCode` column

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<ts>_drop_assignee_permission_code/migration.sql`

- [ ] **Step 1: Remove from schema**

In `schema.prisma`, model `ApprovalTask`:
- Delete the line `assigneePermissionCode String?`
- Delete the index `@@index([assigneePermissionCode, status])`

- [ ] **Step 2: Generate + apply migration**

```bash
npm run prisma:migrate -w server -- --name drop_assignee_permission_code
npm run prisma:generate -w server
```

The generated SQL should contain:

```sql
DROP INDEX IF EXISTS "approval_tasks_assigneePermissionCode_status_idx";
ALTER TABLE "approval_tasks" DROP COLUMN "assigneePermissionCode";
```

- [ ] **Step 3: Run all server tests**

`npm run test -w server` → must PASS.

- [ ] **Step 4: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/*drop_assignee_permission_code*
git commit -m "schema: drop ApprovalTask.assigneePermissionCode"
```

---

## Task 18: Delete UnifiedPermissionGuard + require-permission decorator

**Files:**
- Delete: `server/src/shared/guards/unified-permission.guard.ts`
- Delete: `server/src/shared/guards/unified-permission.guard.spec.ts`
- Delete: `server/src/shared/guards/unified-permission-module-di.spec.ts`
- Delete: `server/src/shared/decorators/require-permission.decorator.ts`

- [ ] **Step 1: Remove imports/uses**

```bash
rg -n "UnifiedPermissionGuard|require-permission|RequirePermission|REQUIRE_PERMISSION_KEY|REQUIRE_DEPARTMENT_ACCESS_KEY" server/src --type ts
```

For each hit, remove the import and the `@UseGuards(UnifiedPermissionGuard)` / `@RequirePermission(...)` line (see Task 19 for the controller-specific removals).

- [ ] **Step 2: Delete the files**

```bash
git rm server/src/shared/guards/unified-permission.guard.ts \
       server/src/shared/guards/unified-permission.guard.spec.ts \
       server/src/shared/guards/unified-permission-module-di.spec.ts \
       server/src/shared/decorators/require-permission.decorator.ts
```

- [ ] **Step 3: Re-run tests**

`npm run test -w server` → PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(perm): delete UnifiedPermissionGuard and require-permission decorator"
```

---

## Task 19: Strip `@RequirePermission` from document/audit/supplier controllers

**Files:**
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/audit/audit.controller.ts`
- Modify: `server/src/modules/warehouse/supplier.controller.ts`

- [ ] **Step 1: Edit document.controller.ts**

Remove all `@UseGuards(UnifiedPermissionGuard)` and `@RequirePermission('...')` annotations at handler level. Class-level guard remains `@UseGuards(JwtAuthGuard)` + `@ModuleKey('document_approval')` (from Task 11).

- [ ] **Step 2: Edit audit.controller.ts**

Similar: remove `@RequirePermission`. Add `@Roles('admin')` (this is system governance per spec whitelist) and ensure class has `@UseGuards(JwtAuthGuard, RolesGuard)`.

- [ ] **Step 3: Edit supplier.controller.ts**

Remove `@RequirePermission`. `@ModuleKey('warehouse')` already applied in Task 11.

- [ ] **Step 4: Re-run tests**

`npm run test -w server` → PASS. No remaining `@RequirePermission` usages: `rg -n "RequirePermission" server/src` returns nothing.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/document/document.controller.ts \
        server/src/modules/audit/audit.controller.ts \
        server/src/modules/warehouse/supplier.controller.ts
git commit -m "chore(perm): strip @RequirePermission from controllers"
```

---

## Task 20: Delete legacy permission modules

**Files:**
- Delete: `server/src/modules/permission/`
- Delete: `server/src/modules/fine-grained-permission/`
- Delete: `server/src/modules/user-permission/`
- Delete: `server/src/modules/department-permission/`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: Remove from app.module.ts**

Delete imports of `PermissionModule / FineGrainedPermissionModule / UserPermissionModule / DepartmentPermissionModule` and their entries in the `imports:` array.

- [ ] **Step 2: Find any cross-references**

```bash
rg -n "modules/permission|modules/fine-grained-permission|modules/user-permission|modules/department-permission" server/src --type ts
```

For every hit, remove the import. If the import was used to call a service method (e.g. `RoleService.getRolePermissions`), delete the call too — it's now meaningless.

- [ ] **Step 3: Remove the directories**

```bash
git rm -r server/src/modules/permission \
         server/src/modules/fine-grained-permission \
         server/src/modules/user-permission \
         server/src/modules/department-permission
```

- [ ] **Step 4: Run build**

```bash
npm run build -w server
```

Expected: PASS. If it fails, fix the remaining cross-references.

- [ ] **Step 5: Run server tests**

`npm run test -w server` → PASS.

- [ ] **Step 6: Commit**

```bash
git commit -m "chore(perm): delete Permission/FineGrained/UserPermission/DepartmentPermission modules"
```

---

## Task 21: PermissionLog write paths stop, controller becomes readonly

**Files:**
- Modify: `server/src/modules/audit/audit.controller.ts` (consolidate `/permission-audit-logs` here as readonly endpoint)
- Find and delete write callers via grep

- [ ] **Step 1: Find write callers**

```bash
rg -n "prisma\.permissionLog\.(create|update|delete|upsert)" server/src --type ts
```

For each hit, delete the call. PermissionLog is preserved only as a read-only audit table.

- [ ] **Step 2: Move/keep readonly read endpoint**

If `permission-audit-logs.controller.ts` exists in one of the deleted permission modules, recreate a thin readonly version under `audit`:

```ts
// server/src/modules/audit/permission-log-readonly.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('permission-audit-logs')
export class PermissionLogReadonlyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('limit') limit = '50') {
    return this.prisma.permissionLog.findMany({
      take: Math.min(Number(limit), 200),
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

Register it in `AuditModule.controllers`.

- [ ] **Step 3: Confirm no remaining writes**

```bash
rg -n "prisma\.permissionLog\.(create|update|delete|upsert)" server/src --type ts
```

Expected: zero hits.

- [ ] **Step 4: Run tests**

`npm run test -w server` → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/audit/
git commit -m "chore(perm): PermissionLog readonly, write paths removed"
```

---

## Task 22: Drop legacy permission tables

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<ts>_drop_legacy_permission_tables/migration.sql`

- [ ] **Step 1: Remove from schema**

Delete these models from `schema.prisma`:
- `Permission`
- `RolePermission`
- `FineGrainedPermission`
- `UserPermission`
- `RoleFineGrainedPermission`
- `DepartmentPermission`

Also delete relations on `User`, `Role`, `Department` pointing at them:
- `User.userPermissions`, `User.permissionsGranted`
- `Role.permissions`, `Role.fineGrainedPermissions`
- `Department.departmentPermissions`

Keep `User.permissionLogsAsOperator / permissionLogsAsTarget` (they point at PermissionLog which is preserved).

- [ ] **Step 2: Create migration**

```bash
npm run prisma:migrate -w server -- --name drop_legacy_permission_tables --create-only
```

Edit migration SQL to drop tables in dependency order:

```sql
-- Drop indexes first if any remain
-- Drop FK-bearing tables first
DROP TABLE IF EXISTS "user_permissions" CASCADE;
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "role_fine_grained_permissions" CASCADE;
DROP TABLE IF EXISTS "department_permissions" CASCADE;
DROP TABLE IF EXISTS "fine_grained_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
```

- [ ] **Step 3: Apply migration**

```bash
npm run prisma:migrate -w server
npm run prisma:generate -w server
```

Expected: 6 tables dropped. `\dt permissions*` 在 psql 中返回空。

- [ ] **Step 4: Run server tests + boot**

```bash
npm run test -w server
npm run start:dev -w server
```

Expected: PASS; server boots; bootstrap log shows `ApprovalDefinitionStartupScan` + `ModuleRouteRegistry` validation lines.

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/*drop_legacy_permission_tables*
git commit -m "schema: drop 6 legacy permission tables"
```

---

## Task 23: Rewrite seeds

**Files:**
- Modify: `server/src/prisma/seed.ts`
- Modify: `server/src/prisma/seed-baseline.ts`
- Modify: `server/src/prisma/seed-e2e.ts`
- Modify: `server/src/prisma/seed-org.ts`
- Modify: `server/src/prisma/seed-demo.ts`
- Modify: `server/src/prisma/seed-dev.ts`

- [ ] **Step 1: Remove all `permission*` fixtures**

For each seed file, delete blocks that insert into `permission*`, `userPermission`, `roleFineGrainedPermission`, `departmentPermission`. Also delete any `prisma.fineGrainedPermission.*` calls.

- [ ] **Step 2: Update process-approval-definition fixtures**

In `server/src/prisma/seed.ts`, the existing `processApprovalDefinitions` array uses role codes `gm`, `manager`, `quality`, `manufacture`, `food_safety_leader`. These all violate the new contract. Rewrite to use `USER` assignments pointing to seeded admin/leader users, OR `DEPARTMENT_ROLE` if the relevant departments exist:

```ts
const processApprovalDefinitions: StepDef[] = [
  { triggerKey: 'step:1', name: '新产品开发申请审批', stepName: '总经理审批', mode: 'single',
    assignments: [{ type: 'USER', userId: ADMIN_USER_ID, label: '总经理（待业务管理员重建）' }] },
  // …repeat for steps 2/5/6/7 with USER (placeholder) assignments.
];
```

Add a console warning at the bottom:
```ts
console.warn('⚠️ Approval definitions seeded with placeholder USER assignments; admins must rebuild via UI.');
```

- [ ] **Step 3: Update e2e seed**

`seed-e2e.ts` only defines USER assignments (already compliant). Verify by running the new DTO validator against the fixture:

```ts
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { StepDto } from '../modules/unified-approval/dto/approval-definition.dto';

await Promise.all(definitions.flatMap((d) => d.steps.map(async (s) => {
  await validateOrReject(plainToInstance(StepDto, s), { whitelist: true });
})));
```

- [ ] **Step 4: Add module-access seed step to every seed entrypoint**

In each of the 5 seed files, append the module-access section after roles are inserted (or import a shared helper to do it):

```ts
import { MODULE_KEYS, ROLE_CODES_WITH_TOGGLE } from '../modules/module-access/module-access.constants';
for (const moduleKey of MODULE_KEYS)
  for (const roleCode of ROLE_CODES_WITH_TOGGLE)
    await prisma.moduleAccessConfig.upsert({
      where: { moduleKey_roleCode: { moduleKey, roleCode } },
      update: {},
      create: { moduleKey, roleCode, enabled: true },
    });
```

- [ ] **Step 5: Run each seed against a fresh DB**

```bash
npm run prisma:reset -w server
npm run prisma:seed -w server
```

Repeat with `seed-baseline.ts`, `seed-e2e.ts`, `seed-org.ts`, `seed-demo.ts`, `seed-dev.ts` (whichever your project supports as alternative entrypoints).

Expected: no errors; `module_access_configs` has 18 rows in each; approval_definitions has only USER-type assignments.

- [ ] **Step 6: Commit**

```bash
git add server/src/prisma/seed*.ts
git commit -m "chore(seed): rewrite seeds to remove permission fixtures, add module-access defaults"
```

---

## Task 24: Frontend module-access store + API client

**Files:**
- Create: `client/src/api/module-access.ts`
- Create: `client/src/stores/moduleAccess.ts`
- Create: `client/src/stores/__tests__/moduleAccess.spec.ts`

- [ ] **Step 1: Create API client**

```ts
// client/src/api/module-access.ts
import request from './request';

export interface ModuleAccessMe {
  roleCode: 'admin' | 'leader' | 'user';
  enabledModules: string[];
}

export interface MatrixRow {
  moduleKey: string;
  moduleLabel: string;
  leader: boolean;
  user: boolean;
}

export interface MatrixResponse { modules: MatrixRow[]; }

export const moduleAccessApi = {
  me: () => request.get<ModuleAccessMe>('/module-access'),
  listMatrix: () => request.get<MatrixResponse>('/admin/module-access'),
  saveMatrix: (modules: Array<Pick<MatrixRow, 'moduleKey' | 'leader' | 'user'>>) =>
    request.put<MatrixResponse>('/admin/module-access', { modules }),
};
```

- [ ] **Step 2: Write store tests**

```ts
// client/src/stores/__tests__/moduleAccess.spec.ts
import { setActivePinia, createPinia } from 'pinia';
import { useModuleAccessStore } from '../moduleAccess';

vi.mock('@/api/module-access', () => ({
  moduleAccessApi: { me: vi.fn().mockResolvedValue({ roleCode: 'user', enabledModules: ['warehouse'] }) },
}));

describe('moduleAccessStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('refresh() loads enabledModules', async () => {
    const store = useModuleAccessStore();
    await store.refresh();
    expect(store.enabledModules).toEqual(['warehouse']);
  });

  it('hasModule(key) returns true for admin regardless of array', () => {
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'admin', enabledModules: [] });
    expect(store.hasModule('warehouse')).toBe(true);
  });

  it('hasModule(key) honors enabledModules for non-admin', () => {
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'user', enabledModules: ['warehouse'] });
    expect(store.hasModule('warehouse')).toBe(true);
    expect(store.hasModule('training')).toBe(false);
  });
});
```

- [ ] **Step 3: Implement store**

```ts
// client/src/stores/moduleAccess.ts
import { defineStore } from 'pinia';
import { moduleAccessApi } from '@/api/module-access';

interface State {
  roleCode: 'admin' | 'leader' | 'user' | '';
  enabledModules: string[];
  loaded: boolean;
}

export const useModuleAccessStore = defineStore('moduleAccess', {
  state: (): State => ({ roleCode: '', enabledModules: [], loaded: false }),
  getters: {
    hasModule: (s) => (key: string) => s.roleCode === 'admin' || s.enabledModules.includes(key),
  },
  actions: {
    async refresh() {
      const me = await moduleAccessApi.me();
      this.roleCode = me.roleCode;
      this.enabledModules = me.enabledModules;
      this.loaded = true;
    },
    reset() {
      this.roleCode = '';
      this.enabledModules = [];
      this.loaded = false;
    },
  },
});
```

- [ ] **Step 4: Run tests**

`npm run test -w client -- moduleAccess` → PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/api/module-access.ts \
        client/src/stores/moduleAccess.ts \
        client/src/stores/__tests__/moduleAccess.spec.ts
git commit -m "feat(client): moduleAccess store + API client"
```

---

## Task 25: axios interceptor for `MODULE_DISABLED`

**Files:**
- Modify: `client/src/api/request.ts`
- Modify: `client/src/router/index.ts` (only the bit we need now — add `/no-access` route placeholder)

- [ ] **Step 1: Find the response interceptor**

```bash
grep -n "interceptors.response" client/src/api/request.ts
```

- [ ] **Step 2: Add MODULE_DISABLED handling**

In the response error interceptor, before generic error handling:

```ts
import router from '@/router';

// inside response error interceptor:
if (error.response?.status === 403) {
  const body = error.response.data;
  const code = body?.code ?? body?.data?.code;
  const module = body?.module ?? body?.data?.module;
  if (code === 'MODULE_DISABLED' && module) {
    router.push({ path: '/no-access', query: { module } });
    return Promise.reject(error);
  }
}
```

- [ ] **Step 3: Add `/no-access` placeholder route**

In `client/src/router/index.ts`:

```ts
{
  path: '/no-access',
  name: 'NoAccess',
  component: () => import('@/views/no-access/NoAccess.vue'),
  meta: { public: true },
},
```

- [ ] **Step 4: Smoke test**

Trigger a 403 with `code=MODULE_DISABLED` (e.g. close `warehouse` for `user`, then visit `/warehouse/materials` as a `user`). Expected: router navigates to `/no-access?module=warehouse`.

- [ ] **Step 5: Commit**

```bash
git add client/src/api/request.ts client/src/router/index.ts
git commit -m "feat(client): axios interceptor for MODULE_DISABLED -> /no-access"
```

---

## Task 26: Menu filter by enabledModules

**Files:**
- Modify: `client/src/navigation/menu.ts`
- Modify: `client/src/components/layout/Sidebar.vue` (or wherever menuGroups is consumed)

- [ ] **Step 1: Tag every menu group with a module key**

Edit `client/src/navigation/menu.ts`:

```ts
export interface MenuEntry { /* unchanged */ }
export interface MenuGroup extends MenuEntry { moduleKey?: string; adminOnly?: boolean; }

export const menuGroups: MenuGroup[] = [
  { title: '工作执行', moduleKey: 'work_execution', icon: HomeFilled, children: [/* … */] },
  { title: '文控与审批', moduleKey: 'document_approval', icon: Files, children: [/* … */] },
  { title: '生产执行', moduleKey: 'production_execution', icon: List, children: [/* … */] },
  { title: '产品研发', moduleKey: 'product_rd', icon: Grid, children: [/* … */] },
  { title: '质量与合规', moduleKey: 'quality_compliance', icon: CircleCheck, children: [/* … */] },
  { title: '设备与现场', moduleKey: 'equipment_site', icon: SetUp, children: [/* … */] },
  { title: '追溯与批次', moduleKey: 'traceability_batch', icon: Box, children: [/* … */] },
  { title: '仓库管理', moduleKey: 'warehouse', icon: Goods, children: [/* … */] },
  { title: '培训', moduleKey: 'training', icon: UserFilled, children: [/* … */] },
  {
    title: '系统治理', adminOnly: true, icon: Setting,
    children: [
      { path: '/users', title: '用户管理', icon: UserFilled },
      { path: '/departments', title: '部门管理', icon: Connection },
      { path: '/roles', title: '角色管理', icon: Key },
      { path: '/module-access/manage', title: '模块开关', icon: Setting },
      { path: '/notifications', title: '消息中心', icon: Message },
      { path: '/search', title: '高级搜索', icon: Search },
      { path: '/audit-logs', title: '审计日志', icon: Odometer },
    ],
  },
];
```

Note: legacy items (`/permissions`, `/admin/user-permissions`, `/admin/permissions`) are gone.

- [ ] **Step 2: Filter at runtime**

In the sidebar component (find via `grep "menuGroups" client/src -r`), filter:

```ts
import { useModuleAccessStore } from '@/stores/moduleAccess';

const moduleAccess = useModuleAccessStore();
onMounted(async () => { if (!moduleAccess.loaded) await moduleAccess.refresh(); });

const visibleGroups = computed(() =>
  menuGroups.filter((g) => {
    if (g.adminOnly) return moduleAccess.roleCode === 'admin';
    if (g.moduleKey) return moduleAccess.hasModule(g.moduleKey);
    return true; // ungrouped — shouldn't happen
  }),
);
```

Then render `visibleGroups` instead of `menuGroups`.

- [ ] **Step 3: Smoke test in browser**

- Log in as admin → sees all 10 groups.
- Log in as `user` (default seed) → sees 9 business groups, no `系统治理`.
- Admin turns off `warehouse` for `user`, save, user logs out + back in (or hits `moduleAccess.refresh()`) → `仓库管理` 消失。

- [ ] **Step 4: Commit**

```bash
git add client/src/navigation/menu.ts client/src/components/layout/
git commit -m "feat(client): filter sidebar by enabledModules + admin role"
```

---

## Task 27: Router meta `requireRole='admin'` + remove old permission routes

**Files:**
- Modify: `client/src/router/index.ts`

- [ ] **Step 1: Remove all routes pointing at deleted permission pages**

Delete routes whose `component` resolves to anything under `views/permission/*`, including:
- `/permissions`
- `/admin/permissions`
- `/admin/user-permissions`
- routes for `FineGrainedPermission.vue`, `DepartmentPermission.vue`, `PermissionAuditLog.vue`, `PermissionList.vue`, `PermissionDefinitions.vue`, `UserPermissions.vue`, `UserPermissionsManager.vue`.

- [ ] **Step 2: Mark admin-only routes**

Add `meta: { requireRole: 'admin' }` to:
- `/users`
- `/departments`
- `/roles`
- `/module-access/manage` (added in Task 29)
- `/audit-logs`
- any `/admin/*` legacy route that remains

- [ ] **Step 3: Add global router guard**

Inside the existing `beforeEach` in `router/index.ts`:

```ts
import { useUserStore } from '@/stores/user';

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta?.public) return next();
  if (!userStore.isLoggedIn) return next({ path: '/login' });
  if (to.meta?.requireRole === 'admin' && userStore.user?.roleCode !== 'admin') {
    return next({ path: '/no-access' });
  }
  return next();
});
```

- [ ] **Step 4: Smoke test**

- As `leader`, navigate to `/users` → redirect to `/no-access`.
- As `admin`, navigate to `/users` → loads.

- [ ] **Step 5: Commit**

```bash
git add client/src/router/index.ts
git commit -m "feat(client): admin route guard + remove legacy permission routes"
```

---

## Task 28: `/no-access` page

**Files:**
- Create: `client/src/views/no-access/NoAccess.vue`
- Create: `client/src/views/no-access/__tests__/NoAccess.spec.ts`

- [ ] **Step 1: Write test**

```ts
// client/src/views/no-access/__tests__/NoAccess.spec.ts
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NoAccess from '../NoAccess.vue';
import { useModuleAccessStore } from '@/stores/moduleAccess';

describe('NoAccess', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('shows generic copy when no module param', () => {
    const w = mount(NoAccess, { global: { mocks: { $route: { query: {} } } } });
    expect(w.text()).toContain('当前角色无权访问');
  });

  it('shows module-specific copy when module query present', () => {
    const w = mount(NoAccess, { global: { mocks: { $route: { query: { module: 'warehouse' } } } } });
    expect(w.text()).toContain('仓库管理');
  });

  it('"返回工作台" button uses first enabledModule', async () => {
    const store = useModuleAccessStore();
    store.$patch({ roleCode: 'user', enabledModules: ['training'] });
    const push = vi.fn();
    const w = mount(NoAccess, {
      global: { mocks: { $route: { query: { module: 'warehouse' } }, $router: { push } } },
    });
    await w.find('[data-test="back-home"]').trigger('click');
    expect(push).toHaveBeenCalledWith(expect.objectContaining({ path: expect.any(String) }));
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Implement page**

```vue
<!-- client/src/views/no-access/NoAccess.vue -->
<template>
  <div class="no-access">
    <h2>{{ titleText }}</h2>
    <p>{{ messageText }}</p>
    <el-button data-test="back-home" type="primary" @click="goHome">返回工作台</el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModuleAccessStore } from '@/stores/moduleAccess';

const MODULE_LABELS: Record<string, string> = {
  work_execution: '工作执行', document_approval: '文控与审批', production_execution: '生产执行',
  product_rd: '产品研发', quality_compliance: '质量与合规', equipment_site: '设备与现场',
  traceability_batch: '追溯与批次', warehouse: '仓库管理', training: '培训',
};

const route = useRoute();
const router = useRouter();
const moduleAccess = useModuleAccessStore();

const moduleKey = computed(() => route.query.module as string | undefined);
const titleText = computed(() => moduleKey.value
  ? `「${MODULE_LABELS[moduleKey.value] ?? moduleKey.value}」模块对当前角色未开启`
  : '当前角色无权访问该页面');
const messageText = computed(() => '请联系管理员调整角色或模块开关。');

function goHome() {
  const first = moduleAccess.enabledModules[0];
  const path = first === 'work_execution' || !first ? '/dashboard' : moduleHomePath(first);
  router.push({ path });
}

function moduleHomePath(key: string): string {
  switch (key) {
    case 'work_execution': return '/dashboard';
    case 'document_approval': return '/documents';
    case 'production_execution': return '/records';
    case 'product_rd': return '/products';
    case 'quality_compliance': return '/non-conformances';
    case 'equipment_site': return '/equipment';
    case 'traceability_batch': return '/batch-trace';
    case 'warehouse': return '/warehouse/materials';
    case 'training': return '/training/projects';
    default: return '/dashboard';
  }
}
</script>
```

- [ ] **Step 4: Run tests**

`npm run test -w client -- NoAccess` → PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/views/no-access/
git commit -m "feat(client): /no-access page with module-aware copy"
```

---

## Task 29: ModuleAccessManage page

**Files:**
- Create: `client/src/views/module-access/ModuleAccessManage.vue`
- Create: `client/src/views/module-access/__tests__/ModuleAccessManage.spec.ts`
- Modify: `client/src/router/index.ts` (add the route)

- [ ] **Step 1: Add route**

```ts
{
  path: '/module-access/manage',
  name: 'ModuleAccessManage',
  component: () => import('@/views/module-access/ModuleAccessManage.vue'),
  meta: { requireRole: 'admin' },
},
```

- [ ] **Step 2: Implement page**

```vue
<!-- client/src/views/module-access/ModuleAccessManage.vue -->
<template>
  <div class="module-access-manage">
    <h2>模块开关</h2>
    <p class="hint">勾选表示对应角色可以看到该模块。管理员永远可见，不在表中。</p>
    <el-table :data="rows" border>
      <el-table-column prop="moduleLabel" label="模块" min-width="160" />
      <el-table-column label="主管 (leader)" width="160">
        <template #default="{ row }">
          <el-switch v-model="row.leader" />
        </template>
      </el-table-column>
      <el-table-column label="员工 (user)" width="160">
        <template #default="{ row }">
          <el-switch v-model="row.user" />
        </template>
      </el-table-column>
    </el-table>
    <el-button type="primary" @click="save" :loading="saving">保存</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { moduleAccessApi, type MatrixRow } from '@/api/module-access';
import { useModuleAccessStore } from '@/stores/moduleAccess';

const rows = ref<MatrixRow[]>([]);
const saving = ref(false);
const moduleAccess = useModuleAccessStore();

onMounted(async () => {
  const r = await moduleAccessApi.listMatrix();
  rows.value = r.modules;
});

async function save() {
  saving.value = true;
  try {
    await moduleAccessApi.saveMatrix(rows.value.map((r) => ({
      moduleKey: r.moduleKey, leader: r.leader, user: r.user,
    })));
    ElMessage.success('保存成功');
    await moduleAccess.refresh();
  } catch (e) {
    ElMessage.error('保存失败，请重试');
    throw e;
  } finally {
    saving.value = false;
  }
}
</script>
```

- [ ] **Step 3: Write minimal spec**

```ts
// client/src/views/module-access/__tests__/ModuleAccessManage.spec.ts
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ModuleAccessManage from '../ModuleAccessManage.vue';

vi.mock('@/api/module-access', () => ({
  moduleAccessApi: {
    listMatrix: vi.fn().mockResolvedValue({
      modules: [{ moduleKey: 'warehouse', moduleLabel: '仓库管理', leader: true, user: true }],
    }),
    saveMatrix: vi.fn().mockResolvedValue({ modules: [] }),
  },
}));

it('loads and renders matrix', async () => {
  setActivePinia(createPinia());
  const w = mount(ModuleAccessManage);
  await flushPromises();
  expect(w.text()).toContain('仓库管理');
});
```

- [ ] **Step 4: Run tests**

`npm run test -w client -- ModuleAccessManage` → PASS.

- [ ] **Step 5: Manual smoke**

Login as admin → visit `/module-access/manage` → flip warehouse off for user → save. Login as user → `仓库管理` 不在菜单里，访问 `/warehouse/materials` 跳 `/no-access?module=warehouse`.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/module-access/ \
        client/src/router/index.ts
git commit -m "feat(client): module-access matrix management page"
```

---

## Task 30: Delete frontend permission pages/components

**Files (delete):**
- `client/src/views/permission/` (entire dir incl. __tests__)
- `client/src/components/permission/` (entire dir)
- `client/src/views/audit/PermissionLogList.vue`

- [ ] **Step 1: Find any remaining import references**

```bash
grep -RIn "views/permission\|components/permission\|PermissionLogList" client/src --include="*.ts" --include="*.vue"
```

For each hit, remove the import or replace with audit-log equivalent (see Task 31).

- [ ] **Step 2: Delete the files**

```bash
git rm -r client/src/views/permission/
git rm -r client/src/components/permission/
git rm client/src/views/audit/PermissionLogList.vue
```

- [ ] **Step 3: Run client tests + build**

```bash
npm run test -w client
npm run build -w client
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(client): delete legacy permission views/components"
```

---

## Task 31: Merge `PermissionLogList` into `/audit-logs`

**Files:**
- Modify: `client/src/views/audit/AuditLogList.vue` (or whatever file backs `/audit/search` — find first)

- [ ] **Step 1: Find audit page route binding**

```bash
grep -n "audit/search\|AuditLog" client/src/router/index.ts
```

Likely route is `/audit/search` → some `AuditLogList.vue`. Add a sibling route `/audit-logs` aliasing this page; old route deprecated but redirect to new.

- [ ] **Step 2: Add a "权限变更" tab**

In `AuditLogList.vue`, add a tab/filter that calls `GET /permission-audit-logs` and renders the same table style:

```vue
<el-tabs v-model="activeTab">
  <el-tab-pane label="系统操作" name="ops" />
  <el-tab-pane label="权限变更（历史）" name="perm" />
</el-tabs>
<DataTable v-if="activeTab === 'ops'" :rows="opsRows" />
<DataTable v-if="activeTab === 'perm'" :rows="permRows" />
```

`permRows` fetched via:

```ts
import request from '@/api/request';
const permRows = ref([]);
async function loadPerm() {
  const r = await request.get('/permission-audit-logs');
  permRows.value = r.data ?? r;
}
watch(activeTab, (t) => t === 'perm' && permRows.value.length === 0 && loadPerm(), { immediate: true });
```

- [ ] **Step 3: Smoke test**

Login as admin → /audit-logs → switch to "权限变更" tab → rows from `permission_logs` 表显示。

- [ ] **Step 4: Commit**

```bash
git add client/src/views/audit/ client/src/router/index.ts
git commit -m "feat(client): merge PermissionLog history into audit-logs page"
```

---

## Task 32: Switch ModuleRouteRegistry to strict=true

**Files:**
- Modify: `server/.env.example` (or wherever env vars are documented)
- Modify: relevant deployment configs (`docker-compose.yml`, CI pipeline, etc.)

- [ ] **Step 1: Verify coverage**

`npm run test -w server -- module-access/coverage` → PASS. If not, go fix the unmapped controller in Task 11.

- [ ] **Step 2: Set strict=true for non-dev**

In CI/staging/production env: `MODULE_REGISTRY_STRICT=true`.

In `server/.env.example`:

```
# spec § 后端设计 § 灰度过渡: prod/staging must enable strict
MODULE_REGISTRY_STRICT=true
```

- [ ] **Step 3: Verify boot in CI**

Trigger a CI run; confirm log shows `Validated N controller paths (strict=true)` and the boot does not fail.

- [ ] **Step 4: Commit**

```bash
git add server/.env.example
git commit -m "ops(module-access): require strict registry validation in non-dev envs"
```

---

## Task 33: E2E acceptance

**Files:**
- Create: `server/e2e/module-access/module-access.e2e-spec.ts`
- Create: `server/e2e/module-access/approval-disabled-legacy.e2e-spec.ts`
- Create: `server/e2e/module-access/role-check-constraint.e2e-spec.ts`

- [ ] **Step 1: GET /module-access for each role**

```ts
// server/e2e/module-access/module-access.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('E2E: /module-access', () => {
  let app: any;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('admin sees all 9 modules', async () => {
    const token = await loginAs('admin');
    const r = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${token}`);
    expect(r.body.data.roleCode).toBe('admin');
    expect(r.body.data.enabledModules).toHaveLength(9);
  });

  it('user with all modules enabled sees 9 modules', async () => {
    const token = await loginAs('user');
    const r = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${token}`);
    expect(r.body.data.enabledModules).toContain('warehouse');
  });

  it('admin toggles warehouse off; user no longer sees warehouse', async () => {
    const adminTok = await loginAs('admin');
    await request(app.getHttpServer())
      .put('/api/v1/admin/module-access')
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ modules: [{ moduleKey: 'warehouse', leader: true, user: false }] })
      .expect(200);

    const userTok = await loginAs('user');
    const r = await request(app.getHttpServer())
      .get('/api/v1/module-access')
      .set('Authorization', `Bearer ${userTok}`);
    expect(r.body.data.enabledModules).not.toContain('warehouse');

    // direct API call should 403 with MODULE_DISABLED
    const denied = await request(app.getHttpServer())
      .get('/api/v1/warehouse/materials')
      .set('Authorization', `Bearer ${userTok}`)
      .expect(403);
    expect(denied.body.code ?? denied.body.data?.code).toBe('MODULE_DISABLED');
  });
});
```

- [ ] **Step 2: ApprovalDefinition disabled_legacy lifecycle**

```ts
// server/e2e/module-access/approval-disabled-legacy.e2e-spec.ts
it('boot scan demotes definitions with type=permission to disabled_legacy', async () => {
  // pre-seed via prisma client:
  await prisma.approvalDefinition.create({
    data: {
      id: 'legacy-1', module: 'document', resourceType: 'document', triggerKey: 'legacy',
      name: 'legacy-test', version: 1, status: 'active',
      steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
                assignments: [{ type: 'permission', permissionCode: 'x' }] }] as any,
    },
  });
  // reboot the Nest app via TestingModule
  // … (or call startup-scan.run() directly)
  const row = await prisma.approvalDefinition.findUnique({ where: { id: 'legacy-1' } });
  expect(row?.status).toBe('disabled_legacy');
});

it('POST /approval-definitions/:id/activate fails on disabled_legacy until steps fixed', async () => {
  const adminTok = await loginAs('admin');
  await request(app.getHttpServer())
    .post('/api/v1/approval-definitions/legacy-1/activate')
    .set('Authorization', `Bearer ${adminTok}`)
    .expect(400);

  // fix steps first
  await request(app.getHttpServer())
    .patch('/api/v1/approval-definitions/legacy-1')
    .set('Authorization', `Bearer ${adminTok}`)
    .send({ steps: [{ stepKey: 's', stepName: 'n', mode: 'single',
                       assignments: [{ type: 'ROLE', roleCode: 'leader' }] }] })
    .expect(200);

  await request(app.getHttpServer())
    .post('/api/v1/approval-definitions/legacy-1/activate')
    .set('Authorization', `Bearer ${adminTok}`)
    .expect(200);
});
```

- [ ] **Step 3: Role.code CHECK constraint**

```ts
// server/e2e/module-access/role-check-constraint.e2e-spec.ts
it('inserting a role with non-whitelisted code fails at DB layer', async () => {
  await expect(
    prisma.$executeRaw`INSERT INTO roles (id, code, name) VALUES ('x', 'quality_manager', 'QM')`
  ).rejects.toThrow(/check constraint/i);
});
```

- [ ] **Step 4: Run all E2E tests**

`npm run test:e2e -w server -- module-access` → all PASS.

- [ ] **Step 5: Manual cross-browser smoke (last)**

Run through the 8 frontend acceptance items (spec § 验收标准 § 前端) by hand. Document outcomes in PR description.

- [ ] **Step 6: Commit**

```bash
git add server/e2e/module-access/
git commit -m "test(module-access): e2e for module toggle + disabled_legacy + role CHECK"
```

---

## Task 34: Field audit — plan Appendix A/B

Produce the single source of truth for every model's leader/user filter strategy. The audit is the input for Tasks 37-45 and stays inside this plan.

**Files:**
- Modify: `docs/superpowers/plans/2026-05-23-simple-role-module-access.md` (this file, Appendix A/B below)

- [ ] **Step 1: Populate Appendix A with the field audit matrix below**

The table below is the starting matrix. **任何含 ⚠️ 标记的行（`schema audit pending` / `missing — needs new field` / `likely — verify` / `check schema`）必须在 Step 2 收口后才允许进入 Task 35**：Task 35 起的所有任务都假设 Appendix A 不再含 ⚠️ 行。

收口口径只有四种：
1. 替换为具体 schema 字段（路径 A 或 B）。
2. 写入 Appendix B 作为新增字段（路径 C），并在备注里注明对应 service 的临时空集兜底。
3. 标 `admin-only` 或 `not user-visible`（路径 D）。
4. 标 `not_required`（明确该模型完全不进入归属过滤范围）。

### Appendix A: Ownership Audit Matrix

| 模块 key | 模型 | leader 过滤 | user 过滤 | 备注 |
|---|---|---|---|---|
| work_execution | TodoTask | `JOIN users u ON u.id = TodoTask.userId WHERE u.departmentId IN <leader.managedDepts>` | `userId = currentUserId` | TodoTask has `userId` directly |
| work_execution | Task | `departmentId IN <leader.managedDepts>` | `creatorId = currentUserId` | Task 有 `departmentId`（String，FK to Department）和 `creatorId`（String，FK to User）；无 assigneeId |
| work_execution | ApprovalTask | `assigneeDepartmentId IN <leader.managedDepts>` ∪ `assigneeUserId IN <users in leader.managedDepts>` | `assigneeUserId = currentUserId` | |
| work_execution | ApprovalInstance | 通过 ApprovalTask 反查 | `createdById = currentUserId` | `createdById` exists |
| document_approval | Document | `departmentId IN <leader.managedDepts>` ∪ `ownerDepartmentId IN <leader.managedDepts>` | `creatorId = currentUserId` ∪ `ownerUserId = currentUserId` | both fields exist |
| document_approval | RecordTemplate | admin-only (templates are global) | admin-only | 无归属 |
| document_approval | Record | `JOIN users u ON u.id = Record.createdBy WHERE u.departmentId IN <managedDepts>` | `createdBy = currentUserId` | `createdBy` exists |
| production_execution | ProductionBatch | `leader_id IN <managedDepts.members>` （`Team` 模型无 `departmentId`，已核实 schema.prisma line 2343；只能通过 `leader_id` join 用户的部门） | `leader_id = currentUserId` | `leader_id`, `team_id` 存在；`createdBy` 不存在；`team.departmentId` 不存在 |
| production_execution | ProcessInstance | `JOIN users u ON u.id = createdById WHERE u.departmentId IN <managedDepts>` | `createdById = currentUserId` | `createdById` exists |
| production_execution | ProcessStepData | 通过 ProcessInstance 反查 | `submittedById = currentUserId` ∪ `approvedById = currentUserId` | both exist |
| production_execution | MixingExecution | `JOIN users u ON u.id = operatorId WHERE u.departmentId IN <managedDepts>` | `operatorId = currentUserId` | `operatorId` exists |
| production_execution | ShiftInstance | `leader_id IN <managedDepts.members>` （通过 JOIN users ON u.id=leader_id WHERE u.departmentId IN managedDepts） | `leader_id = currentUserId` ∪ `opened_by=currentUserId`（opened_by 是 String 无 FK，回退到 `leader_id`） | `leader_id String?`, `team_id String?`, `opened_by String`（无 FK）；TeamShift 模型不存在 |
| production_execution | LineChangeCheckRecord | `inspector_id` 存在；`JOIN users u ON u.id=inspector_id WHERE u.departmentId IN managedDepts` | `inspector_id = currentUserId` | `inspector_id String?` 无 FK relation，作为弱引用使用 |
| product_rd | Product | admin-only (产品主数据) | admin-only | 无归属 |
| product_rd | Recipe | admin-only | admin-only | 无归属 |
| product_rd | ChangeEvent | admin-only writes | 读端点全员可见 | `applied_by String?` 无 FK，`approved_by String?` 无 FK；变更管理是跨部门流程，无用户归属，admin-only writes |
| quality_compliance | DeviationReport | `JOIN users u ON u.id = reporterId WHERE u.departmentId IN <managedDepts>` | `reporterId = currentUserId` | `reporterId` exists |
| quality_compliance | NonConformance | Appendix B: `discoveredById` FK → 空集兜底直到 Task 46 落字段 | Appendix B: `discoveredById` FK → 空集兜底 | only string `discovered_by`/`disposition_by`；Task 41 service 层先返回空集，Task 46 落字段后改回 |
| quality_compliance | CustomerComplaint | Appendix B: `createdById` FK → 空集兜底 | Appendix B: `createdById` FK → 空集兜底 | sole link is `production_batch_id`；Task 41 service 层先返回空集，Task 46 落字段后改回 |
| quality_compliance | CorrectiveAction | `responsible_id IN members(managedDepts)`（JOIN users ON u.id=responsible_id WHERE u.departmentId IN managedDepts） | `responsible_id = currentUserId` | `responsible_id String?` 已存在于 schema line 2485 |
| quality_compliance | CCPRecord | `JOIN users u ON u.id=operator_id WHERE u.departmentId IN managedDepts` | `operator_id = currentUserId` | `operator_id String` 存在 |
| quality_compliance | EnvironmentRecord | `operator_id` 存在；`JOIN users u ON u.id=operator_id WHERE u.departmentId IN managedDepts` | `operator_id = currentUserId` | `operator_id String?` 存在 |
| quality_compliance | MetalDetectionLog | `JOIN users u ON u.id=operator_id WHERE u.departmentId IN managedDepts` | `operator_id = currentUserId` | `operator_id String?` 存在 |
| quality_compliance | FragileItemInspection | `JOIN users u ON u.id=inspector_id WHERE u.departmentId IN managedDepts` | `inspector_id = currentUserId` | `inspector_id String?` 存在 |
| equipment_site | Equipment | Appendix B: `responsiblePersonId` FK → 空集兜底 | Appendix B: `responsiblePersonId` FK → 空集兜底 | 现有 `responsiblePerson` 是字符串名字不可靠；Task 42 service 层先返回空集，Task 46 落字段后改回 |
| equipment_site | MaintenanceRecord | `performerId` exists; `JOIN users u ON u.id = performerId WHERE u.departmentId IN <managedDepts>` | `performerId = currentUserId` ∪ `reviewerId = currentUserId` | |
| equipment_site | MaintenancePlan | Appendix B: `responsiblePersonId` FK → 空集兜底 | Appendix B: `responsiblePersonId` FK → 空集兜底 | 同 Equipment；Task 42 service 层返回空集，Task 46 落字段 |
| equipment_site | EquipmentFault | `JOIN users u ON u.id = reporterId WHERE u.departmentId IN <managedDepts>` | `reporterId = currentUserId` ∪ `assigneeId = currentUserId` | `reporterId`, `assigneeId` exist |
| traceability_batch | BatchMaterialUsage / MaterialBalance | 沿 `ProductionBatch` 归属（join 上游） | 沿 `ProductionBatch` 归属 | |
| warehouse | StockRecord | `JOIN users u ON u.id = operatorId WHERE u.departmentId IN <managedDepts>` | `operatorId = currentUserId` | `operatorId` exists |
| warehouse | MaterialInbound | `JOIN users u ON u.id = operatorId WHERE u.departmentId IN <managedDepts>` | `operatorId = currentUserId` ∪ `approvedBy = currentUserId` | |
| warehouse | MaterialRequisition | `departmentId IN <managedDepts>`（`departmentId String?` 存在） | Appendix B: `applicantId` 是 String 无 FK → 空集兜底，Task 44 落字段后改回 | `applicantId String` 存在但无 FK relation；`departmentId String?` 可用于 leader 过滤 |
| warehouse | MaterialReturn / MaterialScrap | `requesterId` exists | `requesterId = currentUserId` | |
| warehouse | StagingAreaRecord / StagingAreaTransfer | `operatorId` exists | `operatorId = currentUserId` | |
| warehouse | StagingAreaStocktake | `operatorId` exists (may be null) | same | |
| warehouse | Material / MaterialCategory / Supplier / ExternalParty | admin-only writes（spec § 通用约束第 7 条：service 层校验，不在 controller 加 `@Roles`） | 读端点全员可见 | 无归属，全员只读 |
| training | TodoTask | userId → managedDepts | userId = currentUserId | |
| training | LearningRecord | `userId` exists | `userId = currentUserId` | |
| training | TrainingArchive | not_required（通过 TrainingProject 归属；档案本身是 PDF 存档，无直接操作者字段） | not_required | TrainingArchive 无 userId/operatorId；通过 `projectId → TrainingProject.createdBy` 可间接查，但档案列表为 admin/leader only |
| training | TrainingProject | `createdBy` exists；admin/leader 才能写（service 层校验，不加 `@Roles`） | 读端点全员可见 | |

- [ ] **Step 2: Resolve each row marked "schema audit pending" or "missing"**

For each pending/missing row, run:

```bash
rg -n "^model <ModelName>" server/src/prisma/schema.prisma -A 80
```

Replace the pending entry with either:
- (A) a concrete leader/user clause referencing a real field;
- (B) an entry in Appendix B listing the proposed new column (e.g. `NonConformance.discoveredById`, `Equipment.responsiblePersonId`); OR
- (C) admin-only declaration if the model carries master data with no per-user ownership.

- [ ] **Step 3: Populate Appendix B**

Appendix B is maintained in this plan, directly under this task.

### Appendix B: Ownership Migration Required Matrix

| 模型 | 新字段 | 类型 | FK 指向 | 回填策略 | 影响接口 |
|---|---|---|---|---|---|
| NonConformance | `discoveredById` | `String?` | `User.id` | 从 `discovered_by` 文本按 `users.name` / `users.username` 最佳匹配；失败保留 null，null 行对 `user` 不可见 | `non-conformances` list/detail/create/update |
| CustomerComplaint | `createdById` | `String?` | `User.id` | 新建后强制填当前用户；老数据无可靠创建人时保留 null，null 行对 `user` 不可见 | `customer-complaints` list/detail/create/update |
| Equipment | `responsiblePersonId` | `String?` | `User.id` | 从 `responsiblePerson` 文本按 `users.name` / `users.username` 最佳匹配；失败保留 null | `equipment` list/detail/create/update |
| MaintenancePlan | `responsiblePersonId` | `String?` | `User.id` | 从 `responsiblePerson` 文本按 `users.name` / `users.username` 最佳匹配；失败保留 null | `maintenance-plans` list/detail/create/update |
| MaterialRequisition | `applicantId` FK | `String?` | `User.id` | 现有 `applicantId` 是裸 String 无 relation；Step 2 确认缺少 FK；新建时强制写 currentUserId，老数据按 applicantId 字符串匹配 users.id 直接回填（格式已一致） | `warehouse/requisitions` list/detail/create/update |

Add one row per additional "missing" case from Step 2. The initial candidates above must either be confirmed and kept, replaced with a better existing-field/join rule in Appendix A, or marked `not_required` with reason before Task 46 starts. Specific examples captured from the initial audit:
- `NonConformance.discoveredById String? @relation -> User.id`，回填从 `discovered_by` 文本匹配 username（若失败则 null）。
- `CustomerComplaint.createdById String? @relation -> User.id`，新建后强制必填；老数据 backfill 失败列 null。
- `Equipment.responsiblePersonId String? @relation -> User.id`，回填同上。
- `MaintenancePlan.responsiblePersonId` 同上。
- `MaterialRequisition.requesterId String?`（如确认当前缺失），从相关 `RequisitionItem.createdBy` 反向回填。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-05-23-simple-role-module-access.md
git commit -m "docs(ownership): fill plan appendices for OwnershipScope audit"
```

---

## Task 35: OwnershipContext + interceptor

`ModuleAccessGuard` already runs on every business request. Extend it (or add a sibling interceptor) so every business handler can read `request.ownership = { roleCode, userId, managedDepartmentIds }` without each service refetching the user.

**Files:**
- Create: `server/src/modules/module-access/ownership-context.ts`
- Create: `server/src/modules/module-access/ownership-context.spec.ts`

- [ ] **Step 1: Write tests**

```ts
// server/src/modules/module-access/ownership-context.spec.ts
import { OwnershipContextResolver } from './ownership-context';

describe('OwnershipContextResolver', () => {
  it('admin context: roleCode=admin, managedDepartmentIds undefined (means全量)', async () => {
    const prisma = { department: { findMany: jest.fn() } } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'admin', departmentId: 'd1' });
    expect(ctx.roleCode).toBe('admin');
    expect(ctx.managedDepartmentIds).toBeUndefined();
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it('leader context: managedDepartmentIds = depts where managerId == userId', async () => {
    const prisma = { department: { findMany: jest.fn().mockResolvedValue([{ id: 'd-1' }, { id: 'd-2' }]) } } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'leader', departmentId: 'd-x' });
    expect(ctx.managedDepartmentIds).toEqual(['d-1', 'd-2']);
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: { managerId: 'u' }, select: { id: true },
    });
  });

  it('user context: managedDepartmentIds = empty', async () => {
    const prisma = { department: { findMany: jest.fn() } } as any;
    const resolver = new OwnershipContextResolver(prisma);
    const ctx = await resolver.resolve({ id: 'u', roleCode: 'user', departmentId: 'd-1' });
    expect(ctx.managedDepartmentIds).toEqual([]);
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

- [ ] **Step 3: Implement resolver**

```ts
// server/src/modules/module-access/ownership-context.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface OwnershipContext {
  userId: string;
  roleCode: 'admin' | 'leader' | 'user';
  departmentId: string | null;
  /** undefined = admin (no filter); array = leader's managed depts (may be empty); empty for user. */
  managedDepartmentIds: string[] | undefined;
}

@Injectable()
export class OwnershipContextResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(user: { id: string; roleCode: string; departmentId: string | null }): Promise<OwnershipContext> {
    const base = { userId: user.id, departmentId: user.departmentId };
    if (user.roleCode === 'admin') return { ...base, roleCode: 'admin', managedDepartmentIds: undefined };
    if (user.roleCode === 'leader') {
      const depts = await this.prisma.department.findMany({ where: { managerId: user.id }, select: { id: true } });
      return { ...base, roleCode: 'leader', managedDepartmentIds: depts.map((d: any) => d.id) };
    }
    return { ...base, roleCode: 'user', managedDepartmentIds: [] };
  }
}
```

- [ ] **Step 4: Wire into module + extend ModuleAccessGuard**

In `module-access.module.ts` add `OwnershipContextResolver` to providers + exports.

In `module-access.guard.ts`, change constructor signature to accept `OwnershipContextResolver` and, after the admin/enabled check passes, populate `req.ownership`:

```ts
// server/src/modules/module-access/module-access.guard.ts
import {
  CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus,
  Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessService } from './module-access.service';
import { OwnershipContextResolver } from './ownership-context';

export const MODULE_DISABLED_CODE = 'MODULE_DISABLED';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly service: ModuleAccessService,
    private readonly ownership: OwnershipContextResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const klass = context.getClass();
    const moduleKey = this.reflector.getAllAndOverride<string | undefined>(
      'module-access:module-key', [handler, klass],
    );
    if (!moduleKey) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException('未登录');

    // populate request.ownership once per request (for any role)
    if (!req.ownership) {
      req.ownership = await this.ownership.resolve({
        id: user.id, roleCode: user.roleCode, departmentId: user.departmentId ?? null,
      });
    }

    if (user.roleCode === 'admin') return true;

    const enabled = await this.service.getEnabledModulesFor({ roleCode: user.roleCode });
    if (enabled.includes(moduleKey as any)) return true;

    throw new HttpException(
      { code: MODULE_DISABLED_CODE, module: moduleKey, message: `模块已关闭: ${moduleKey}` },
      HttpStatus.FORBIDDEN,
    );
  }
}
```

Replace the existing `module-access.guard.spec.ts` cases that touched the previous 2-arg constructor and add explicit ownership-injection assertions:

```ts
// server/src/modules/module-access/module-access.guard.spec.ts (replace earlier tests)
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard, MODULE_DISABLED_CODE } from './module-access.guard';
import { ModuleKey } from '../../shared/decorators/module-key.decorator';

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
        if (u.roleCode === 'admin') return { userId: u.id, roleCode: 'admin', departmentId: u.departmentId, managedDepartmentIds: undefined };
        if (u.roleCode === 'leader') return { userId: u.id, roleCode: 'leader', departmentId: u.departmentId, managedDepartmentIds: ['d-1'] };
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
    // ownership 仍应在 throw 之前已经挂上 req（便于错误处理使用）
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
});
```

- [ ] **Step 5: Run tests (expect pass)** — `npm run test -w server -- ownership-context module-access.guard`

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/module-access/
git commit -m "feat(ownership): OwnershipContextResolver + guard injects req.ownership"
```

---

## Task 36: Param decorator `@Ownership()`

For service-level use the request-bound context. Use a Nest param decorator so service-callers don't reach into `request`.

**Files:**
- Create: `server/src/shared/decorators/ownership.decorator.ts`
- Create: `server/src/shared/decorators/ownership.decorator.spec.ts`

- [ ] **Step 1: Write test**

```ts
import { Ownership } from './ownership.decorator';
// Test the underlying factory by simulating ExecutionContext
import { ExecutionContext } from '@nestjs/common';

it('@Ownership() pulls request.ownership', async () => {
  const exec = {
    switchToHttp: () => ({ getRequest: () => ({ ownership: { userId: 'u', roleCode: 'leader', managedDepartmentIds: ['d-1'] } }) }),
  } as ExecutionContext;
  // call the underlying factory:
  const factory = (Ownership as any).__factory;
  expect(factory(undefined, exec)).toEqual({ userId: 'u', roleCode: 'leader', managedDepartmentIds: ['d-1'] });
});
```

- [ ] **Step 2: Implement decorator**

```ts
// server/src/shared/decorators/ownership.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { OwnershipContext } from '../../modules/module-access/ownership-context';

const factory = (_: unknown, ctx: ExecutionContext): OwnershipContext =>
  ctx.switchToHttp().getRequest().ownership;

export const Ownership = Object.assign(createParamDecorator(factory), { __factory: factory });
```

- [ ] **Step 3: Run test (expect pass)** + commit.

```bash
git add server/src/shared/decorators/ownership.decorator.ts \
        server/src/shared/decorators/ownership.decorator.spec.ts
git commit -m "feat(ownership): @Ownership() param decorator"
```

---

## Task 37: Apply OwnershipScope — `work_execution`

Models to filter (from `Appendix A: Ownership Audit Matrix` rows for `work_execution`): `TodoTask`, `Task`, `ApprovalTask`, `ApprovalInstance`.

**Files:**
- Modify: `server/src/modules/todo/todo.service.ts`
- Modify: `server/src/modules/task/task.service.ts`
- Modify: `server/src/modules/unified-approval/approval-task.controller.ts` (or its service)
- Modify: `server/src/modules/unified-approval/approval-instance.controller.ts`

- [ ] **Step 1: Worked example — TodoTask**

Add a new failing test:

```ts
// server/src/modules/todo/todo.service.spec.ts (add)
describe('TodoService.listForUser ownership', () => {
  const prisma = { todoTask: { findMany: jest.fn() }, user: { findMany: jest.fn() } } as any;
  const service = new TodoService(prisma);

  it('admin sees all', async () => {
    await service.listForUser({ userId: 'a', roleCode: 'admin', departmentId: null, managedDepartmentIds: undefined });
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({});
  });

  it('user sees only own todos', async () => {
    await service.listForUser({ userId: 'u-1', roleCode: 'user', departmentId: 'd-x', managedDepartmentIds: [] });
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
  });

  it('leader sees todos of users in managed depts', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
    await service.listForUser({ userId: 'l-1', roleCode: 'leader', departmentId: 'd-1', managedDepartmentIds: ['d-1'] });
    expect(prisma.todoTask.findMany).toHaveBeenCalledWith({ where: { userId: { in: ['u-1', 'u-2'] } } });
  });
});
```

- [ ] **Step 2: Implement `listForUser`**

Add the method to `TodoService`:

```ts
async listForUser(ownership: OwnershipContext) {
  if (ownership.roleCode === 'admin') return this.prisma.todoTask.findMany({});
  if (ownership.roleCode === 'user') return this.prisma.todoTask.findMany({ where: { userId: ownership.userId } });
  // leader
  const memberIds = ownership.managedDepartmentIds?.length
    ? (await this.prisma.user.findMany({
        where: { departmentId: { in: ownership.managedDepartmentIds } }, select: { id: true },
      })).map((u: any) => u.id)
    : [];
  if (memberIds.length === 0) return [];
  return this.prisma.todoTask.findMany({ where: { userId: { in: memberIds } } });
}
```

Replace any controller method that returned the unfiltered todos with:

```ts
@Get()
list(@Ownership() ownership: OwnershipContext) {
  return this.service.listForUser(ownership);
}
```

- [ ] **Step 3: Apply the same pattern to the remaining 3 models**

For each, replicate Step 1 + 2 with the audit row's filter:

- `Task.listForUser`: leader filters `Task.departmentId IN managedDepartmentIds`; user filters `Task.assigneeId = userId` (verify field name first; if `assigneeId` doesn't exist consult audit row).
- `ApprovalTask.listForUser`: leader filters `assigneeDepartmentId IN managedDepartmentIds` ∪ `assigneeUserId IN members(managedDepartmentIds)`; user filters `assigneeUserId = userId`.
- `ApprovalInstance.listForUser`: leader filters via `createdById IN members(managedDepartmentIds)`; user filters `createdById = userId`.

- [ ] **Step 4: Run all related tests**

`npm run test -w server -- todo task unified-approval` → PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/todo/ server/src/modules/task/ \
        server/src/modules/unified-approval/approval-task.controller.ts \
        server/src/modules/unified-approval/approval-instance.controller.ts
git commit -m "feat(ownership): work_execution module — TodoTask/Task/ApprovalTask/ApprovalInstance"
```

---

## Task 38: Apply OwnershipScope — `document_approval`

Models (audit): `Document` (departmentId/ownerDepartmentId/creatorId/ownerUserId), `Record` (createdBy join via users.departmentId).

**Files:**
- Modify: `server/src/modules/document/document.service.ts`
- Modify: `server/src/modules/record/record.service.ts`

- [ ] **Step 1: Document filter test + impl**

```ts
// in document.service.spec.ts
it('leader sees docs of managed departments (departmentId OR ownerDepartmentId)', async () => {
  // prisma.document.findMany call expected:
  // where: { OR: [ { departmentId: { in: managed } }, { ownerDepartmentId: { in: managed } } ] }
});
it('user sees only docs they created or own', async () => {
  // where: { OR: [ { creatorId: userId }, { ownerUserId: userId } ] }
});
```

Implementation:

```ts
async listForOwnership(ownership: OwnershipContext) {
  if (ownership.roleCode === 'admin') return this.prisma.document.findMany({});
  if (ownership.roleCode === 'user') {
    return this.prisma.document.findMany({
      where: { OR: [{ creatorId: ownership.userId }, { ownerUserId: ownership.userId }] },
    });
  }
  const depts = ownership.managedDepartmentIds ?? [];
  if (depts.length === 0) return [];
  return this.prisma.document.findMany({
    where: { OR: [{ departmentId: { in: depts } }, { ownerDepartmentId: { in: depts } }] },
  });
}
```

- [ ] **Step 2: Record filter test + impl**

Pattern same as TodoTask but via `JOIN users` since `Record` only has `createdBy` (no `departmentId`):

```ts
// leader:
const memberIds = await this.userIdsInDepts(ownership.managedDepartmentIds);
return this.prisma.record.findMany({ where: { createdBy: { in: memberIds } } });
// user:
return this.prisma.record.findMany({ where: { createdBy: ownership.userId } });
```

Add a shared helper `userIdsInDepts(deptIds)` to a small utility under `module-access/`:

```ts
// server/src/modules/module-access/ownership-helpers.ts
import { PrismaService } from '../../prisma/prisma.service';
export async function userIdsInDepts(prisma: PrismaService, deptIds: string[] | undefined): Promise<string[]> {
  if (!deptIds || deptIds.length === 0) return [];
  const rows = await prisma.user.findMany({ where: { departmentId: { in: deptIds } }, select: { id: true } });
  return rows.map((r: any) => r.id);
}
```

- [ ] **Step 3: RecordTemplate writes locked to admin（service 层校验）**

`record-template.controller.ts` 已挂 `@ModuleKey('document_approval')`；按 spec § 通用约束第 7 条不再叠加 `@Roles(...)`。写端点统一走 service 层校验：

```ts
// server/src/modules/record-template/record-template.service.ts
async create(input: CreateRecordTemplateDto, ownership: OwnershipContext) {
  if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入记录模板');
  return this.prisma.recordTemplate.create({ data: input });
}
// update / delete 同模板。
```

读端点对全部三角色开放（templates 是全局静态数据）。

- [ ] **Step 4: Run tests + commit**

```bash
npm run test -w server -- document record record-template
git add server/src/modules/document/ server/src/modules/record/ \
        server/src/modules/record-template/ \
        server/src/modules/module-access/ownership-helpers.ts
git commit -m "feat(ownership): document_approval module"
```

---

## Task 39: Apply OwnershipScope — `production_execution`

Models (audit verified):
- `ProductionBatch`: leader filter via `leader_id` ∪ `team.departmentId`; user via `leader_id`.
- `ProcessInstance`: createdById.
- `ProcessStepData`: submittedById / approvedById.
- `MixingExecution`: operatorId.
- Other (ShiftInstance / TeamShift / LineChangeCheckRecord): if audit returned "pending", defer to Task 46 schema work.

**Files:**
- Modify: `server/src/modules/batch-trace/production-batch.service.ts`
- Modify: `server/src/modules/process/process-instance.service.ts`
- Modify: `server/src/modules/process/process-step.service.ts`
- Modify: `server/src/modules/mixing/mixing.service.ts`

- [ ] **Step 1: ProductionBatch — filter only via `leader_id`**

按 Appendix A 已核实：`Team` 模型**没有** `departmentId`（schema.prisma line 2343 已确认），所以 leader 过滤只能走 `leader_id IN members(managedDepartmentIds)`。

```ts
async listForOwnership(o: OwnershipContext) {
  if (o.roleCode === 'admin') return this.prisma.productionBatch.findMany({});
  if (o.roleCode === 'user') return this.prisma.productionBatch.findMany({ where: { leader_id: o.userId } });
  const depts = o.managedDepartmentIds ?? [];
  if (depts.length === 0) return [];
  const memberIds = await userIdsInDepts(this.prisma, depts);
  if (memberIds.length === 0) return [];
  return this.prisma.productionBatch.findMany({ where: { leader_id: { in: memberIds } } });
}
```

- [ ] **Step 2: ProcessInstance + ProcessStepData**

For `ProcessInstance`:
- user: `createdById = userId`
- leader: `createdById IN members(managedDepartmentIds)`

For `ProcessStepData`:
- user: `OR [{submittedById: userId}, {approvedById: userId}]`
- leader: join via instance — first find ProcessInstance IDs visible to leader, then filter `instanceId IN <ids>`.

- [ ] **Step 3: MixingExecution**

Same shape as StockRecord (operatorId direct):
- user: `operatorId = userId`
- leader: `operatorId IN members(managedDepartmentIds)`

- [ ] **Step 4: Tests + commit**

```bash
npm run test -w server -- production-batch process mixing
git add server/src/modules/batch-trace/ server/src/modules/process/ server/src/modules/mixing/
git commit -m "feat(ownership): production_execution module"
```

---

## Task 40: Apply OwnershipScope — `product_rd`

Per audit: products & recipes are master data — admin-only writes; reads open to everyone in module. Change events / verification / compliance records may need fields — defer to Task 46.

**Files:**
- Modify: `server/src/modules/product/product.controller.ts`
- Modify: `server/src/modules/recipe/recipe.controller.ts`
- Modify: `server/src/modules/model-landing/model-landing.controller.ts`
- (others as needed per audit)

- [ ] **Step 1: Lock writes to admin（service 层校验，不在 controller 上叠加 @Roles）**

按 spec § 数据归属规则 § 通用约束第 7 条，业务 controller 一次只挂一种顶层守卫。`product / recipe` 已有 `@ModuleKey('product_rd')`，**不要**再叠加 `@Roles('admin')`；改在 service 写方法入口校验：

```ts
// server/src/modules/product/product.service.ts
async create(input: CreateProductDto, ownership: OwnershipContext) {
  if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入产品主数据');
  return this.prisma.product.create({ data: input });
}
// recipe.service.ts 同模板。
```

Controller 把写端点改成：

```ts
@Post()
create(@Body() body: CreateProductDto, @Ownership() ownership: OwnershipContext) {
  return this.service.create(body, ownership);
}
```

- [ ] **Step 2: Run smoke**

```bash
curl -s -X POST -H "Authorization: Bearer <leader-token>" http://localhost:3000/api/v1/products -d '{...}' -H "Content-Type: application/json"
```

Expected: 403. As admin: 201.

- [ ] **Step 3: For change-events etc., consult audit + skip if pending**

If the audit row for `ChangeEvent` ends up admin-only or "pending", record current status with a TODO comment in the controller and continue. Task 46 handles new fields.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/product/ server/src/modules/recipe/ server/src/modules/model-landing/
git commit -m "feat(ownership): product_rd module — admin-only master data writes"
```

---

## Task 41: Apply OwnershipScope — `quality_compliance`

Largest module. Models with verified fields: `DeviationReport.reporterId`, `CorrectiveAction.responsible_id`, `ReworkRecord.operator_id`. Many other models (`NonConformance`, `CustomerComplaint`, `CCPRecord`, etc.) lack proper FK to user and need new fields from Task 46.

**Files:**
- Modify: `server/src/modules/deviation/deviation-report.service.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/rework-record/rework-record.service.ts`
- For models WITH new fields from Task 46: their corresponding services.

- [ ] **Step 1: DeviationReport ownership**

Pattern (user/leader): `reporterId = userId` / `reporterId IN members(managedDepartmentIds)`.

- [ ] **Step 2: CorrectiveAction ownership**

Pattern: `responsible_id = userId` for user; `responsible_id IN members(managedDepartmentIds)` for leader.

- [ ] **Step 3: ReworkRecord ownership**

Pattern: `operator_id = userId` for user; `operator_id IN members(managedDepartmentIds)` for leader.

- [ ] **Step 4: Tests + commit**

```bash
npm run test -w server -- deviation corrective-action rework
git add server/src/modules/deviation/ server/src/modules/corrective-action/ server/src/modules/rework-record/
git commit -m "feat(ownership): quality_compliance — deviation/CAPA/rework"
```

- [ ] **Step 5: Service-layer "user 不可见" 兜底（不在 controller 上叠加 RolesGuard）**

为符合 spec § 数据归属规则 § 通用约束第 7 条「业务 controller 一次只挂一种顶层守卫」：对 `NonConformance / CustomerComplaint / CCPRecord / EnvironmentRecord / MetalDetectionLog / FragileItemInspection` 等 Appendix A 标记为「缺字段 → user 不可见」的模型，**保持** `@ModuleKey('quality_compliance')` 不变，**不在 controller 上叠加** `@Roles(...)`；改在各自 service 层把 `roleCode === 'user'` 显式返回空集。

模板（以 `NonConformanceService` 为例，每个 blocked 模型按同模板修改）：

```ts
// server/src/modules/non-conformance/non-conformance.service.ts
import type { OwnershipContext } from '../module-access/ownership-context';

async listForOwnership(o: OwnershipContext) {
  if (o.roleCode === 'admin') return this.prisma.nonConformance.findMany({});
  if (o.roleCode === 'user') return []; // 缺归属字段：对 user 直接不可见（Task 46 落字段后改回去）
  // leader: 暂保留既有过滤逻辑（按 source_type/source_id 或部门通用过滤）；Task 46 后改为 discoveredById 归属
  return this.legacyListForLeader();
}
```

把 controller 上的 `@Get()` 等读端点改为：

```ts
@Get()
list(@Ownership() ownership: OwnershipContext) {
  return this.service.listForOwnership(ownership);
}
```

写端点（POST/PATCH/DELETE）保持现有登录鉴权；不引入 `@Roles(...)`。

测试断言：以 user 身份请求 `/non-conformances` 返回 `[]`；以 leader / admin 身份返回非空（按既有过滤）。

- [ ] **Step 6: Commit service-layer 兜底**

```bash
npm run test -w server -- non-conformance customer-complaint ccp environment-record metal-detection fragile-item-inspection
git add server/src/modules/non-conformance/ \
        server/src/modules/customer-complaint/ \
        server/src/modules/ccp/ \
        server/src/modules/environment-record/ \
        server/src/modules/metal-detection/ \
        server/src/modules/fragile-item-inspection/
git commit -m "feat(ownership): quality_compliance — service-layer empty-set fallback for user on pending models"
```

---

## Task 42: Apply OwnershipScope — `equipment_site`

Per audit:
- `Equipment.responsiblePerson` is a string — needs Task 46 to add `responsiblePersonId`.
- `MaintenancePlan.responsiblePerson` same.
- `MaintenanceRecord.performerId / reviewerId` exist.
- `EquipmentFault.reporterId / assigneeId` exist.

**Files:**
- Modify: `server/src/modules/maintenance-record/maintenance-record.service.ts`
- Modify: `server/src/modules/equipment/equipment-fault.service.ts`

- [ ] **Step 1: MaintenanceRecord filter**

- user: `OR [{performerId: userId}, {reviewerId: userId}]`
- leader: same OR with `IN members(managedDepartmentIds)`

- [ ] **Step 2: EquipmentFault filter**

- user: `OR [{reporterId: userId}, {assigneeId: userId}]`
- leader: same OR with `IN members(managedDepartmentIds)`

- [ ] **Step 3: Equipment + MaintenancePlan — service-layer user-不可见 兜底（Task 46 后撤回）**

按 spec § 数据归属规则 § 通用约束第 7 条，**不**在 controller 上叠加 `@Roles(...)`。在 `EquipmentService.listForOwnership / MaintenancePlanService.listForOwnership` 内对 `roleCode === 'user'` 返回空集，等 Task 46 加上 `responsiblePersonId` FK 后改回标准 OwnershipScope。

```ts
// server/src/modules/equipment/equipment.service.ts
async listForOwnership(o: OwnershipContext) {
  if (o.roleCode === 'admin') return this.prisma.equipment.findMany({});
  if (o.roleCode === 'user') return [];  // 缺 responsiblePersonId FK：Task 46 落地后改为按 FK 过滤
  return this.legacyListForLeader();    // 既有 leader 过滤逻辑保留
}
```

`MaintenancePlanService` 按同模板修改。

测试：以 user 身份 `GET /equipment` / `GET /maintenance-plans` 返回 `[]`；以 leader/admin 身份按既有逻辑返回。

- [ ] **Step 4: Tests + commit**

```bash
npm run test -w server -- maintenance-record equipment-fault equipment maintenance-plan
git add server/src/modules/maintenance-record/ server/src/modules/equipment/
git commit -m "feat(ownership): equipment_site — fault/maintenance + service-layer empty-set for pending models"
```

---

## Task 43: Apply OwnershipScope — `traceability_batch`

Per audit: trace tables are derivatives of `ProductionBatch`. Filter by joining upstream `ProductionBatch` ownership.

**Files:**
- Modify: `server/src/modules/traceability/traceability.service.ts`
- Modify: `server/src/modules/batch-trace/material-balance.service.ts`
- Modify: `server/src/modules/batch-trace/batch-material-usage.service.ts`

- [ ] **Step 1: Compute visible batch IDs once per request**

Add helper to `ownership-helpers.ts`:

```ts
export async function visibleProductionBatchIds(prisma: PrismaService, o: OwnershipContext): Promise<string[] | undefined> {
  if (o.roleCode === 'admin') return undefined; // no filter
  if (o.roleCode === 'user') {
    return (await prisma.productionBatch.findMany({ where: { leader_id: o.userId }, select: { id: true } }))
      .map((b: any) => b.id);
  }
  const depts = o.managedDepartmentIds ?? [];
  if (depts.length === 0) return [];
  const members = await userIdsInDepts(prisma, depts);
  if (members.length === 0) return [];
  // Team 模型无 departmentId（Appendix A），ProductionBatch 仅能按 leader_id 过滤
  return (await prisma.productionBatch.findMany({
    where: { leader_id: { in: members } },
    select: { id: true },
  })).map((b: any) => b.id);
}
```

- [ ] **Step 2: Filter trace tables via batch IDs**

In each service.list: if `ids === undefined` → no filter; else `where: { production_batch_id: { in: ids } }` (or equivalent FK name; verify per model).

- [ ] **Step 3: Commit**

```bash
npm run test -w server -- traceability material-balance batch-material-usage
git add server/src/modules/traceability/ server/src/modules/batch-trace/
git commit -m "feat(ownership): traceability_batch — join upstream ProductionBatch scope"
```

---

## Task 44: Apply OwnershipScope — `warehouse`

Per audit:
- `StockRecord.operatorId` — direct.
- `MaterialInbound.operatorId` / `approverId` — direct.
- `MaterialRequisition.departmentId` for leader; user attribution needs Task 46 if `requesterId` is absent (audit Step 2 verification).
- `MaterialReturn.requesterId` / `MaterialScrap.requesterId` — direct.
- Master data (`Material`, `MaterialCategory`, `Supplier`, `ExternalParty`) — admin-only writes.

**Files:**
- Modify each corresponding service.

- [ ] **Step 1: StockRecord, MaterialInbound, MaterialReturn, MaterialScrap, StagingAreaRecord/Transfer**

Apply the `operatorId / requesterId = userId` pattern (user) and `IN members(...)` (leader).

- [ ] **Step 2: MaterialRequisition**

- leader: `departmentId IN managedDepartmentIds`（字段存在）。
- user: 若 Appendix A 显示 `requesterId` 已经存在，用 `requesterId = userId`；如果 Appendix B 已经把 `requesterId` 列入新增字段、但 Task 46 还没跑完，**service 层对 `roleCode === 'user'` 返回空集**，不要在 controller 上加 `@Roles(...)`（spec § 通用约束第 7 条）。Task 46 落字段后改为标准过滤。

- [ ] **Step 3: Master data lockdown（service 层校验，不动 controller guard 组合）**

`Material / MaterialCategory / Supplier / ExternalParty` 是主数据：
- 读端点对全部三角色开放。
- 写端点（POST/PATCH/DELETE）在 service 入口处显式 `if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入主数据')`，不要在 controller 上叠加 `@Roles('admin')`（保持 `@ModuleKey('warehouse')` 作为唯一顶层守卫）。

示例：

```ts
// server/src/modules/warehouse/services/material.service.ts
async create(input: CreateMaterialDto, ownership: OwnershipContext) {
  if (ownership.roleCode !== 'admin') throw new ForbiddenException('仅管理员可写入物料主数据');
  return this.prisma.material.create({ data: input });
}
```

测试：以 leader 身份 POST `/warehouse/materials` 应 403。

- [ ] **Step 4: Tests + commit**

```bash
npm run test -w server -- warehouse
git add server/src/modules/warehouse/
git commit -m "feat(ownership): warehouse module"
```

---

## Task 45: Apply OwnershipScope — `training`

Per audit:
- `LearningRecord.userId` — direct.
- `TrainingArchive.userId` (verify field name) — direct.
- `TrainingProject` — admin/leader manage; users see projects via their `LearningRecord` linkage.

**Files:**
- Modify: `server/src/modules/training/learning-record.service.ts`
- Modify: `server/src/modules/training/training-archive.service.ts`
- Modify: `server/src/modules/training/training-project.controller.ts`

- [ ] **Step 1: LearningRecord + TrainingArchive filter**

user: `userId = currentUserId`; leader: `userId IN members(managedDepartmentIds)`; admin: no filter.

- [ ] **Step 2: TrainingProject visibility for user**

读端点对全部三角色开放（用户能看到所有 active project）。写端点（POST/PATCH/DELETE）不在 controller 上叠加 `@Roles(...)`；改在 service 入口校验 `roleCode IN ('admin', 'leader')`，否则 `ForbiddenException`（spec § 通用约束第 7 条）。

- [ ] **Step 3: Tests + commit**

```bash
npm run test -w server -- training
git add server/src/modules/training/
git commit -m "feat(ownership): training module"
```

---

## Task 46: Schema migrations for missing ownership fields

Process `Appendix B: Ownership Migration Required Matrix` rows. Each row → a column + FK + backfill snippet.

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<ts>_ownership_fk_fields/migration.sql`
- Modify: the corresponding services to switch from admin/leader-only gate back to full ownership filter.

- [ ] **Step 1: Edit schema.prisma**

For each pending field, add a nullable FK column. Examples (final list comes from Appendix B):

```prisma
model NonConformance {
  // existing
  discoveredById String?
  discoveredByUser User? @relation("NonConformanceDiscoverer", fields: [discoveredById], references: [id], onDelete: SetNull)
  @@index([discoveredById])
}

model CustomerComplaint {
  // existing
  createdById String?
  createdByUser User? @relation("CustomerComplaintCreator", fields: [createdById], references: [id], onDelete: SetNull)
  @@index([createdById])
}

model Equipment {
  // existing
  responsiblePersonId String?
  responsiblePersonUser User? @relation("EquipmentResponsible", fields: [responsiblePersonId], references: [id], onDelete: SetNull)
  @@index([responsiblePersonId])
}

model MaintenancePlan {
  responsiblePersonId String?
  responsiblePersonUser User? @relation("MaintenancePlanResponsible", fields: [responsiblePersonId], references: [id], onDelete: SetNull)
  @@index([responsiblePersonId])
}

// add to MaterialRequisition / TrainingArchive etc. per audit
```

Add the corresponding inverse relations on `User`:

```prisma
model User {
  // ... existing relations
  discoveredNonConformances NonConformance[]    @relation("NonConformanceDiscoverer")
  createdComplaints         CustomerComplaint[] @relation("CustomerComplaintCreator")
  responsibleEquipment      Equipment[]         @relation("EquipmentResponsible")
  responsibleMaintenancePlans MaintenancePlan[] @relation("MaintenancePlanResponsible")
}
```

- [ ] **Step 2: Generate the migration**

```bash
npm run prisma:migrate -w server -- --name ownership_fk_fields --create-only
```

Edit the SQL to append a backfill step per field (best-effort name match):

```sql
-- Backfill discoveredById from text discovered_by
UPDATE "NonConformance" nc
SET "discoveredById" = u.id
FROM users u
WHERE u.name = nc.discovered_by;

-- Equipment responsiblePersonId backfill (best-effort)
UPDATE equipment eq
SET "responsiblePersonId" = u.id
FROM users u
WHERE u.name = eq."responsiblePerson";
```

(Adjust column names per Prisma's @map output.)

- [ ] **Step 3: Apply migration**

```bash
npm run prisma:migrate -w server
npm run prisma:generate -w server
```

Expected: PASS. Verify backfill row counts:

```sql
SELECT COUNT(*) FROM "NonConformance" WHERE "discoveredById" IS NOT NULL;
```

- [ ] **Step 4: Switch services to use new fields**

Now that the fields exist, revisit Tasks 41/42/44/45 to replace the `roleCode === 'user' → []` service-layer empty-set fallback with actual ownership filters using the new FK fields. Add tests for `user` visibility through the new fields.

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma \
        server/src/prisma/migrations/*ownership_fk_fields*
git commit -m "schema: add ownership FK fields (NonConformance/CustomerComplaint/Equipment/etc.)"

# after services switched to use new fields
git add server/src/modules/non-conformance/ server/src/modules/customer-complaint/ server/src/modules/equipment/ server/src/modules/warehouse/ server/src/modules/training/
git commit -m "feat(ownership): switch quality/equipment/warehouse/training services to new FK fields"
```

---

## Task 47: E2E for OwnershipScope

**Files:**
- Create: `server/e2e/module-access/ownership-scope.e2e-spec.ts`

- [ ] **Step 1: Cover ≥3 modules with leader vs user vs admin scope**

```ts
// server/e2e/module-access/ownership-scope.e2e-spec.ts
it('TodoTask: user sees only own, leader sees managed, admin sees all', async () => {
  // seed 3 users (admin, leader for d-1, user-1 in d-1, user-2 in d-2)
  // seed 4 TodoTasks: one per user, one cross-dept
  // hit /api/v1/todos as each role; assert counts
});

it('Document: user sees own/owned; leader sees dept docs; admin all', async () => { /* … */ });

it('StockRecord: user sees own operatorId rows; leader sees managed members; admin all', async () => { /* … */ });

it('OwnershipScope context populated on every request', async () => {
  // verify req.ownership.managedDepartmentIds populated by inspecting an instrumented controller's debug output
});
```

- [ ] **Step 2: Run E2E**

```bash
npm run test:e2e -w server -- ownership-scope
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/e2e/module-access/ownership-scope.e2e-spec.ts
git commit -m "test(ownership): e2e coverage across 3 modules"
```

---

## Self-Review Checklist

After completing Task 47, run through the spec one more time and confirm each item:

- [ ] Spec § 一句话说明 — covered by Task 4 + Task 9 (default-on + module toggle)
- [ ] Spec § 角色制度 — admin/leader/user only (Task 4 Role.code CHECK)
- [ ] Spec § 模块开关 — 9 keys, default-on (Tasks 2-7)
- [ ] Spec § 审批分派契约 — Tasks 12-17
- [ ] Spec § 后端设计 (ModuleRouteRegistry + 启动期校验 + 匹配算法 + 灰度过渡) — Tasks 3, 10, 32
- [ ] Spec § 系统治理 API 范围 — registry-config.ts + Task 19, 21
- [ ] Spec § 前端设计 — Tasks 24-31
- [ ] Spec § 数据模型 (ModuleAccessConfig + Role.code CHECK + assigneePermissionCode drop) — Tasks 4, 17, 22
- [ ] Spec § API 设计 (3 endpoints) — Tasks 6, 7
- [ ] Spec § 替换范围 (delete list) — Tasks 18, 20, 22, 30
- [ ] Spec § 验收标准 — Task 33 + Task 47
- [ ] Spec § 上线前准备清单 — Task 1
- [ ] Spec § 数据归属规则（OwnershipScope）— Tasks 34-47
  - [ ] 字段审计 + Appendix A → Task 34
  - [ ] OwnershipContext 注入 → Tasks 35-36
  - [ ] 9 个模块按审计落地过滤 → Tasks 37-45
  - [ ] 字段缺失 → 新增 FK 迁移 → Task 46
  - [ ] E2E ≥3 模块归属过滤 → Task 47

---

Plan complete and saved to `docs/superpowers/plans/2026-05-23-simple-role-module-access.md`.

---

## Quick Navigation

| 阶段 | Tasks | 主题 |
|---|---|---|
| Preflight | 1 ✅ | GitNexus impact + 上线前清单 SQL 对账（dev 已完成 2026-05-23；详见文首 "Starting State"） |
| 模块开关基础 | 2-10 | 常量 / registry / Prisma 模型 / Role.code CHECK / 服务 / 接口 / 守卫 / bootstrap 校验 |
| Controller 标注 | 11 | 9 个业务模块全部挂 `@ModuleKey()` + 覆盖率自检 |
| 审批分派契约 | 12-17 | DTO 限定三种 assignment / status 三值 / 启动期扫描 / Resolver 重写 / 删 `assigneePermissionCode` |
| 旧权限子系统下线 | 18-22 | UnifiedPermissionGuard + 四个旧权限模块 + PermissionLog 转只读 + drop 6 张表 |
| Seed 重建 | 23 | seed.ts / seed-baseline / seed-e2e / seed-org / seed-demo / seed-dev |
| 前端集成 | 24-31 | API client + axios MODULE_DISABLED 拦截 + 菜单 / 路由 / `/no-access` / `/module-access/manage` / 删旧前端 / 审计日志合并 |
| 严格模式 + 验收 | 32-33 | strict=true + E2E 模块开关 / disabled_legacy / Role.code CHECK |
| OwnershipScope 准备 | 34-36 | Appendix A/B 字段审计 + `OwnershipContextResolver` + `@Ownership()` 装饰器 |
| 9 模块归属过滤 | 37-45 | work_execution / document_approval / production_execution / product_rd / quality_compliance / equipment_site / traceability_batch / warehouse / training |
| 字段缺口补齐 | 46 | NonConformance / CustomerComplaint / Equipment / MaintenancePlan / MaterialRequisition 等 FK 新增 + 回填 |
| OwnershipScope 验收 | 47 | E2E 覆盖 ≥3 模块的 leader/user 范围差异 |

Appendix index:

- `Appendix A: Ownership Audit Matrix` → Task 34 Step 1（字段审计起跑表，⚠️ 行必须在进入 Task 35 之前收口）。
- `Appendix B: Ownership Migration Required Matrix` → Task 34 Step 3（驱动 Task 46 的迁移清单）。
