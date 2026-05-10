# Mobile H5 Station Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除旧微信小程序入口，移除微信登录/订阅消息能力，并把 `mobile/` 收敛为账号密码登录的在线 H5 工位入口。

**Architecture:** `mobile/` 作为唯一现场终端前端，通过浏览器访问同一套 `/api/v1` 后端，写入同一套 `RecordTemplate / Record` 数据。H5 工位只保存本地工位上下文和常用模板排序，不新增移动端专用记录事实表；微信小程序登录、订阅消息、`wechat_openid` 从运行代码和 Prisma schema 中移除。

**Tech Stack:** npm workspaces, NestJS, Prisma, uni-app/Vue 3, Pinia, Vitest, Jest.

---

## 文件结构

- 删除：`miniprogram/`
- 修改：`package.json`
- 修改：`package-lock.json`
- 修改：`client/Dockerfile`
- 修改：`server/Dockerfile`
- 修改：`server/src/modules/auth/auth.controller.ts`
- 修改：`server/src/modules/auth/auth.service.ts`
- 修改：`server/src/modules/auth/auth.service.spec.ts`
- 删除：`server/src/modules/auth/dto/wechat-login.dto.ts`
- 删除：`server/src/modules/wechat/`
- 修改：`server/src/app.module.ts`
- 修改：`server/src/prisma/schema.prisma`
- 新建：`server/src/prisma/migrations/20260429000000_remove_wechat_capabilities/migration.sql`
- 修改：`mobile/src/config/env.ts`
- 新建：`mobile/.env.example`
- 修改：`mobile/src/types/index.ts`
- 修改：`mobile/src/stores/user.ts`
- 修改：`mobile/src/api/auth.ts`
- 新建：`mobile/src/utils/stationContext.ts`
- 新建：`mobile/src/utils/recordTemplate.ts`
- 新建：`mobile/src/utils/__tests__/stationContext.spec.ts`
- 新建：`mobile/src/utils/__tests__/recordTemplate.spec.ts`
- 修改：`mobile/src/api/record.ts`
- 修改：`mobile/src/App.vue`
- 修改：`mobile/src/pages/index/index.vue`
- 修改：`mobile/src/pages/login/index.vue`
- 修改：`mobile/src/pages/records/create.vue`
- 修改：`mobile/src/pages/records/list.vue`
- 修改：`mobile/src/pages/records/detail.vue`
- 修改：`mobile/src/pages/user/index.vue`

## 实施前约束

- 本计划涉及记录模板、记录数据和食品安全主数据边界；执行前必须已阅读 `docs/AGENT_GUIDE.md` 和 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`。
- 使用仓库根目录执行命令：`/Users/jiashenglin/Desktop/好玩的项目/noidear`。
- 使用 Node 20：先执行 `nvm use`。不要用 Node 25 安装依赖。
- 不提交 `.env`、coverage、dist、playwright-report、test-results 等本地产物。
- 不删除企业微信 SSO 或监控告警里名为 `wechat` 的渠道；本次只删除微信小程序登录和微信订阅消息模块。

### Task 1: 清理旧 `miniprogram` workspace 和构建入口

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `client/Dockerfile`
- Modify: `server/Dockerfile`
- Delete: `miniprogram/`

- [ ] **Step 1: 确认当前残留引用**

Run:

```bash
rg -n "miniprogram|noidear-miniprogram" package.json package-lock.json client/Dockerfile server/Dockerfile miniprogram
```

Expected: 输出包含根 workspace、两个 Dockerfile 的 `COPY miniprogram/package.json`，以及 `miniprogram/` 目录内文件。

- [ ] **Step 2: 修改根 workspace**

Replace `package.json` workspaces with:

```json
  "workspaces": [
    "client",
    "server",
    "mobile",
    "tools/noidear-mcp"
  ],
```

- [ ] **Step 3: 删除 Dockerfile 中的小程序 package 复制**

In `client/Dockerfile`, remove this line:

```dockerfile
COPY miniprogram/package.json ./miniprogram/package.json
```

In `server/Dockerfile`, remove both occurrences of:

```dockerfile
COPY miniprogram/package.json ./miniprogram/package.json
```

- [ ] **Step 4: 删除已纳入 Git 的旧小程序目录**

Run:

```bash
git rm -r miniprogram
```

Expected: 输出多行 `rm 'miniprogram/...'`。如果本地有未跟踪 `miniprogram/.env` 导致目录无法完全删除，确认它没有被 staged；不要把 `.env` 加入提交。

- [ ] **Step 5: 重新生成 lockfile workspace 元数据**

Run:

```bash
nvm use
npm install --package-lock-only --ignore-scripts
```

Expected: 命令成功，`package-lock.json` 不再包含 `node_modules/miniprogram` 或 `noidear-miniprogram`。

- [ ] **Step 6: 验证小程序构建入口已清掉**

Run:

```bash
rg -n "miniprogram|noidear-miniprogram" package.json package-lock.json client/Dockerfile server/Dockerfile
```

Expected: 无输出。

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json package-lock.json client/Dockerfile server/Dockerfile miniprogram
git commit -m "chore: remove legacy miniprogram workspace"
```

Expected: commit 成功，提交只包含 workspace、Dockerfile、lockfile 和 `miniprogram/` 删除。

### Task 2: 移除后端微信小程序登录和订阅消息模块

**Files:**
- Modify: `server/src/modules/auth/auth.controller.ts`
- Modify: `server/src/modules/auth/auth.service.ts`
- Modify: `server/src/modules/auth/auth.service.spec.ts`
- Delete: `server/src/modules/auth/dto/wechat-login.dto.ts`
- Delete: `server/src/modules/wechat/`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: 写失败测试，锁定 `/auth/wechat/miniprogram` 不再存在**

In `server/src/modules/auth/auth.service.spec.ts`, remove `HttpService` and `ConfigService` providers, then add:

```ts
it('does not expose wechat mini program login on AuthService', () => {
  expect('wechatMiniProgramLogin' in service).toBe(false);
});
```

Run:

```bash
npm test --workspace server -- auth.service.spec.ts --runInBand
```

Expected: FAIL because `wechatMiniProgramLogin` still exists or because old constructor mocks still mention WeChat dependencies.

- [ ] **Step 2: 精简 `AuthController`**

Change `server/src/modules/auth/auth.controller.ts` imports to:

```ts
import { Controller, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
```

Keep only account login, profile, and change-password routes:

```ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDTO) {
    return this.authService.changePassword(req.user.userId, dto.oldPassword, dto.newPassword);
  }
}
```

- [ ] **Step 3: 精简 `AuthService` 构造函数和方法**

Remove these imports from `server/src/modules/auth/auth.service.ts`:

```ts
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
```

Change constructor to:

```ts
constructor(
  private prisma: PrismaService,
  private jwtService: JwtService,
) {}
```

Delete the entire `wechatMiniProgramLogin(code: string)` method. Keep `login`, `validateUser`, `generateToken`, and `changePassword` unchanged except for removed imports and dependencies.

- [ ] **Step 4: 删除微信 DTO 和模块目录**

Run:

```bash
git rm server/src/modules/auth/dto/wechat-login.dto.ts
git rm -r server/src/modules/wechat
```

Expected: 输出删除 `wechat-login.dto.ts`、`wechat.controller.ts`、`wechat.service.ts`、`wechat.module.ts` 及对应 spec/dto 文件。

- [ ] **Step 5: 从 `AppModule` 移除 `WechatModule`**

In `server/src/app.module.ts`, remove:

```ts
import { WechatModule } from './modules/wechat/wechat.module';
```

Also remove this item from the `imports` array:

```ts
    WechatModule,
```

- [ ] **Step 6: 跑后端相关测试**

Run:

```bash
npm test --workspace server -- auth.service.spec.ts --runInBand
```

Expected: PASS。

- [ ] **Step 7: 确认没有运行代码引用旧微信模块**

Run:

```bash
rg -n "wechatMiniProgramLogin|WechatLoginDto|modules/wechat|wechat/miniprogram|wechat_openid|wechatMessage" server/src --glob '!prisma/schema.prisma' --glob '!prisma/schema.prisma.bak'
```

Expected: 无输出，或仅剩企业微信 SSO/监控告警相关的 `wechat` 字符串且不匹配上述小程序/订阅消息标识。

- [ ] **Step 8: Commit**

Run:

```bash
git add server/src/modules/auth server/src/app.module.ts
git commit -m "refactor: remove wechat auth and message module"
```

Expected: commit 成功，提交不包含 Prisma schema 迁移。

### Task 3: 移除 Prisma `wechat_openid` 和 `WechatMessage`

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260429000000_remove_wechat_capabilities/migration.sql`

- [ ] **Step 1: 写迁移文件**

Create `server/src/prisma/migrations/20260429000000_remove_wechat_capabilities/migration.sql`:

```sql
-- Remove WeChat mini-program login and subscribe-message storage.
-- IF EXISTS keeps deploy tolerant because old environments may not have all artifacts.
DROP INDEX IF EXISTS "users_wechat_openid_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "wechat_openid";
DROP TABLE IF EXISTS "wechat_messages";
```

- [ ] **Step 2: 修改 User 模型**

In `server/src/prisma/schema.prisma`, remove this field from `model User`:

```prisma
  wechat_openid  String?     @unique
```

- [ ] **Step 3: 删除 WechatMessage 模型**

In `server/src/prisma/schema.prisma`, delete the full model that maps to `wechat_messages`:

```prisma
model WechatMessage {
  id         String    @id @default(cuid())
  userId     String?
  templateId String
  touser     String
  page       String?
  data       Json
  status     String    @default("pending")
  errorCode  String?
  errorMsg   String?
  sentAt     DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@map("wechat_messages")
}
```

If the exact field ordering differs, delete from the line that starts `model WechatMessage {` through that model's closing brace, and confirm the deleted block contains `@@map("wechat_messages")`.

- [ ] **Step 4: 生成 Prisma client**

Run:

```bash
npm run prisma:generate -w server
```

Expected: Prisma Client generation succeeds without `WechatMessage` or `wechat_openid` errors.

- [ ] **Step 5: 验证 schema 中无微信小程序存储模型**

Run:

```bash
rg -n "wechat_openid|WechatMessage|wechat_messages" server/src/prisma/schema.prisma server/src/prisma/migrations/20260429000000_remove_wechat_capabilities/migration.sql
```

Expected: 只在新 migration 文件中看到 `wechat_openid` 和 `wechat_messages` 的删除语句；`schema.prisma` 无匹配。

- [ ] **Step 6: Commit**

Run:

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260429000000_remove_wechat_capabilities/migration.sql
git commit -m "chore: remove wechat prisma artifacts"
```

Expected: commit 成功。

### Task 4: 对齐移动端登录契约和 API base

**Files:**
- Modify: `mobile/src/config/env.ts`
- Create: `mobile/.env.example`
- Modify: `mobile/src/types/index.ts`
- Modify: `mobile/src/stores/user.ts`
- Modify: `mobile/src/api/auth.ts`
- Modify: `mobile/src/pages/login/index.vue`

- [ ] **Step 1: 写类型契约测试**

Create `mobile/src/utils/__tests__/authContract.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { LoginResult, UserInfo } from '@/types'

describe('mobile auth contract', () => {
  it('matches backend /auth/login user payload', () => {
    const result: LoginResult = {
      token: 'jwt-token',
      user: {
        id: 'user-1',
        username: 'operator',
        name: '操作员',
        role: 'operator',
      },
    }

    const user: UserInfo = result.user

    expect(user.name).toBe('操作员')
    expect(user.username).toBe('operator')
  })
})
```

Run:

```bash
npm test --workspace mobile -- authContract.spec.ts
```

Expected: FAIL because `UserInfo` still requires `realName`、`department`、`position`、`avatar`。

- [ ] **Step 2: 修改 `UserInfo`**

Replace `UserInfo` in `mobile/src/types/index.ts` with:

```ts
/** User info returned by backend /auth/login */
export interface UserInfo {
  id: string
  username: string
  name: string
  role: string
  department?: string
  position?: string
  avatar?: string
}
```

- [ ] **Step 3: 修改 API base 默认值并移除微信 AppId 配置**

Replace `mobile/src/config/env.ts` with:

```ts
/**
 * Environment configuration.
 * localhost is only the local development fallback. Production H5 builds must
 * provide VITE_API_BASE_URL, for example https://api.example.com/api/v1.
 */
export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  APP_NAME: import.meta.env.VITE_APP_NAME || '现场终端',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  DEBUG: import.meta.env.DEV,
}

export default ENV
```

- [ ] **Step 4: 新增 H5 环境变量示例**

Create `mobile/.env.example`:

```env
# Local development API.
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Production H5 build example. Replace with the deployed HTTPS API domain.
# VITE_API_BASE_URL=https://api.example.com/api/v1

VITE_APP_NAME=现场终端
VITE_APP_VERSION=1.0.0
```

- [ ] **Step 5: 修正移动端改密接口**

In `mobile/src/stores/user.ts`, replace:

```ts
    await post('/auth/password', {
      oldPassword,
      newPassword,
    })
```

with:

```ts
    await post('/auth/change-password', {
      oldPassword,
      newPassword,
    })
```

In `mobile/src/api/auth.ts`, replace the same `/auth/password` call with `/auth/change-password`:

```ts
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await post('/auth/change-password', { oldPassword, newPassword })
}
```

- [ ] **Step 6: 登录页文案改为系统账号登录**

In `mobile/src/pages/login/index.vue`, ensure visible login copy uses:

```vue
<text class="login-page__title">现场终端</text>
<text class="login-page__subtitle">使用系统账号登录</text>
```

Do not add 微信登录、手机号登录、短信验证码入口。

- [ ] **Step 7: 跑移动端 auth 契约测试**

Run:

```bash
npm test --workspace mobile -- authContract.spec.ts
```

Expected: PASS。

- [ ] **Step 8: Commit**

Run:

```bash
git add mobile/src/config/env.ts mobile/.env.example mobile/src/types/index.ts mobile/src/stores/user.ts mobile/src/api/auth.ts mobile/src/pages/login/index.vue mobile/src/utils/__tests__/authContract.spec.ts
git commit -m "fix: align mobile account login contract"
```

Expected: commit 成功。

### Task 5: 增加工位上下文和记录模板适配工具

**Files:**
- Create: `mobile/src/utils/stationContext.ts`
- Create: `mobile/src/utils/recordTemplate.ts`
- Create: `mobile/src/utils/__tests__/stationContext.spec.ts`
- Create: `mobile/src/utils/__tests__/recordTemplate.spec.ts`

- [ ] **Step 1: 写工位上下文测试**

Create `mobile/src/utils/__tests__/stationContext.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildStationSource, normalizeStationContext } from '@/utils/stationContext'

describe('stationContext', () => {
  it('normalizes empty station context to browser defaults', () => {
    expect(normalizeStationContext({})).toEqual({
      stationName: '未配置工位',
      stationArea: '未配置区域',
      deviceLabel: '浏览器终端',
    })
  })

  it('builds audit metadata for h5 station records', () => {
    const source = buildStationSource({
      stationName: '内包工位 1',
      stationArea: '包装间',
      deviceLabel: 'PDA-01',
    })

    expect(source).toEqual({
      source: 'h5_station',
      stationName: '内包工位 1',
      stationArea: '包装间',
      deviceLabel: 'PDA-01',
    })
  })
})
```

- [ ] **Step 2: 实现工位上下文工具**

Create `mobile/src/utils/stationContext.ts`:

```ts
export interface StationContext {
  stationName: string
  stationArea: string
  deviceLabel: string
}

export interface StationSource extends StationContext {
  source: 'h5_station'
}

export function normalizeStationContext(input: Partial<StationContext> | null | undefined): StationContext {
  return {
    stationName: input?.stationName?.trim() || '未配置工位',
    stationArea: input?.stationArea?.trim() || '未配置区域',
    deviceLabel: input?.deviceLabel?.trim() || '浏览器终端',
  }
}

export function buildStationSource(input: Partial<StationContext> | null | undefined): StationSource {
  return {
    source: 'h5_station',
    ...normalizeStationContext(input),
  }
}
```

- [ ] **Step 3: 写记录模板适配测试**

Create `mobile/src/utils/__tests__/recordTemplate.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  extractTemplateFields,
  getTemplateSourceGroup,
  normalizeTemplatePage,
  sortTemplatesWithPinned,
} from '@/utils/recordTemplate'

describe('recordTemplate utilities', () => {
  it('normalizes backend page shape and fieldsJson fields', () => {
    const page = normalizeTemplatePage({
      data: [
        {
          id: 'tpl-1',
          name: '清洁记录',
          code: 'CC-001',
          description: '仓储组 — 清洁记录.md',
          status: 'active',
          fieldsJson: {
            fields: [{ name: 'area', label: '区域', type: 'text', required: true }],
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    })

    expect(page.list[0].fields).toEqual([
      { name: 'area', label: '区域', type: 'text', required: true },
    ])
    expect(page.pageSize).toBe(100)
  })

  it('derives source group from description', () => {
    expect(getTemplateSourceGroup({ description: '制造部 — 投料记录.md' })).toBe('制造部')
    expect(getTemplateSourceGroup({ description: '' })).toBe('未分组')
  })

  it('sorts pinned templates first without hiding unpinned templates', () => {
    const result = sortTemplatesWithPinned(
      [
        { id: 'b', name: 'B' },
        { id: 'a', name: 'A' },
      ],
      ['a'],
    )

    expect(result.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('extracts empty fields when backend has no fieldsJson', () => {
    expect(extractTemplateFields({})).toEqual([])
  })
})
```

- [ ] **Step 4: 实现记录模板适配工具**

Create `mobile/src/utils/recordTemplate.ts`:

```ts
import type { FormField, PaginatedResult } from '@/types'

type BackendTemplatePage = {
  data?: unknown[]
  list?: unknown[]
  total?: number
  page?: number
  limit?: number
  pageSize?: number
}

type TemplateLike = {
  id?: string
  name?: string
  code?: string
  description?: string
  status?: string
  fields?: FormField[]
  fieldsJson?: { fields?: FormField[] } | FormField[]
}

export interface NormalizedRecordTemplate {
  id: string
  name: string
  code: string
  description: string
  status: string
  fields: FormField[]
  sourceGroup: string
}

export function extractTemplateFields(template: TemplateLike): FormField[] {
  if (Array.isArray(template.fields)) return template.fields
  if (Array.isArray(template.fieldsJson)) return template.fieldsJson
  if (Array.isArray(template.fieldsJson?.fields)) return template.fieldsJson.fields
  return []
}

export function getTemplateSourceGroup(template: Pick<TemplateLike, 'description'>): string {
  const description = template.description?.trim()
  if (!description) return '未分组'
  const [source] = description.split(' — ')
  return source.trim() || '未分组'
}

export function normalizeTemplate(input: unknown): NormalizedRecordTemplate {
  const template = input as TemplateLike
  return {
    id: String(template.id || ''),
    name: String(template.name || ''),
    code: String(template.code || ''),
    description: String(template.description || ''),
    status: String(template.status || ''),
    fields: extractTemplateFields(template),
    sourceGroup: getTemplateSourceGroup(template),
  }
}

export function normalizeTemplatePage(page: BackendTemplatePage): PaginatedResult<NormalizedRecordTemplate> {
  const rawList = Array.isArray(page.data) ? page.data : Array.isArray(page.list) ? page.list : []
  const pageSize = page.pageSize ?? page.limit ?? rawList.length

  return {
    list: rawList.map(normalizeTemplate),
    total: page.total ?? rawList.length,
    page: page.page ?? 1,
    pageSize,
  }
}

export function sortTemplatesWithPinned<T extends { id: string; name?: string }>(items: T[], pinnedIds: string[]): T[] {
  const pinned = new Set(pinnedIds)
  return [...items].sort((left, right) => {
    const leftPinned = pinned.has(left.id)
    const rightPinned = pinned.has(right.id)
    if (leftPinned !== rightPinned) return leftPinned ? -1 : 1
    return String(left.name || '').localeCompare(String(right.name || ''), 'zh-Hans-CN')
  })
}
```

- [ ] **Step 5: 跑工具测试**

Run:

```bash
npm test --workspace mobile -- stationContext.spec.ts recordTemplate.spec.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

Run:

```bash
git add mobile/src/utils/stationContext.ts mobile/src/utils/recordTemplate.ts mobile/src/utils/__tests__/stationContext.spec.ts mobile/src/utils/__tests__/recordTemplate.spec.ts
git commit -m "feat: add station context and template adapters"
```

Expected: commit 成功。

### Task 6: 对齐移动端记录 API 到 `/records` 和全部 active 模板

**Files:**
- Modify: `mobile/src/api/record.ts`
- Modify: `mobile/src/types/index.ts`

- [ ] **Step 1: 修改记录 API 类型和模板查询**

Replace `mobile/src/api/record.ts` with:

```ts
/**
 * Record API module.
 * Uses backend /records and /record-templates; H5 and PC share the same data source.
 */
import { get, post } from '@/utils/request'
import type { FormField, PaginatedResult } from '@/types'
import { normalizeTemplatePage, type NormalizedRecordTemplate } from '@/utils/recordTemplate'

export type RecordTemplateItem = NormalizedRecordTemplate

export interface RecordListItem {
  id: string
  templateId: string
  template?: { id: string; name: string; code?: string }
  status: string
  dataJson: Record<string, unknown>
  filledById?: string
  filledBy?: { id: string; username: string; name?: string }
  filledAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface RecordListParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: string
  templateId?: string
}

export async function fetchTemplates(keyword = ''): Promise<RecordTemplateItem[]> {
  const result = await get<unknown>('/record-templates', {
    page: 1,
    pageSize: 1000,
    status: 'active',
    keyword,
  })
  return normalizeTemplatePage(result as Parameters<typeof normalizeTemplatePage>[0]).list
}

export async function fetchRecordList(
  params: RecordListParams = {},
): Promise<PaginatedResult<RecordListItem>> {
  const result = await get<PaginatedResult<RecordListItem> | { data: RecordListItem[]; total: number; page: number; limit: number }>(
    '/records',
    params as Record<string, unknown>,
  )

  if ('data' in result && Array.isArray(result.data)) {
    return {
      list: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.limit,
    }
  }

  return result as PaginatedResult<RecordListItem>
}

export async function fetchRecordDetail(id: string): Promise<RecordListItem> {
  return get<RecordListItem>(`/records/${id}`)
}

export async function submitRecord(
  templateId: string,
  dataJson: Record<string, unknown>,
): Promise<RecordListItem> {
  return post<RecordListItem>('/records', {
    templateId,
    dataJson,
    offlineFilled: false,
  })
}
```

- [ ] **Step 2: 确保分页类型兼容后端**

In `mobile/src/types/index.ts`, keep `PaginatedResult<T>` as:

```ts
/** Paginated response used by mobile adapters */
export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
```

This keeps mobile page code stable while `mobile/src/api/record.ts` adapts backend `{ data, limit }`.

- [ ] **Step 3: 验证不再调用旧 `/form-submissions`**

Run:

```bash
rg -n "form-submissions" mobile/src
```

Expected: 仍会在页面中匹配；下一 task 页面改完后必须变为无输出。

- [ ] **Step 4: Commit**

Run:

```bash
git add mobile/src/api/record.ts mobile/src/types/index.ts
git commit -m "fix: align mobile records api"
```

Expected: commit 成功。

### Task 7: 移除 H5 离线同步入口并接入工位首页

**Files:**
- Modify: `mobile/src/App.vue`
- Modify: `mobile/src/pages/index/index.vue`
- Modify: `mobile/src/pages/user/index.vue`

- [ ] **Step 1: 移除 App 全局离线监听**

Replace `mobile/src/App.vue` script with:

```vue
<script setup lang="ts">
onLaunch(() => {
  console.log('现场终端启动')
})

onShow(() => {
  console.log('现场终端显示')
})

onHide(() => {
  console.log('现场终端隐藏')
})
</script>
```

- [ ] **Step 2: 首页使用账号和工位上下文，不显示待同步数量**

In `mobile/src/pages/index/index.vue`, remove `useOfflineStore` import and all `pendingCount` UI. Use `userInfo.name` instead of `realName`:

```ts
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { normalizeStationContext } from '@/utils/stationContext'

const userStore = useUserStore()
const station = computed(() => normalizeStationContext(null))
const displayName = computed(() => userStore.userInfo?.name || userStore.userInfo?.username || '未登录')
```

Use these template bindings:

```vue
<text class="home-page__user-name">{{ displayName }}</text>
<text class="home-page__station">{{ station.stationName }} / {{ station.stationArea }}</text>
```

- [ ] **Step 3: 用户页移除离线同步菜单和逻辑**

In `mobile/src/pages/user/index.vue`, remove:

```ts
import { useOfflineStore } from '@/stores/offline'
```

Remove `offlineStore` creation, `pendingCount` badge, and `syncAll` dialog. Keep logout、profile display、change password entries.

- [ ] **Step 4: 验证离线 store 不再被页面使用**

Run:

```bash
rg -n "useOfflineStore|pendingCount|syncAll|待同步|离线" mobile/src/App.vue mobile/src/pages
```

Expected: 无输出。`mobile/src/stores/offline.ts` 和 `mobile/src/utils/sync.ts` 可以暂时保留为未使用文件；本阶段验收要求是 H5 页面不暴露离线填报行为。

- [ ] **Step 5: Commit**

Run:

```bash
git add mobile/src/App.vue mobile/src/pages/index/index.vue mobile/src/pages/user/index.vue
git commit -m "refactor: remove mobile offline entrypoints"
```

Expected: commit 成功。

### Task 8: 实现全部 active 模板可见的通用记录填写

**Files:**
- Modify: `mobile/src/pages/records/create.vue`

- [ ] **Step 1: 去掉离线提交分支**

In `mobile/src/pages/records/create.vue`, remove:

```ts
import { useOfflineStore } from '@/stores/offline'
```

Remove all calls or references to these identifiers:

```ts
offlineStore.initNetworkListener()
offlineStore.addToQueue
offlineStore.isOnline
```

Remove the offline banner template:

```vue
<view v-if="!offlineStore.isOnline" class="create-page__offline-banner">
  <text class="create-page__offline-text">当前处于离线状态，提交后将自动同步</text>
</view>
```

- [ ] **Step 2: 接入模板搜索、分组和置顶排序**

Use these imports and state:

```ts
import { computed, ref } from 'vue'
import { fetchTemplates, submitRecord, type RecordTemplateItem } from '@/api/record'
import { buildStationSource } from '@/utils/stationContext'
import { sortTemplatesWithPinned } from '@/utils/recordTemplate'

const templates = ref<RecordTemplateItem[]>([])
const keyword = ref('')
const pinnedTemplateIds = ref<string[]>(uni.getStorageSync('station:pinnedTemplates') || [])
const selectedTemplate = ref<RecordTemplateItem | null>(null)
const formData = ref<Record<string, unknown>>({})

const visibleTemplates = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  const filtered = text
    ? templates.value.filter((template) => {
        return [
          template.code,
          template.name,
          template.description,
          template.sourceGroup,
        ].some((value) => value.toLowerCase().includes(text))
      })
    : templates.value

  return sortTemplatesWithPinned(filtered, pinnedTemplateIds.value)
})

const groupedTemplates = computed(() => {
  return visibleTemplates.value.reduce<Record<string, RecordTemplateItem[]>>((groups, template) => {
    const group = template.sourceGroup
    groups[group] = groups[group] || []
    groups[group].push(template)
    return groups
  }, {})
})
```

- [ ] **Step 3: 默认加载全部 active 模板**

Use this loader:

```ts
async function loadTemplates(): Promise<void> {
  templates.value = await fetchTemplates(keyword.value)
}
```

Add a search submit handler:

```ts
async function handleSearch(): Promise<void> {
  await loadTemplates()
}
```

- [ ] **Step 4: 提交记录时写入来源上下文但不另建事实表**

Use this submit function:

```ts
async function handleSubmit(): Promise<void> {
  if (!selectedTemplate.value) {
    uni.showToast({ title: '请选择记录模板', icon: 'none' })
    return
  }

  await submitRecord(selectedTemplate.value.id, {
    ...formData.value,
    _source: buildStationSource(null),
  })

  uni.showToast({ title: '提交成功', icon: 'success' })
  uni.navigateBack()
}
```

The `_source` metadata is only audit/filter context. It must not replace product、material、batch、equipment、location IDs required by business fields.

- [ ] **Step 5: 模板 UI 明确显示全部 active 模板**

Use grouped rendering shape:

```vue
<input
  v-model="keyword"
  class="create-page__search"
  placeholder="搜索编号、名称、部门或来源"
  confirm-type="search"
  @confirm="handleSearch"
/>

<view v-for="(items, group) in groupedTemplates" :key="group" class="create-page__group">
  <text class="create-page__group-title">{{ group }}</text>
  <view
    v-for="template in items"
    :key="template.id"
    class="create-page__template"
    @click="selectTemplate(template)"
  >
    <text class="create-page__template-code">{{ template.code }}</text>
    <text class="create-page__template-name">{{ template.name }}</text>
  </view>
</view>
```

- [ ] **Step 6: 验证无离线提交和旧字段依赖**

Run:

```bash
rg -n "offlineStore|addToQueue|isOnline|\\.fieldsJson|form-submissions" mobile/src/pages/records/create.vue
```

Expected: 无输出。

- [ ] **Step 7: Commit**

Run:

```bash
git add mobile/src/pages/records/create.vue
git commit -m "feat: support station generic record entry"
```

Expected: commit 成功。

### Task 9: 记录查询页和详情页使用统一 `/records`

**Files:**
- Modify: `mobile/src/pages/records/list.vue`
- Modify: `mobile/src/pages/records/detail.vue`

- [ ] **Step 1: 列表页改用 `fetchRecordList`**

In `mobile/src/pages/records/list.vue`, replace direct `get('/form-submissions', params)` usage with:

```ts
import { fetchRecordList, type RecordListItem } from '@/api/record'

const records = ref<RecordListItem[]>([])

async function loadRecords(): Promise<void> {
  const result = await fetchRecordList({
    page: page.value,
    pageSize: pageSize.value,
    keyword: keyword.value,
    status: status.value,
    templateId: templateId.value,
  })

  records.value = result.list
  total.value = result.total
}
```

Display template name from shared record data:

```vue
<text class="records-list__record-title">{{ record.template?.name || record.templateId }}</text>
<text class="records-list__record-meta">{{ record.filledBy?.name || record.filledBy?.username || '未知人员' }}</text>
```

- [ ] **Step 2: 详情页改用 `fetchRecordDetail`**

In `mobile/src/pages/records/detail.vue`, replace direct `get('/form-submissions/${recordId}')` usage with:

```ts
import { fetchRecordDetail, type RecordListItem } from '@/api/record'

const record = ref<RecordListItem | null>(null)

async function loadRecord(recordId: string): Promise<void> {
  record.value = await fetchRecordDetail(recordId)
}
```

Render record data from `dataJson`:

```vue
<view v-for="(value, key) in record.dataJson" :key="key" class="record-detail__field">
  <text class="record-detail__label">{{ key }}</text>
  <text class="record-detail__value">{{ String(value) }}</text>
</view>
```

- [ ] **Step 3: 验证移动端无旧提交接口**

Run:

```bash
rg -n "form-submissions" mobile/src
```

Expected: 无输出。

- [ ] **Step 4: Commit**

Run:

```bash
git add mobile/src/pages/records/list.vue mobile/src/pages/records/detail.vue
git commit -m "fix: use unified records query in mobile"
```

Expected: commit 成功。

### Task 10: 清理微信环境变量说明和运行引用

**Files:**
- Modify: `.env.example` if present
- Modify: `server/.env.example` if present
- Modify: `mobile/.env.example`
- Search-only: `client/src/views/login/SsoLogin.vue`, `server/src/modules/auth/sso.*`, monitoring files

- [ ] **Step 1: 检查微信环境变量**

Run:

```bash
rg -n "WECHAT_APP_ID|WECHAT_APP_SECRET|WECHAT_TPL_|VITE_WEIXIN|WEIXIN_APPID" . server mobile client --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/coverage/**'
```

Expected: 只看到需要清理的小程序/订阅消息 env 示例，或看到企业微信 SSO/监控通道相关项。

- [ ] **Step 2: 删除小程序和订阅消息 env 示例**

Remove lines matching these keys from env example files:

```env
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_TPL_APPROVAL=
WECHAT_TPL_TASK=
VITE_WEIXIN_APPID=
```

Keep enterprise SSO keys only if they are used by `server/src/modules/auth/sso.service.ts` or `client/src/views/login/SsoLogin.vue`.

- [ ] **Step 3: 验证没有小程序/订阅消息配置残留**

Run:

```bash
rg -n "WECHAT_APP_ID|WECHAT_APP_SECRET|WECHAT_TPL_|VITE_WEIXIN|WEIXIN_APPID" . server mobile client --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/coverage/**'
```

Expected: 无小程序登录/订阅消息配置残留。企业微信 SSO 如仍存在，输出必须只指向 SSO 文件，不指向已删除的微信模块。

- [ ] **Step 4: Commit**

Run:

```bash
git add .env.example server/.env.example mobile/.env.example
git commit -m "chore: remove wechat mini program env config"
```

Expected: commit 成功。如果 `.env.example` 或 `server/.env.example` 不存在，`git add` 会提示路径不存在；改为只 add 实际存在的 env example 文件。

### Task 11: 端到端验证和残留扫描

**Files:**
- No code changes unless verification reveals a failure in files changed above.

- [ ] **Step 1: 运行后端 auth 测试**

Run:

```bash
npm test --workspace server -- auth.service.spec.ts --runInBand
```

Expected: PASS。

- [ ] **Step 2: 运行移动端工具测试**

Run:

```bash
npm test --workspace mobile -- authContract.spec.ts stationContext.spec.ts recordTemplate.spec.ts
```

Expected: PASS。

- [ ] **Step 3: 构建 H5**

Run:

```bash
npm run build:h5 -w mobile
```

Expected: H5 build succeeds. Build output can create `mobile/dist/`; do not commit generated dist unless repo already tracks it for this package.

- [ ] **Step 4: 运行后端 build**

Run:

```bash
npm run build:server
```

Expected: server TypeScript build succeeds without references to deleted WeChat service or Prisma model.

- [ ] **Step 5: 全局残留扫描**

Run:

```bash
rg -n "noidear-miniprogram|wechat/miniprogram|WechatLoginDto|wechatMiniProgramLogin|wechat_openid|WechatMessage|wechat_messages|VITE_WEIXIN|WEIXIN_APPID" package.json package-lock.json client server mobile --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/coverage/**' --glob '!server/src/prisma/schema.prisma.bak'
```

Expected: 只允许新 migration 的删除语句包含 `wechat_openid` 或 `wechat_messages`；其他匹配需要修掉后重新跑。

- [ ] **Step 6: 确认没有误提交本地产物**

Run:

```bash
git status --short
```

Expected: 只显示本计划范围内修改，或显示用户已有的无关脏文件。不要 stage `.env`、coverage、dist、playwright-report、test-results。

- [ ] **Step 7: 最终提交修复项**

If Step 1-6 forced small fixes, return to the task that owns the changed file and use that task's `git add` file list and commit message. If there are no fixes, do not create an empty commit.

```bash
git status --short
```

Expected: no uncommitted files from this implementation remain, except user-owned local files that were already dirty before this work.

## 自查

- Spec 覆盖：`miniprogram/` 删除由 Task 1 覆盖；微信登录/订阅消息/Prisma 清理由 Task 2-3 和 Task 10 覆盖；账号密码登录契约和 `/api/v1` 由 Task 4 覆盖；H5 工位、全部 active 模板、记录汇总同源由 Task 5-9 覆盖；验收扫描由 Task 11 覆盖。
- 数据边界：H5 和 PC 共用 `/records`、`/record-templates`、`RecordTemplate / Record`；计划没有新增 `mobile_records`、`station_records` 或独立模板表。
- 离线边界：页面入口和提交分支移除离线能力；后端已有 `offlineFilled` 字段不在本次 schema 中删除，因为它属于历史记录能力，不影响 H5 Phase 1 禁用离线入口。
- 微信边界：计划删除微信小程序登录和订阅消息模块；企业微信 SSO 和监控通知渠道只做调用链确认，不机械删除。
- 主数据边界：扫码输入只作为输入方式；涉及产品、物料、批次、设备、位置时仍要求保存主键 ID，不把扫码文本当主事实源。
