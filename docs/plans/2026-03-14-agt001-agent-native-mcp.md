# AGT-001 Agent-Native MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立 noidear-mcp server，让 Claude Code 通过约 10 个稳定工具全权操作整个系统（业务操作 + 运维诊断 + E2E 测试触发），新功能上线无需更新 MCP。

**Architecture:** MCP 定位为「API 代理 + 发现层」——`discover()` 动态读取 Swagger，`call_api()` 通用执行器覆盖所有端点，运维/测试工具集长期稳定。双模式认证：Admin（默认）+ 角色模式。

**Tech Stack:** Node.js 25 / TypeScript / `@modelcontextprotocol/sdk` / `axios` / `@playwright/test`

---

## 任务总览（19 Tasks）

| Task | 类型 | 内容 |
|------|------|------|
| T01 | Docs | llms.txt + BUSINESS_RULES.md + AGENT_GUIDE.md |
| T02 | MCP | 项目脚手架（package.json + tsconfig + index） |
| T03 | MCP | auth/token-manager.ts（双模式认证 + 自动刷新）|
| T04 | MCP | discover tool（读 Swagger，格式化输出）|
| T05 | MCP | call_api + call_api_as（通用执行器）|
| T06 | MCP | health_check + get_logs |
| T07 | MCP | query_db + restart_service + run_migration |
| T08 | MCP | run_tests + get_test_report（接入 Playwright）|
| T09 | Config | 注册 MCP 到 ~/.claude/settings.json |
| T10 | E2E | process-full.spec.ts（Step1→Step9）|
| T11 | E2E | process-draft.spec.ts（草稿保存/恢复）|
| T12 | E2E | process-approval.spec.ts（HACCP 审批 + 驳回）|
| T13 | E2E | warehouse-material.spec.ts（弹窗选料）|
| T14 | Swagger | process 模块语义化描述升级 |
| T15 | Swagger | warehouse 模块语义化描述升级 |
| T16 | BE | 机器可读错误码（process + warehouse 关键错误）|
| T17 | DB | AgentAction Prisma 模型 + migrate |
| T18 | BE | call_api 调用后自动写 AgentAction 记录 |
| T19 | Verify | 端到端验证：Claude MCP 完整走研发流程 |

---

## 执行顺序

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08   MCP 主线（串行）
T09                                                 注册 Claude Code（依赖 T08）
T10 ‖ T11 ‖ T12 ‖ T13                              E2E 测试（可并行）
T14 ‖ T15 ‖ T16                                    Swagger + 错误码（可并行）
T17 → T18                                           审计日志（串行）
T19                                                 端到端验证（全部完成后）
```

---

## T01：Knowledge Layer 文档

**Files:**
- 新建 `/llms.txt`（项目根目录）
- 新建 `docs/BUSINESS_RULES.md`
- 新建 `docs/AGENT_GUIDE.md`

**步骤：**

1. 创建 `/llms.txt`：
```
# noidear 质量管理系统 - Agent 入口

## 系统能力
- 产品研发9步流程（含 HACCP 审批）
- 仓库管理（物料/入库/出库/批次追溯/FIFO）
- 文档三级管理（创建/审批/归档/作废）

## API 入口
REST API:  http://localhost:3000/api/v1
文档:      http://localhost:3000/api/docs
认证:      POST /auth/login { username, password } → { access_token }

## MCP 工具
Server: noidear-mcp，工具见 docs/AGENT_GUIDE.md

## 关键约束（详见 docs/BUSINESS_RULES.md）
- 研发步骤必须顺序提交，stepNumber === currentStep
- Step7/8 需 HACCP/admin 角色审批
- 物料出库遵循 FIFO
```

2. 创建 `docs/BUSINESS_RULES.md`（业务规则，不可内嵌在代码里）：
```markdown
# 业务规则文档

## 研发流程规则
- 步骤顺序：必须从 Step1 开始，不可跳步
- 草稿：saveAsDraft=true 不推进 currentStep
- Step7/8：提交后等待 HACCP 审批，不自动推进
- 驳回：退回 1 步，数据保留
- 完成：Step9 提交后 status→COMPLETED，不可再编辑

## 仓库规则
- 出库 FIFO：系统自动选批次，不可手动指定
- 物料删除前提：库存为 0

## 权限规则
- admin：全部操作
- manager/HACCP：审批 Step7/8
- 普通用户：只能操作自己创建的记录

## 不可逆操作（调用前确认）
- DELETE /process/instances/:id
- POST /documents/:id/archive
- POST /documents/:id/obsolete
```

3. 创建 `docs/AGENT_GUIDE.md`：
```markdown
# Agent 操作指南

## 常用操作最短路径

### 走一遍研发流程
1. discover('process') 获取 API 列表
2. call_api('/process/templates/default', 'GET') 拿 templateId
3. call_api('/process/instances', 'POST', { templateId })
4. call_api('/process/instances/:id/steps', 'POST', { stepNumber:1, data:{...}, saveAsDraft:false })
5. 重复步骤4，stepNumber 递增至 9

### 查库存
call_api('/warehouse/materials', 'GET', null, { status:'active' })

### HACCP 审批
call_api_as('admin', '/process/instances/:id/approve', 'POST', { stepNumber:7, action:'approve' })

## 测试账号
- Admin: username=admin, password=（见 NOIDEAR_ADMIN_PASS 环境变量）
```

4. Commit: `docs: 新增 Agent 知识层（llms.txt + BUSINESS_RULES + AGENT_GUIDE）`

---

## T02：noidear-mcp 项目脚手架

**Files:**
- 新建 `tools/noidear-mcp/package.json`
- 新建 `tools/noidear-mcp/tsconfig.json`
- 新建 `tools/noidear-mcp/src/index.ts`

**步骤：**

1. 建目录：`mkdir -p tools/noidear-mcp/src/auth tools/noidear-mcp/src/tools tools/noidear-mcp/src/utils`

2. `tools/noidear-mcp/package.json`：
```json
{
  "name": "noidear-mcp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

3. `tools/noidear-mcp/tsconfig.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

4. `tools/noidear-mcp/src/index.ts` 骨架：
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'noidear-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// tools 注册表，T04-T08 逐步填充
export const tools: Record<string, { description: string; handler: (args: unknown) => Promise<unknown> }> = {};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.entries(tools).map(([name, { description }]) => ({
    name, description, inputSchema: { type: 'object', properties: {} }
  }))
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools[req.params.name];
  if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
  const result = await tool.handler(req.params.arguments ?? {});
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('noidear-mcp ready');
}
main().catch(console.error);
```

5. 安装依赖：`cd tools/noidear-mcp && npm install`
6. 验证编译：`npm run build` → 期望 0 errors
7. Commit: `feat(mcp): noidear-mcp 项目脚手架`

---

## T03：auth/token-manager.ts

**Files:**
- 新建 `tools/noidear-mcp/src/auth/config.ts`
- 新建 `tools/noidear-mcp/src/auth/token-manager.ts`

**步骤：**

1. `src/auth/config.ts`：
```typescript
export const CONFIG = {
  baseUrl: process.env.NOIDEAR_API_URL ?? 'http://localhost:3000/api/v1',
  adminUser: process.env.NOIDEAR_ADMIN_USER ?? 'admin',
  adminPass: process.env.NOIDEAR_ADMIN_PASS ?? 'admin123',
};
```

2. `src/auth/token-manager.ts`：
```typescript
import axios from 'axios';
import { CONFIG } from './config.js';

const cache = new Map<string, { token: string; expiresAt: number }>();

async function login(username: string, password: string) {
  const res = await axios.post(`${CONFIG.baseUrl}/auth/login`, { username, password });
  return res.data.access_token as string;
}

export const tokenManager = {
  async getAdminToken() {
    return this.getCachedToken('admin', CONFIG.adminUser, CONFIG.adminPass);
  },

  async getRoleToken(role: string) {
    const pass = process.env[`NOIDEAR_${role.toUpperCase()}_PASS`] ?? CONFIG.adminPass;
    return this.getCachedToken(role, role, pass);
  },

  async getCachedToken(key: string, user: string, pass: string) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;
    const token = await login(user, pass);
    cache.set(key, { token, expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000 });
    return token;
  }
};
```

3. 验证编译 + Commit: `feat(mcp): auth token-manager（双模式认证）`

---

## T04：discover tool

**Files:**
- 新建 `tools/noidear-mcp/src/tools/discover.ts`
- 修改 `tools/noidear-mcp/src/index.ts`

**步骤：**

1. `src/tools/discover.ts`：
```typescript
import axios from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

export async function discover(args: { module?: string }) {
  const token = await tokenManager.getAdminToken();
  const docsUrl = CONFIG.baseUrl.replace('/api/v1', '') + '/api/docs-json';
  const { data: spec } = await axios.get(docsUrl, { headers: { Authorization: `Bearer ${token}` } });

  const results: Array<{ path: string; method: string; summary: string }> = [];
  for (const [path, methods] of Object.entries(spec.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get','post','put','patch','delete'].includes(method)) continue;
      if (args.module) {
        const tags = op.tags ?? [];
        if (!tags.some(t => t.toLowerCase().includes(args.module!.toLowerCase()))) continue;
      }
      results.push({ path, method: method.toUpperCase(), summary: op.summary ?? '' });
    }
  }
  return { total: results.length, module: args.module ?? 'all', endpoints: results.slice(0, 60) };
}
```

2. 在 `index.ts` 中注册：
```typescript
import { discover } from './tools/discover.js';
tools['discover'] = { description: '读取 Swagger，返回当前系统所有可用 API，新功能自动感知', handler: (a) => discover(a as { module?: string }) };
```

3. 编译验证 + Commit: `feat(mcp): discover tool`

---

## T05：call_api + call_api_as

**Files:**
- 新建 `tools/noidear-mcp/src/tools/call-api.ts`
- 修改 `tools/noidear-mcp/src/index.ts`

**步骤：**

1. `src/tools/call-api.ts`：
```typescript
import axios, { AxiosError } from 'axios';
import { CONFIG } from '../auth/config.js';
import { tokenManager } from '../auth/token-manager.js';

async function exec(token: string, path: string, method: string, body?: unknown, query?: unknown) {
  try {
    const res = await axios({ url: `${CONFIG.baseUrl}${path}`, method,
      headers: { Authorization: `Bearer ${token}` }, data: body, params: query });
    return { success: true, status: res.status, data: res.data };
  } catch (err) {
    const e = err as AxiosError;
    return { success: false, status: e.response?.status, error: e.response?.data ?? e.message };
  }
}

export const callApi = (a: { path: string; method: string; body?: unknown; query?: unknown }) =>
  tokenManager.getAdminToken().then(t => exec(t, a.path, a.method, a.body, a.query));

export const callApiAs = (a: { role: string; path: string; method: string; body?: unknown }) =>
  tokenManager.getRoleToken(a.role).then(t => exec(t, a.path, a.method, a.body));
```

2. 注册到 index.ts + Commit: `feat(mcp): call_api + call_api_as（通用 API 执行器）`

---

## T06：health_check + get_logs

**Files:**
- 新建 `tools/noidear-mcp/src/tools/devops.ts`
- 修改 `tools/noidear-mcp/src/index.ts`

**步骤：**

1. `src/tools/devops.ts`（前两个工具）：
```typescript
import { execSync } from 'child_process';
import axios from 'axios';
import { CONFIG } from '../auth/config.js';

export async function healthCheck() {
  const services: Record<string, string> = {};
  const dockerChecks = [
    { name: 'postgres', cmd: 'docker exec noidear-postgres pg_isready -U noidear' },
    { name: 'redis', cmd: 'docker exec noidear-redis redis-cli ping' },
  ];
  for (const c of dockerChecks) {
    try { execSync(c.cmd, { stdio: 'pipe' }); services[c.name] = 'healthy'; }
    catch { services[c.name] = 'unhealthy'; }
  }
  for (const [name, url] of [['server', `${CONFIG.baseUrl}/health`], ['client', 'http://localhost']] as [string, string][]) {
    try { await axios.get(url, { timeout: 3000 }); services[name] = 'healthy'; }
    catch { services[name] = 'unhealthy'; }
  }
  const overall = Object.values(services).every(s => s === 'healthy') ? 'all healthy' : 'some unhealthy';
  return { overall, services };
}

export function getLogs(a: { service: string; lines?: number; level?: string }) {
  const container = `noidear-${a.service}`;
  try {
    const raw = execSync(`docker logs ${container} --tail ${a.lines ?? 50} 2>&1`).toString();
    const lines = raw.split('\n');
    if ((a.level ?? 'error') === 'all') return { lines };
    const filtered = lines.filter(l => /error|warn/i.test(l));
    return { total: lines.length, filtered: filtered.length, logs: filtered };
  } catch (err) { return { error: String(err) }; }
}
```

2. 注册 + Commit: `feat(mcp): health_check + get_logs tools`

---

## T07：query_db + restart_service + run_migration

**Files:**
- 修改 `tools/noidear-mcp/src/tools/devops.ts`（追加）

**步骤：**

1. 追加到 devops.ts：
```typescript
export function queryDb(a: { sql: string }) {
  if (!a.sql.trim().toLowerCase().startsWith('select'))
    return { error: 'Only SELECT allowed', rejected: a.sql };
  try {
    const result = execSync(
      `docker exec noidear-postgres psql -U noidear -d document_system -c "${a.sql.replace(/"/g, '\\"')}" 2>&1`
    ).toString();
    return { result };
  } catch (err) { return { error: String(err) }; }
}

export function restartService(a: { service: string }) {
  const allowed = ['server', 'client', 'redis'];
  if (!allowed.includes(a.service)) return { error: `allowed: ${allowed.join(', ')}` };
  try { execSync(`docker restart noidear-${a.service}`); return { success: true }; }
  catch (err) { return { error: String(err) }; }
}

export function runMigration() {
  try {
    const out = execSync(
      'cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx prisma migrate deploy --schema=src/prisma/schema.prisma 2>&1'
    ).toString();
    return { success: true, output: out };
  } catch (err) { return { error: String(err) }; }
}
```

2. 注册全部 devops 工具 + Commit: `feat(mcp): query_db + restart_service + run_migration`

---

## T08：run_tests + get_test_report

**Files:**
- 新建 `tools/noidear-mcp/src/tools/testing.ts`

**步骤：**

1. `src/tools/testing.ts`：
```typescript
import { spawnSync } from 'child_process';
import * as fs from 'fs';

const REPORT = '/tmp/noidear-e2e-report.json';
const CLIENT = '/Users/jiashenglin/Desktop/好玩的项目/noidear/client';
const FLOWS: Record<string, string> = {
  all: '**/*.spec.ts', auth: 'login-smoke.spec.ts',
  process: 'flows/process-*.spec.ts', warehouse: 'flows/warehouse-*.spec.ts',
};

export function runTests(a: { flow?: string }) {
  const pattern = FLOWS[a.flow ?? 'all'] ?? FLOWS['all'];
  const r = spawnSync('npx', ['playwright', 'test', pattern, `--reporter=json`],
    { cwd: CLIENT, encoding: 'utf8', timeout: 120_000,
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: REPORT } });
  try {
    const rep = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    const passed = rep.stats?.expected ?? 0;
    const failed = rep.stats?.unexpected ?? 0;
    return { passed, failed, flow: a.flow ?? 'all' };
  } catch { return { stdout: r.stdout?.slice(0, 1000), stderr: r.stderr?.slice(0, 500) }; }
}

export function getTestReport() {
  if (!fs.existsSync(REPORT)) return { error: 'No report. Run run_tests() first.' };
  const rep = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  return { passed: rep.stats?.expected ?? 0, failed: rep.stats?.unexpected ?? 0 };
}
```

2. 注册 + 全量编译验证 + Commit: `feat(mcp): run_tests + get_test_report tools`

---

## T09：注册 MCP 到 Claude Code

**Files:**
- 修改 `~/.claude/settings.json`

**步骤：**

1. 构建 MCP：`cd tools/noidear-mcp && npm run build`
2. 读取 ~/.claude/settings.json，在 `mcpServers` 中添加：
```json
"noidear-mcp": {
  "command": "node",
  "args": ["/Users/jiashenglin/Desktop/好玩的项目/noidear/tools/noidear-mcp/dist/index.js"],
  "env": {
    "NOIDEAR_API_URL": "http://localhost:3000/api/v1",
    "NOIDEAR_ADMIN_USER": "admin",
    "NOIDEAR_ADMIN_PASS": "admin123"
  }
}
```
3. 重启 Claude Code，执行 `/mcp` 确认 `noidear-mcp` 已连接且工具列表可见
4. Commit: `feat(mcp): 注册 noidear-mcp 到 Claude Code`

---

## T10：process-full.spec.ts

**Files:**
- 新建 `client/e2e/helpers/process-helper.ts`
- 新建 `client/e2e/flows/process-full.spec.ts`

**步骤：**

1. `e2e/helpers/process-helper.ts`：
```typescript
import { Page } from '@playwright/test';
export async function loginAdmin(page: Page) {
  await page.goto('http://localhost');
  await page.fill('input[placeholder*="用户名"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}
export async function createProcess(page: Page) {
  await page.goto('http://localhost/process');
  await page.click('button:has-text("新建研发流程")');
  await page.waitForURL('**/process/instances/**');
  return page.url().split('/instances/').pop()!;
}
```

2. `e2e/flows/process-full.spec.ts`：
```typescript
import { test, expect } from '@playwright/test';
import { loginAdmin, createProcess } from '../helpers/process-helper';
test('Step1 提交后跳转到 Step2', async ({ page }) => {
  await loginAdmin(page);
  await createProcess(page);
  await page.waitForSelector('text=产品研发与立项申请');
  await page.fill('input[placeholder*="蛋糕"]', 'E2E测试产品');
  await page.click('label:has-text("全蛋工艺")');
  await page.click('button:has-text("提交")');
  await expect(page.locator('text=设计输入')).toBeVisible({ timeout: 8000 });
});
```

3. 运行：`npx playwright test flows/process-full.spec.ts --headed`
4. Commit: `test(e2e): process-full Step1 提交和跳转测试`

---

## T11-T13：剩余 E2E 测试

同 T10 模式，分别实现：
- T11: `flows/process-draft.spec.ts` — 草稿保存后在列表可见
- T12: `flows/process-approval.spec.ts` — Step7 审批通过/驳回
- T13: `flows/warehouse-material.spec.ts` — 弹窗选料流程

每个完成后运行验证并 Commit。

---

## T14-T15：Swagger 语义化升级

**Files:**
- 修改 `server/src/modules/process/process.controller.ts`
- 修改 `server/src/modules/warehouse/material.controller.ts`

将每个 `@ApiOperation({ summary: '...' })` 扩展为：
```typescript
@ApiOperation({
  summary: '简短描述',
  description: '业务语义: ...\n前置条件: ...\n副作用: ...'
})
```

升级后 `npm run build` 验证，Commit。

---

## T16：机器可读错误码

**Files:**
- 新建 `server/src/common/errors/business-errors.ts`
- 修改 `server/src/modules/process/process.service.ts`

1. `src/common/errors/business-errors.ts`：
```typescript
export const BusinessError = {
  wrongStep: (current: number, attempted: number) => ({
    code: 'PROCESS_WRONG_STEP', message: '步骤不匹配',
    context: { current, attempted }, fix: `请先完成 step ${current}`
  }),
  insufficientRole: (required: string) => ({
    code: 'AUTH_INSUFFICIENT_ROLE', message: '权限不足',
    context: { required }, fix: `需要 ${required} 角色`
  }),
};
```

2. 在 process.service.ts 的 ForbiddenException 中使用：
```typescript
throw new ForbiddenException(BusinessError.wrongStep(instance.currentStep, dto.stepNumber));
```

3. `npm run build` 验证 + Commit: `feat(be): 机器可读错误码规范`

---

## T17：AgentAction 数据库模型

**Files:**
- 修改 `server/src/prisma/schema.prisma`

1. 追加 model：
```prisma
model AgentAction {
  id         String   @id @default(cuid())
  timestamp  DateTime @default(now())
  tool       String
  path       String?
  method     String?
  result     String
  errorCode  String?
  executedAs String
  durationMs Int
  @@index([timestamp])
}
```

2. 执行 migrate：
```bash
cd server && npx prisma migrate dev --name add-agent-action --schema=src/prisma/schema.prisma
```

3. Commit: `feat(db): 新增 AgentAction 审计日志模型`

---

## T18：MCP 调用自动记录 AgentAction

**Files:**
- 修改 `tools/noidear-mcp/src/tools/call-api.ts`

在 `exec()` 函数结束时，调用 `POST /agent-actions`（需先在后端创建此端点）记录操作。

后端新增 POST /agent-actions 端点（简单 create）：
```typescript
// server/src/modules/agent/agent.controller.ts
@Post('agent-actions')
record(@Body() dto: { tool: string; path?: string; result: string; durationMs: number; executedAs: string }) {
  return this.prisma.agentAction.create({ data: { ...dto } });
}
```

---

## T19：端到端验证

**步骤：**

1. 确认服务运行：`docker ps | grep noidear`
2. 在 Claude Code 执行：
```
/mcp 确认 noidear-mcp 已连接
```
3. 逐步调用：
   - `discover()` → 看到 process/warehouse API
   - `health_check()` → all healthy
   - `call_api('/process/templates/default', 'GET')` → 拿到 templateId
   - `call_api('/process/instances', 'POST', { templateId })` → 拿到 instanceId
   - `call_api('/process/instances/<id>/steps', 'POST', { stepNumber:1, data:{productName:'MCP验证',processType:'全蛋工艺'}, saveAsDraft:false })`
   - 验证 `call_api('/process/instances/<id>', 'GET')` → currentStep 变为 2
4. `run_tests('process')` → 查看 E2E 报告
5. Commit: `feat: AGT-001 Agent-Native MCP 完整实现验证通过`

