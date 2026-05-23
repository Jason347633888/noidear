# noidear-chat CLI 完整设计

**日期：** 2026-05-22
**状态：** 完整设计，待按 implementation plan 执行
**目标：** 构建 `noidear-chat`，让 Claude Code、Codex、OpenCode 等 AI Agent 通过稳定 CLI 安全操作 noidear 食品安全管理系统。

---

## 一句话说明

`noidear-chat` 不是聊天机器人，也不是 REPL。Agent 负责理解用户的话，CLI 负责把已经明确的操作变成可校验、可确认、可审计、可恢复的 noidear API 调用。

它要解决的问题是：Agent 不猜接口字段、不绕过权限、不把危险写操作静默执行、不把输出写成无法解析的散文，也不再依赖已退役的 `tools/noidear-mcp`。

---

## 当前决策

1. 不造 REPL。AI Agent 是对话层，`noidear-chat` 是命令执行层。
2. 不保留旧 MCP。`tools/noidear-mcp` 已退役，CLI 不依赖它、不复用它的命令、环境变量、审计表或包名。
3. 不绕过后端权限。所有业务操作都走 noidear REST API + JWT + 当前用户权限。
4. 写操作必须可追踪。CLI 写操作必须有服务端 Agent/CLI 审计，本地 run 记录只能作为补充。
5. 命令能力一次设计成型：Shortcut、API Commands、Raw API 三层都纳入同一版架构。不是先做一层再以后补设计。
6. Shortcut 采用 frontend-derived registry：先尽量从前端菜单、路由、页面按钮、页面方法和 API 封装推导完整草稿；risk、确认门、dry-run、恢复和 E2E 作为生成字段，不作为前置阻塞。
7. 参考 `larksuite/cli` 的 Agent-native 经验，但不照搬飞书 OAuth、bot/user 身份模型或开放平台 scope 模型。noidear 使用自己的 JWT、RBAC、companyId 和审计边界。

---

## 运行边界

```text
用户
  -> Claude Code / Codex / OpenCode       # 对话层：理解意图、向用户确认风险
  -> noidear-chat                         # 工具层：鉴权、profile、schema、校验、dry-run、执行、结构化输出
  -> noidear REST API                     # 业务层：权限、事务、审计、数据一致性
  -> PostgreSQL
```

`noidear-chat` 不直接访问数据库，不执行 Prisma，不读取服务端内部模块文件作为运行时事实源。运行时事实来自后端 API、OpenAPI 产物和随 CLI 发布的 operation registry。

---

## 当前代码事实

- API 全局前缀：`/api/v1`。
- Swagger UI：`/api/docs`。
- Swagger JSON：`/api/docs-json`，不是 `/api-json`。
- 生产环境默认不启用 Swagger，除非 `SWAGGER_ENABLED=true`。
- 响应成功时由 `ResponseInterceptor` 包装为 `{ code, message, data }`。
- 错误由 `HttpExceptionFilter` 输出 `{ code, message, details, path, timestamp }`。
- 登录接口：`POST /api/v1/auth/login`，返回 `{ token, user }`。
- 当前用户接口：`GET /api/v1/auth/profile`。
- 当前没有 refresh token endpoint，CLI 不能承诺无凭据自动续期。
- JWT payload 必须包含 `companyId`。
- 食品安全核心事实源必须使用当前模型名，例如 `MaterialBatch`、`BatchMaterialUsage`、`ProductionBatch`，不能新建平行主数据或批次事实源。

---

## 包与目录

新增独立 workspace：

```text
tools/noidear-chat/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── main.ts
│   ├── cmd/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── schema.ts
│   │   ├── operations.ts
│   │   ├── service-commands.ts
│   │   ├── shortcuts.ts
│   │   └── update.ts
│   ├── internal/
│   │   ├── audit.ts
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   ├── input.ts
│   │   ├── notices.ts
│   │   ├── openapi.ts
│   │   ├── operation-registry.ts
│   │   ├── output.ts
│   │   ├── profile.ts
│   │   ├── risk.ts
│   │   └── schema-renderer.ts
│   ├── shortcuts/
│   │   ├── checkpoint.ts
│   │   ├── runner.ts
│   │   └── domains/
│   │       ├── batch-recall.ts
│   │       ├── document-approval.ts
│   │       ├── environment-record.ts
│   │       └── incoming-inspection.ts
│   ├── generated/
│   │   └── operation-registry.json
│   └── skills/
│       ├── noidear-shared/SKILL.md
│       ├── noidear-quality-records/SKILL.md
│       ├── noidear-warehouse/SKILL.md
│       ├── noidear-traceability/SKILL.md
│       └── noidear-document-control/SKILL.md
└── test/
```

根 `package.json` 增加 `tools/noidear-chat` workspace 和 `build:chat`、`test:chat` 脚本。`verify:full` 可以纳入 `build:chat`，但不能恢复 `build:mcp` 或 `tools/noidear-mcp`。

---

## 三层命令体系

### Shortcut

Shortcut 是给人和 Agent 用的高层业务编排，命令以 `+` 开头：

```bash
noidear-chat +environment-record --location-id area-1 --record-type temperature_humidity --temperature 23 --humidity 65 --production-batch-id batch-1
noidear-chat +incoming-inspection --material-batch-id mb-1 --result pass
noidear-chat +batch-recall --production-batch-id pb-1 --dry-run
noidear-chat +document-approval --document-id doc-1 --submit
```

Shortcut 只能覆盖已经完整建模的业务流程。每个 shortcut 必须定义：

- 业务目的和适用边界。
- 必须引用的 noidear 模型。
- 需要调用的 operationId 列表。
- risk 和确认规则。
- dry-run 输出。
- checkpoint/resume 规则。
- 幂等键规则。
- dry-run E2E 和 live E2E。

### API Commands

API Commands 是从 operation registry 生成的中层命令，一条命令对应一个稳定 operationId：

```bash
noidear-chat environment-records create --data @record.json --reason "日常环境监测补录"
noidear-chat incoming-inspections list --params '{"page":1,"limit":20}'
noidear-chat traceability backward --params '{"productionBatchId":"pb-1"}'
```

API Commands 解决“字段太多但仍想结构化调用”的场景。它们比 Raw API 更适合 Agent，因为命令名、schema、risk、权限提示和输出结构都稳定。

### Raw API

Raw API 是兜底能力，用于调用 registry 未覆盖或尚未封装成 service command 的接口：

```bash
noidear-chat api GET /environment-records --params '{"page":1}'
noidear-chat api POST /api/v1/environment-records --data @record.json --reason "日常环境监测补录"
```

`api <path>` 接受 `/environment-records` 和 `/api/v1/environment-records` 两种写法。CLI 内部统一规范化为 `/api/v1/...`，输出中保留最终请求路径。

Agent 使用 Raw API 前必须先运行 `schema`，不能猜 DTO 字段。

---

## 基础命令

```bash
# profile
noidear-chat profile add <name> --server http://localhost:3000
noidear-chat profile list
noidear-chat profile use <name>
noidear-chat profile current
noidear-chat profile remove <name>

# auth
noidear-chat auth login [--profile <name>]
noidear-chat auth status [--profile <name>]
noidear-chat auth check [--operation <operation-id>]
noidear-chat auth logout [--profile <name>]

# discovery
noidear-chat operations [--module <name>] [--risk read|write|transition|destructive]
noidear-chat schema <operation-id-or-command>

# execution
noidear-chat <module> <resource-or-action> [flags]
noidear-chat api <METHOD> <path> [--params <json|@file|->] [--data <json|@file|->]
noidear-chat +<shortcut-name> [flags]

# update
noidear-chat update [--from-server] [--from-file <openapi.json>]
```

`auth check` 对当前 noidear 的含义是：

- 调用 `/api/v1/auth/profile` 验证 token 有效、用户和 `companyId` 存在。
- 如果传入 `--operation`，根据本地 registry 显示该 operation 的权限提示和 risk；真正权限仍以后端执行结果为准。
- 未来如果后端提供权限探测接口，`auth check --operation` 再接入服务端判断。

---

## 全局 Flags

| Flag | 说明 |
|---|---|
| `--profile <name>` | 使用指定 server/user profile；默认读取当前 profile |
| `--format json|table|pretty|ndjson|csv` | 默认 `json`；Agent 默认使用 `json` |
| `--dry-run` | 输出将执行的 HTTP 请求、risk、确认要求、审计摘要，不发送业务请求 |
| `--yes` | 用户已在对话层明确确认后，跳过 CLI 交互确认 |
| `--reason <text>` | 写操作原因，进入服务端审计 |
| `--session-id <id>` | Agent 会话 ID，进入服务端审计与本地 checkpoint |
| `--idempotency-key <key>` | 写操作幂等键；shortcut 自动生成 |
| `--page-all` | 自动翻页读取全部结果 |
| `--page-size <N>` | 每页数量 |
| `--page-limit <N>` | 自动翻页最多页数 |
| `--page-delay-ms <N>` | 自动翻页间隔 |
| `--jq <expr>` / `-q <expr>` | jq 表达式过滤 JSON 输出 |
| `--strict` | 缺少 registry、schema、risk 或 permission 元数据时拒绝执行写操作 |

`--yes` 只表示用户确认过风险，不表示绕过后端权限、审批或业务校验。

---

## 输入规则

`--data` 和 `--params` 支持三种输入：

```bash
--data '{"name":"x"}'
--data @payload.json
--data -
```

安全要求：

- `@file` 必须做路径安全校验，拒绝目录、不可读文件和明显敏感路径。
- `-` 只从 stdin 读取一次。
- JSON 解析失败时返回结构化错误，包含字段名和修复建议。
- 不把 token、密码或完整敏感请求体打印到 stderr。

---

## Profile 与鉴权

配置目录：

```text
~/.noidear-chat/
├── config.json
├── profiles/
│   └── local.json
└── runs/
```

profile 示例：

```json
{
  "name": "local",
  "server": "http://localhost:3000",
  "apiPrefix": "/api/v1",
  "token": "<jwt>",
  "tokenExpiresAt": "2026-05-23T10:00:00Z",
  "user": {
    "id": "user-1",
    "username": "admin",
    "companyId": "company-1"
  },
  "defaultFormat": "json"
}
```

安全要求：

- 类 Unix 下配置文件权限为 `0600`，目录权限为 `0700`。
- 不保存密码。
- 不伪造 token 续期。token 过期或快过期时提示重新 `auth login`。
- CI/自动化可通过 `NOIDEAR_CHAT_SERVER`、`NOIDEAR_CHAT_TOKEN`、`NOIDEAR_CHAT_PROFILE` 注入。
- 不引入飞书式 `--as bot/user`。如果未来需要服务账号，必须按 noidear 后端认证模型另行设计。

---

## Operation Registry

OpenAPI 只解决“接口结构”，不能直接解决“Agent 该如何安全调用”。CLI 必须维护 operation registry：

```json
{
  "environment-records.create": {
    "command": ["environment-records", "create"],
    "method": "POST",
    "path": "/api/v1/environment-records",
    "module": "environment-records",
    "summary": "创建环境监测记录",
    "risk": "write",
    "bodySchemaRef": "#/components/schemas/CreateEnvironmentRecordDto",
    "querySchemaRef": null,
    "responseSchemaRef": "#/components/schemas/EnvironmentRecordResponse",
    "requiresAuth": true,
    "requiresConfirmation": false,
    "permissions": ["environment-record:create"],
    "pagination": null,
    "upload": false,
    "idempotency": "client-key-required",
    "audit": "required"
  }
}
```

生成规则：

1. 优先从 `/api/docs-json` 或 `--from-file` 读取 OpenAPI。
2. 若 OpenAPI operationId 缺失或不稳定，用 `method + normalized path` 生成稳定 ID，再由 `overrides/*.json` 提供 alias。
3. `@Controller` prefix 只能作为 module 猜测，不能作为唯一事实源。
4. `@ApiTags` 可辅助描述，但不能作为覆盖判断依据。
5. `risk`、`requiresConfirmation`、`permissions`、`idempotency`、`responseSchemaRef` 必须允许人工 overrides。
6. registry 生成后做快照测试，避免 DTO 字段漂移时静默改命令。

生产环境默认没有 `/api/docs-json`。生产部署可选择：

- 随 CLI 包发布 `generated/operation-registry.json`。
- 从 CI 构建产物导出 OpenAPI 文件，再运行 `noidear-chat update --from-file openapi.json`。
- 临时开启 `SWAGGER_ENABLED=true` 后运行 `noidear-chat update --from-server`，完成后关闭。

---

## Schema 命令

Agent 调用任何 API Command 或 Raw API 前必须先查 schema：

```bash
noidear-chat schema environment-records.create --format json
```

JSON 输出包含：

```json
{
  "ok": true,
  "operationId": "environment-records.create",
  "method": "POST",
  "path": "/api/v1/environment-records",
  "risk": "write",
  "requiresAuth": true,
  "requiresConfirmation": false,
  "permissions": ["environment-record:create"],
  "idempotency": "client-key-required",
  "request": {
    "params": null,
    "query": null,
    "body": {
      "required": ["location_id", "record_type", "is_within_spec", "production_batch_id"],
      "properties": {
        "location_id": { "type": "string" },
        "record_type": { "type": "string", "enum": ["temperature_humidity", "pressure_differential", "other"] },
        "temperature": { "type": "number" },
        "humidity": { "type": "number" },
        "pressure_diff": { "type": "number" },
        "is_within_spec": { "type": "boolean" },
        "abnormal_action": { "type": "string" },
        "production_batch_id": { "type": "string" }
      }
    }
  },
  "response": {
    "wrappedByNoidear": true,
    "successEnvelope": "{ code, message, data }",
    "errorEnvelope": "{ code, message, details, path, timestamp }"
  }
}
```

如果 OpenAPI 缺字段说明、枚举、risk 或权限，先通过 overrides 补足，不允许让 Agent 自行推断。

---

## 输出合同

Agent 默认使用 `--format json`。JSON 成功输出只写 stdout：

```json
{
  "ok": true,
  "operationId": "environment-records.create",
  "method": "POST",
  "path": "/api/v1/environment-records",
  "status": 201,
  "data": {},
  "audit": {
    "sessionId": "agent-session-1",
    "idempotencyKey": "idem-1",
    "serverAuditId": "audit-1"
  },
  "_notice": {
    "update": null,
    "skills": null,
    "registry": null
  }
}
```

错误输出只写 stderr，并使用结构化 JSON：

```json
{
  "ok": false,
  "operationId": "environment-records.create",
  "method": "POST",
  "path": "/api/v1/environment-records",
  "status": 400,
  "error": {
    "type": "validation_error",
    "code": 400001,
    "message": "参数错误",
    "details": {},
    "hint": "Run: noidear-chat schema environment-records.create"
  }
}
```

规则：

- stdout 是数据，stderr 是错误、进度、警告和 hint。
- `--format table|pretty|csv|ndjson` 只影响成功数据的渲染，不改变错误 envelope。
- Agent 解析错误时看 exit code 和 stderr JSON，不从自然语言日志里猜。
- 任何 progress、update notice、skill notice 都不能混入 stdout 的数据流。

---

## Exit Codes

| Code | 含义 |
|---:|---|
| 0 | 成功 |
| 1 | 未分类错误 |
| 2 | CLI 用法错误或 JSON 参数解析失败 |
| 3 | 未登录、token 失效或 profile 不存在 |
| 4 | 后端返回权限不足 |
| 5 | schema 校验失败 |
| 6 | 网络或 server origin 不可达 |
| 7 | 后端 5xx |
| 8 | 幂等冲突、checkpoint 冲突或并发锁冲突 |
| 10 | 需要用户确认，未带 `--yes` |

`10` 是门禁，不是普通失败。Agent 看到 `confirmation_required` 时必须把风险动作和关键参数展示给用户，得到明确同意后才在原 argv 末尾追加 `--yes` 重试。

---

## 审计与确认

写操作 risk：

| Risk | 示例 | 默认行为 |
|---|---|---|
| `read` | 查询、schema、列表 | 直接执行 |
| `write` | 新增记录、上传附件 | 可直接执行，但必须记录 reason/session/idempotency |
| `transition` | 提交审批、完成、归档、作废 | 需要 `--yes` 或交互确认 |
| `destructive` | 删除、永久删除、取消召回 | 需要 `--yes`、`--reason` 和二次确认文本 |

服务端新增能力：

```text
POST /api/v1/agent-cli-actions
PATCH /api/v1/agent-cli-actions/:id/finish
GET /api/v1/agent-cli-actions
```

审计记录至少包含：

- userId
- companyId
- sessionId
- operationId
- method
- path
- requestHash
- risk
- reason
- idempotencyKey
- status
- httpStatus
- result
- errorCode
- durationMs

执行规则：

1. CLI 写操作先创建审计 `started` 记录，再发业务请求，再更新审计为 `succeeded` 或 `failed`。
2. `transition` 和 `destructive` 如果审计前置失败，不执行。
3. `write` 如果审计失败，默认也拒绝执行；只有显式 `--allow-local-audit-only` 才可降级，但该 flag 不进入 Agent 默认技能。
4. 旧 MCP 的 `AgentAction` / `agent_actions` 不复用。新模型命名为 `AgentCliAction`，表名为 `agent_cli_actions`。

---

## Dry-run

`--dry-run` 必须输出完整预览，但不发送业务请求：

```json
{
  "ok": true,
  "dryRun": true,
  "operationId": "environment-records.create",
  "request": {
    "method": "POST",
    "url": "http://localhost:3000/api/v1/environment-records",
    "params": null,
    "body": {
      "location_id": "area-1",
      "record_type": "temperature_humidity"
    }
  },
  "risk": {
    "level": "write",
    "requiresConfirmation": false
  },
  "audit": {
    "wouldCreateServerAudit": true,
    "sessionId": "agent-session-1",
    "idempotencyKey": "idem-1"
  }
}
```

对 `transition` 和 `destructive`，dry-run 不触发确认门。它的作用就是让 Agent 先把真实请求预览给用户看。

---

## Shortcuts

Shortcut 是业务编排，不是自然语言解析器。Agent 负责把用户意图转成确定参数，Shortcut 负责执行确定流程。

Shortcut 不只覆盖少数示例。完整目标是：所有后端 API 先通过 Raw API 和 API Commands 覆盖；所有能从前端页面操作推导出来的业务闭环进入 frontend-derived shortcut registry。当前覆盖基线见：

```text
docs/superpowers/specs/2026-05-22-cli-api-shortcut-coverage-matrix.md
```

shortcut registry 至少覆盖这些菜单域：

| 菜单域 | Shortcut 方向 |
|---|---|
| 工作执行 | 待办、待填任务、审批处理、工作台摘要 |
| 文控与审批 | 文件创建/修订/提交/发布、记录表单落地、审批历史 |
| 生产执行 | 记录填报、任务配置、领料、车间暂存、偏差 |
| 产品研发 | 产品主数据、研发流程、步骤提交、工艺变更 |
| 质量与合规 | CCP、不合格、CAPA、客诉、召回、供应商评估、变更 |
| 设备与现场 | 设备报修、维保、环境记录、过程记录、金属探测、清洁、校准、访客、废弃物 |
| 追溯与批次 | 生产批次、投料、追溯、物料平衡、来料检验 |
| 仓库管理 | 物料、供应商、入库、退料、报废 |
| 培训 | 计划、项目、题库、考试、档案 |
| 数据分析 | 统计、偏差分析、审计导出、追溯导出 |
| 系统治理 | 用户、角色、权限、通知、搜索、审计 |

未被前端推导出来的业务仍可通过 API Commands 或 Raw API 调用。frontend-derived shortcut registry 允许先生成带 `confidence`、`sourceEvidence`、`reviewNotes` 的草稿；risk、确认门、审计、幂等、checkpoint、dry-run 样例和 live E2E 样例必须作为字段存在，但缺失时标记为 `needs-review`，不阻塞草稿生成。用户最后一次性 review 草稿。

### Checkpoint

每次 shortcut run 写入：

```text
~/.noidear-chat/runs/<runId>.json
```

run 文件包含：

- shortcut name
- server
- user id / company id
- session id
- idempotency key
- step 状态
- 每一步输出的后端 ID
- 最后一次错误

同一 shortcut 可以并发多个 run，但同一个 run 必须加文件锁。失败恢复必须显式传：

```bash
noidear-chat +incoming-inspection --resume <runId>
```

不能隐式复用“上一次失败会话”，避免多个 Agent 互相踩状态。

---

## Notices

JSON envelope 支持 `_notice`，只用于提醒 Agent 做维护动作，不能改变业务结果：

```json
{
  "_notice": {
    "update": {
      "message": "A newer noidear-chat version is available",
      "command": "noidear-chat update"
    },
    "skills": {
      "message": "Installed noidear skills are out of sync",
      "command": "noidear-chat update --skills"
    },
    "registry": {
      "message": "Operation registry is older than the server OpenAPI export",
      "command": "noidear-chat update --from-file openapi.json"
    }
  }
}
```

CI 默认不输出 notice。非 CI 可用以下环境变量关闭：

| Env | 说明 |
|---|---|
| `NOIDEAR_CHAT_NO_UPDATE_NOTICE=1` | 关闭版本提醒 |
| `NOIDEAR_CHAT_NO_SKILLS_NOTICE=1` | 关闭 skill 漂移提醒 |
| `NOIDEAR_CHAT_NO_REGISTRY_NOTICE=1` | 关闭 registry 漂移提醒 |

---

## Skill 文档

Skill 使用和 CLI 同仓发布：

```text
tools/noidear-chat/src/skills/
├── noidear-shared/SKILL.md
├── noidear-quality-records/SKILL.md
├── noidear-warehouse/SKILL.md
├── noidear-traceability/SKILL.md
└── noidear-document-control/SKILL.md
```

`noidear-shared` 自动承载通用规则：

- 首次使用如何 `profile add`、`auth login`、`auth status`。
- 调 API 前必须 `schema`。
- stdout/stderr 和 exit code 解释。
- 看到 `_notice` 后如何处理。
- 看到 exit code `10` 后如何向用户确认并重试。
- 高风险写操作必须先 `--dry-run`。

领域 skill 只写该领域的业务规则、shortcut、API Commands 和禁止事项。例如 traceability skill 必须强调 `MaterialBatch`、`BatchMaterialUsage`、`ProductionBatch` 是追溯事实链，不能让 Agent 自己拼批次文本。

Skill 不包装旧 MCP，不指导 Agent 使用已移除的 `noidear-mcp`。

---

## 验证策略

仓库验证：

```bash
npm run typecheck:types
npm run build:server
npm run build:client
npm run build:chat
npm run test:chat
npm run verify:full
```

CLI 单测必须覆盖：

- profile/config 权限。
- auth login/status/check/logout。
- path normalization。
- `--data` / `--params` JSON、`@file`、stdin。
- OpenAPI fixture parser。
- operation registry 生成和 overrides。
- schema 输出。
- response unwrap。
- error envelope。
- stdout/stderr 分离。
- exit code `10` confirmation gate。
- audit start/finish。
- dry-run 不发业务请求。
- checkpoint/resume 和并发锁。
- notices。

Shortcut E2E 必须覆盖：

- dry-run E2E：每个 shortcut 必须有，不需要真实业务密钥，断言 method、URL、params、body、risk。
- live E2E：每个新 shortcut 必须有，使用受控测试数据，执行 create/use/cleanup 或可重复的闭环断言。

食品安全链路相关 shortcut 还要检查：

- 不创建平行主数据。
- 不复制批次文本当事实源。
- 追溯使用 `MaterialBatch`、`ProductionBatch`、`BatchMaterialUsage` 等当前模型。
- 召回、投诉、不合格、返工引用可追溯对象。

---

## 成功标准

1. 仓库内没有旧 `tools/noidear-mcp` 工作区、构建脚本或运行入口。
2. `noidear-chat schema` 能输出当前 DTO 真实字段、risk、权限提示、确认要求和响应 envelope。
3. `noidear-chat` 三层命令都能返回稳定结构化输出：Shortcut、API Commands、Raw API。
4. stdout/stderr 合同稳定，Agent 不需要解析散文日志。
5. 写操作有服务端 `AgentCliAction` 审计和本地 run 记录。
6. 高风险状态流转返回 exit code `10` 并要求用户确认。
7. 每个 shortcut 都有 dry-run、成功执行、失败恢复和重复执行测试。
8. `verify:full` 不依赖 MCP 构建，可纳入 `build:chat`。
9. noidear skills 与 CLI 能一起更新，并能提醒 Agent 处理漂移。

---

## 明确不做

- 不做对话式 REPL。
- 不恢复 `tools/noidear-mcp`。
- 不用 CLI 绕过后端权限或审批。
- 不在 CLI 内直接读写数据库。
- 不照搬飞书 OAuth、bot/user 身份切换或 scope 授权模型。
- 不为每个业务端点手写 shortcut；端点覆盖靠 API Commands 和 Raw API，shortcut 只包装明确业务闭环。
