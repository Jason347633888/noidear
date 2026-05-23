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
5. 本文是单一完整 spec：Shortcut、API Commands、Raw API、服务端审计、registry、skills、验证门禁都在同一版架构内定义。implementation plan 可以按门禁顺序实施，但不得拆成互相冲突的平行设计。
6. Shortcut 采用 frontend-derived registry：先从前端菜单、路由、页面按钮、页面方法和 API 封装推导完整草稿；草稿生成不因 risk、确认门、dry-run、恢复和 E2E 缺失而停止。草稿进入可执行 registry 前，这些字段必须全部补齐并通过人工 review。
7. 参考 `larksuite/cli` 的 Agent-native 经验，但不照搬飞书 OAuth、bot/user 身份模型或开放平台 scope 模型。noidear 使用自己的 JWT、RBAC、companyId 和审计边界。

### 单 spec 内的实施门禁

本文不拆分为多个 spec，但实现必须按以下门禁推进：

1. **基础执行层：** profile/auth、HTTP client、输入解析、输出 envelope、Raw API、schema 查询。
2. **可审计 API 层：** operation registry、overrides、API Commands、服务端 `AgentCliAction` 审计、业务幂等合同。
3. **shortcut 草稿层：** frontend-derived registry 生成、source evidence、review report；此阶段允许 `needs-review`，但不得注册为可执行写操作。
4. **shortcut 可执行层：** 只允许通过人工 review、risk/confirm/dry-run/checkpoint/E2E 完整的 shortcut 进入可执行 registry。
5. **Agent skill 层：** skill 只消费已发布的可执行 registry，并明确禁止调用草稿 shortcut。

implementation plan 必须覆盖全部门禁；门禁只是执行顺序，不是拆出新设计。

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
- 当前 controller 普遍只有 Swagger summary，没有显式稳定 `operationId`；CLI registry 不得依赖 Swagger operationId 作为唯一事实源。
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
│   │   ├── frontend-derived-shortcut-registry.json
│   │   ├── frontend-inference.ts
│   │   ├── registry.ts
│   │   ├── runner.ts
│   │   ├── source-evidence.ts
│   │   └── domains/
│   │       ├── admin-governance.ts
│   │       ├── analytics.ts
│   │       ├── batch-recall.ts
│   │       ├── document-approval.ts
│   │       ├── document-control.ts
│   │       ├── environment-record.ts
│   │       ├── equipment-site.ts
│   │       ├── incoming-inspection.ts
│   │       ├── production-execution.ts
│   │       ├── product-rd.ts
│   │       ├── quality-compliance.ts
│   │       ├── traceability-batch.ts
│   │       ├── training.ts
│   │       ├── warehouse.ts
│   │       └── work-execution.ts
│   ├── generated/
│   │   ├── operation-registry.json
│   │   └── overrides/
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

Shortcut 只能覆盖已经完整建模的业务流程。每个 executable shortcut 必须定义：

- 业务目的和适用边界。
- 必须引用的 noidear 模型。
- 需要调用的 operationId 列表。
- risk 和确认规则。
- dry-run 输出。
- checkpoint/resume 规则。
- 幂等键规则。
- dry-run E2E 和 live E2E。

### API Commands

API Commands 是从 operation registry 生成的中层命令，一条命令对应一个稳定 registry operation id：

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
| `--strict` | 缺少 registry、schema、risk、permission、audit 或幂等元数据时拒绝执行写操作和敏感读取 |

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

## 文件上传

当 operation registry 中 `upload: true` 时，该操作支持文件上传。使用独立 `--file` flag，`--data` 提供额外 JSON 字段：

```bash
noidear-chat documents upload --file @/path/to/sop.pdf --data '{"name":"SOP-001","documentType":"sop"}' --reason "新增 SOP"
noidear-chat supplier-qualifications create --file @/path/to/cert.pdf --data '{"supplierId":"sup-1","type":"iso9001"}'
```

规则：

- `--file @<path>` 触发 multipart/form-data 请求；`--data` 字段作为同一表单的 JSON part 或独立 fields。
- `--file -` 从 stdin 读取文件内容，必须同时提供 `--file-name <name>` 指定 Content-Disposition 文件名。
- 文件路径安全校验与 `--data @file` 相同：拒绝目录、不可读路径、明显敏感路径（`~/.ssh/`、`~/.noidear-chat/` 等）。
- 上传进度写 stderr，不混入 stdout：

```json
{ "progress": { "uploaded": 51200, "total": 204800, "percent": 0.25 } }
```

- `--dry-run` 时输出上传请求预览（文件名、大小估算、Content-Type），不发送文件内容。
- 文件大小上限由后端控制，CLI 不做本地限制；后端拒绝时按正常错误 envelope 输出。
- 对 `upload: false` 的操作传入 `--file` 返回 exit code 2 并说明该操作不支持上传。

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
2. registry 的 canonical id 一律由 `method + normalized path` 生成，格式为 `<module>.<action>`；OpenAPI `operationId` 只作为 alias 输入，不作为稳定事实源。
3. `@Controller` prefix 只能作为 module 猜测，不能作为唯一事实源。
4. `@ApiTags` 可辅助描述，但不能作为覆盖判断依据。
5. `risk`、`requiresConfirmation`、`permissions`、`idempotency`、`audit`、`pagination`、`upload`、`responseSchemaRef` 必须允许人工 overrides。
6. registry 生成后做快照测试，避免 DTO 字段漂移、route 漂移或 risk 漂移时静默改命令。

### Overrides 格式

`tools/noidear-chat/src/generated/overrides/*.json` 用于对自动生成结果做人工修正。每个 JSON 文件以 `method + normalized path` 为 key：

```json
{
  "POST /api/v1/environment-records": {
    "id": "environment-records.create",
    "command": ["environment-records", "create"],
    "risk": "write",
    "requiresConfirmation": false,
    "permissions": ["environment-record:create"],
    "idempotency": "client-key-required",
    "audit": "required"
  },
  "PATCH /api/v1/product-recalls/:id/submit": {
    "id": "product-recalls.submit",
    "command": ["product-recalls", "submit"],
    "risk": "transition",
    "requiresConfirmation": true,
    "permissions": ["product-recall:submit"],
    "idempotency": "client-key-required",
    "audit": "required"
  }
}
```

规则：
- override key 必须使用 normalized path（含 `/api/v1/`，path params 保留 `:param` 占位符）。
- 只覆盖需要人工调整的字段；未写字段继承自 OpenAPI 自动生成结果。
- `risk`、`requiresConfirmation`、`permissions`、`idempotency`、`audit`、`pagination` 是最常见的 override 字段。
- `id` 和 `command` 在自动生成的 canonical id 不符合业务命名时才需要手动指定。
- override 文件按模块分文件，例如 `overrides/quality.json`、`overrides/warehouse.json`。

canonical id 生成规则：

| HTTP + path 形态 | 默认 id 示例 |
|---|---|
| `GET /api/v1/environment-records` | `environment-records.list` |
| `POST /api/v1/environment-records` | `environment-records.create` |
| `GET /api/v1/environment-records/:id` | `environment-records.get` |
| `PATCH /api/v1/product-recalls/:id/submit` | `product-recalls.submit` |
| `DELETE /api/v1/documents/:id` | `documents.delete` |

如果同一路径模式存在冲突，生成器必须失败并要求 override，不能静默追加数字后缀。

生产环境默认没有 `/api/docs-json`。生产部署可选择：

- 随 CLI 包发布 `generated/operation-registry.json`，这是生产默认路径。
- 从 CI 构建产物导出 OpenAPI 文件，再运行 `noidear-chat update --from-file openapi.json`。
- `noidear-chat update --from-server` 只允许用于本地开发、测试环境或明确开启 API discovery 的受控环境；不作为生产常规流程。

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

## 输出格式

`--format` 只影响 stdout 成功数据的渲染，不影响 stderr 错误 envelope（始终 JSON）、dry-run 输出（始终 JSON）和 `_notice`（非 json 格式时忽略）。

| Format | 行为 |
|---|---|
| `json` | 默认。完整 envelope 输出，包含 `ok`、`operationId`、`data`、`_notice`。Agent 始终使用此格式。 |
| `pretty` | 缩进 + 语法高亮 JSON，适合人工阅读。结构与 `json` 相同，不输出 `_notice`。 |
| `table` | 把 `data` 渲染为表格：`data` 是数组时每个元素一行；`data` 是对象时 key/value 两列。不输出 `_notice`。 |
| `ndjson` | Newline-Delimited JSON。`data` 是数组时每个元素单独一行；`data` 是对象时整体为一行。适合流式处理和 `grep`。 |
| `csv` | 仅支持 `data` 为数组的响应。第一行是字段名（取自第一个元素的 key），后续行为数据值。`data` 非数组时降级为 `table` 并在 stderr 输出 warning。 |

### --jq 过滤

`--jq <expr>` / `-q <expr>` 使用 CLI 内置的 jq 兼容求值器，**不依赖系统 `jq`**，作用于解包后的 `data` 字段：

```bash
noidear-chat environment-records list -q '.list[].locationId'
noidear-chat traceability backward --params '{"productionBatchId":"pb-1"}' -q '.nodes | length'
```

规则：

- 表达式在响应 envelope 解包后、`--format` 渲染前执行，作用对象是 `data`，不是整个 envelope。
- 结果以 raw JSON 写 stdout；`--format` 对 `-q` 结果无效。
- 表达式求值失败时写 stderr 结构化错误，exit code 2。
- `-q` 与 `--format` 同时使用时，`-q` 优先；`--format` 被忽略并在 stderr 输出 warning。
- `_notice` 在使用 `-q` 时不输出到 stdout。
- dry-run 输出不支持 `-q`（dry-run 输出的是请求预览，不是业务数据）。

---

## 分页

分页 flags 只对 operation registry 中 `pagination` 字段非 null 的操作生效：

```json
"pagination": {
  "pageParam": "page",
  "sizeParam": "limit",
  "itemsPath": "data.list",
  "totalPath": "data.total",
  "pagePath": "data.page",
  "limitPath": "data.limit"
}
```

| Flag | 默认值 | 说明 |
|---|---|---|
| `--page-all` | — | 自动翻页拉取全部数据，合并后一次性输出 |
| `--page-size <N>` | API 默认 | 每页数量，覆盖 API 默认值 |
| `--page-limit <N>` | 50 | `--page-all` 最多翻页数，防止意外拉取超大数据集 |
| `--page-delay-ms <N>` | 0 | 自动翻页请求间隔毫秒数 |

`--page-all` 行为：

1. 使用 `--page-size`（或 API 默认值）发第一页请求。
2. 从 operation registry 的 `itemsPath`、`totalPath`、`pagePath`、`limitPath` 读取分页结果；不同接口形态必须通过 overrides 声明，不能硬编码 `data.list`。
3. 依次请求后续页，每页间等待 `--page-delay-ms` 毫秒。
4. 所有页数据合并，最终输出：

```json
{
  "ok": true,
  "operationId": "environment-records.list",
  "data": {
    "items": [...],
    "total": 128,
    "fetched": 128,
    "pages": 7
  }
}
```

5. 达到 `--page-limit` 时停止，已拉取数据正常输出到 stdout，stderr 输出：

```json
{ "warning": "page_limit_reached", "fetched": 500, "total": 1280, "hint": "Increase with --page-limit or use --page-size to reduce per-page cost" }
```

对 `pagination: null` 的操作使用 `--page-all` 时返回 exit code 2 并说明该操作不支持分页。若 registry 声明了分页但实际响应无法按 path 抽取，返回 exit code 5，并提示补充或修正 pagination override。

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
| `sensitive-read` | 审计日志、追溯报告、批量导出、包含个人或合规敏感信息的读取 | 需要 `--reason`，必须创建服务端审计，不默认要求 `--yes` |
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
- redactedRequestPreview
- risk
- reason
- idempotencyKey
- status
- httpStatus
- result
- errorCode
- durationMs

审计记录不得保存 token、密码、完整附件、完整导出内容或未脱敏的大体积请求体。`requestHash` 用于证明请求一致性，`redactedRequestPreview` 只保留字段名、路径参数、查询条件摘要和经过脱敏的关键业务 ID。

执行规则：

1. CLI 的 `sensitive-read`、`write`、`transition`、`destructive` 先创建审计 `started` 记录，再发业务请求，再更新审计为 `succeeded` 或 `failed`。
2. `sensitive-read`、`write`、`transition`、`destructive` 如果审计前置失败，不执行业务请求。
3. `read` 默认不创建服务端审计，但可被 operation override 提升为 `sensitive-read`。
4. 旧 MCP 的 `AgentAction` / `agent_actions` 不复用。新模型命名为 `AgentCliAction`，表名为 `agent_cli_actions`。

### 本地审计降级

业务执行不允许依赖本地审计降级。`--allow-local-audit-only` 不进入正式 CLI 合同、不进入 Skill 文档、不进入 CI，也不得用于任何会发送业务请求的 `sensitive-read`、`write`、`transition` 或 `destructive` 操作。

适用范围：

| Risk | 行为 |
|---|---|
| `read` | 可写本地 run 文件，用于调试；不改变业务数据 |
| `sensitive-read` | **不适用**。始终需要服务端审计 |
| `write` | **不适用**。始终需要服务端审计 |
| `transition` | **不适用**。始终需要服务端审计 |
| `destructive` | **不适用**。始终需要服务端审计 |

降级后的输出：

```json
{
  "ok": false,
  "operationId": "environment-records.create",
  "error": {
    "type": "audit_required",
    "message": "Server audit is required before this operation can run",
    "localRunFile": "~/.noidear-chat/runs/run-xxx.json"
  }
}
```

同时在 stderr 输出：

```json
{ "error": "server_audit_unavailable", "message": "Business request was not sent because server audit failed", "localRunFile": "~/.noidear-chat/runs/run-xxx.json" }
```

使用限制：

- Agent 不应主动使用本地审计降级。
- 不能与 `--yes` 组合绕过审计。
- CI、生产和正式测试必须确保服务端审计可达。

### 业务幂等合同

审计幂等不等于业务幂等。`idempotency: "client-key-required"` 的操作必须同时满足：

1. CLI 生成或接收 `--idempotency-key`，并通过 `Idempotency-Key` header 传给业务 API。
2. 服务端 `AgentCliAction` 对 `(companyId, idempotencyKey)` 建唯一约束，用于拦截重复执行请求。
3. 对 create/transition/destructive 操作，业务端点必须支持同 key 重试的安全语义；如果业务端点当前不支持，operation registry 必须标记为 `idempotency: "none"` 或 `idempotency: "manual-recovery"`，并禁止自动重试。
4. 网络超时或 finish 审计失败后的恢复必须先查询 `AgentCliAction` 和业务对象状态，再决定 resume；不能盲目重发业务请求。
5. shortcut 的 checkpoint 只能保存后端返回的业务 ID 和步骤状态，不能把本地变量当成事实源。

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

Shortcut 不只覆盖少数示例。完整目标是：所有后端 API 先通过 Raw API 和 API Commands 覆盖；所有能从前端页面操作推导出来的业务闭环先进入 frontend-derived shortcut draft registry，再经过 review gate 进入 executable shortcut registry。

### 覆盖基线

当前源码解析结果：

| 来源 | 抽取结果 |
|---|---:|
| `client/src/navigation/menu.ts` | 11 个菜单组，64 个菜单入口 |
| `client/src/api/*.ts` | 61 个 API 适配文件，339 个前端请求调用 |
| `server/src/modules/**/*controller.ts` | 498 条 controller decorator 路由 |
| GitNexus `route_map` | 216 个 route node |

覆盖统计以源码 decorator 路由为准；GitNexus `route_map` 只作辅助参照。

### 覆盖口径

| 覆盖层 | 目标 | 替代页面程度 |
|---|---|---|
| Raw API | `noidear-chat api METHOD /path` 可调用全部后端 API | 全 API 覆盖，用户体验偏底层 |
| API Commands | 从 operation registry 生成 `module action` 命令 | 覆盖大多数单接口操作 |
| Shortcut | 从前端页面操作推导业务闭环，后端 API/schema 校验 | 最大程度替代页面 |
| Skill | 告诉 Agent 何时用 shortcut，何时用 API Commands，何时必须确认 | 降低误操作和字段猜测 |

页面保留范围：复杂可视化、表单拖拽设计、文件预览、图表看板、打印预览。录入、查询、提交、审批、导出、状态流转、批次追溯和例行检查应尽量走 CLI。

### 模块级覆盖矩阵

| 菜单组 | 页面入口 | API Commands 覆盖 | 前端推导 Shortcut 闭环 | 最后检查重点 |
|---|---:|---|---|---|
| 工作执行 | 4 | `todos`、`record-task`、`unified-approval`、`statistics` | `+workbench-digest`、`+todo-complete`、`+record-task-fill`、`+approval-decision` | 是否遗漏页面按钮动作 |
| 文控与审批 | 4 | `document`、`record-template`、`unified-approval` | `+document-create`、`+document-revise-submit`、`+document-publish`、`+record-form-land`、`+approval-history` | 上传、预览、发布、归档、修订动作是否完整 |
| 生产执行 | 6 | `record`、`record-task`、`warehouse/requisitions`、`warehouse/staging-area`、`deviation` | `+record-create-submit`、`+record-task-schedule`、`+material-requisition`、`+requisition-complete`、`+staging-transfer`、`+deviation-report` | 页面上的状态按钮是否都进入 registry |
| 产品研发 | 2 | `product`、`process`、`recipe`、`process-step`、`product-process-change` | `+product-create`、`+product-workbench-update`、`+rd-process-start`、`+rd-step-submit`、`+product-process-change` | 产品详情/工作台中的嵌套动作 |
| 质量与合规 | 7 | `ccp`、`non-conformance`、`corrective-action`、`customer-complaint`、`product-recall`、`supplier-evaluation`、`change-event` | `+ccp-record`、`+nonconformance-capa`、`+customer-complaint-trace`、`+product-recall`、`+supplier-evaluation`、`+change-event-closeout` | 列表页、详情页、抽屉里的二级动作 |
| 设备与现场 | 21 | `equipment`、`environment-record`、`process-record`、`metal-detection`、`cleaning-record`、`measuring-equipment`、`rework-record`、`visitor-record`、`waste` 等 | `+equipment-fault`、`+maintenance-plan-run`、`+environment-record`、`+process-record`、`+metal-detection`、`+cleaning-record`、`+calibration-record`、`+rework-record`、`+line-change-check`、`+visitor-register`、`+waste-record` | 单页表单字段是否完整抽取 |
| 追溯与批次 | 5 | `batch-trace`、`warehouse/batches`、`traceability`、`warehouse/material-balance`、`incoming-inspection` | `+production-batch-create`、`+batch-material-usage`、`+traceability-query`、`+material-balance-check`、`+incoming-inspection` | 历史 redirect 页面不应成为主入口 |
| 仓库管理 | 2 | `warehouse/materials`、`warehouse/suppliers`、`warehouse/inbound`、`returns`、`scraps` | `+material-master`、`+supplier-onboard`、`+material-inbound-complete`、`+material-return-complete`、`+material-scrap-complete` | 文件上传和完成类按钮 |
| 培训 | 1 | `training`、`training/questions`、`training/exam`、`training/archive` | `+training-plan-submit`、`+training-project-run`、`+training-question-import`、`+training-exam-submit`、`+training-archive-download` | 详情页中的 start/complete/cancel |
| 数据分析 | 3 | `statistics`、`deviation-analytics`、`audit`、`traceability/export` | `+stats-export`、`+deviation-analysis`、`+audit-export`、`+traceability-export` | 导出类动作和筛选参数 |
| 系统治理 | 9 | `user`、`department`、`role`、`permission`、`fine-grained-permission`、`user-permission`、`notification`、`search`、`audit` | `+user-provision`、`+role-permission-sync`、`+grant-permissions`、`+notification-read`、`+search-index`、`+audit-search` | 批量授权/撤销是否全部进入 registry |

### Shortcut Registry 候选清单

这些不是分阶段，而是同一个 shortcut registry 的候选全集。实现时可按风险和样例完备度排序，但命名和边界应一次性定好。

#### 工作执行

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+workbench-digest` | 汇总待办、待填任务、待审批、异常提醒 | read |
| `+todo-complete` | 查询待办并完成指定待办 | transition |
| `+record-task-fill` | 查询待填任务，填报记录，提交 | transition |
| `+approval-decision` | 查询审批任务，查看详情，同意或拒绝 | transition |

#### 文控与审批

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+document-create` | 上传/创建文件草稿并建立引用关系 | write |
| `+document-revise-submit` | 新增修订，更新 Markdown 或附件，提交审批 | transition |
| `+document-publish` | 发布或归档受控文件 | transition |
| `+record-form-land` | 记录表单索引确认、字段覆盖检查、批量确认建议 | write |
| `+approval-history` | 查询文件或资源的审批历史 | read |

#### 生产执行

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+record-create-submit` | 按模板创建记录并提交 | transition |
| `+record-task-schedule` | 创建、暂停、恢复、关闭定期填报任务 | transition |
| `+material-requisition` | 创建领料单并提交 | transition |
| `+requisition-complete` | 完成领料，触发库存扣减 | destructive |
| `+staging-transfer` | 车间暂存转移、发料、盘点 | transition |
| `+deviation-report` | 查询偏差、导出偏差、补录偏差说明 | write |

#### 产品研发

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+product-create` | 创建产品主数据 | write |
| `+product-workbench-update` | 更新产品详情、报告、配方/工序工作台信息 | write |
| `+rd-process-start` | 基于流程模板创建研发流程实例 | write |
| `+rd-step-submit` | 提交流程步骤数据，触发必要审批 | transition |
| `+product-process-change` | 创建工艺变更、提交、重试或查询 | transition |

#### 质量与合规

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+ccp-record` | 创建 CCP 记录，查询批次缺失 CCP | write |
| `+nonconformance-capa` | 创建不合格，处置，必要时创建 CAPA 并关闭 | transition |
| `+capa-closeout` | 创建纠正措施、添加验证、关闭 | transition |
| `+customer-complaint-trace` | 创建投诉，追溯相关批次，生成处理结论 | transition |
| `+product-recall` | 追溯、创建召回、提交通知、上传证据 | transition |
| `+supplier-evaluation` | 创建供应商评估并查询供应商历史 | write |
| `+change-event-closeout` | 创建变更、填关联表单、验证、关闭 | transition |

#### 设备与现场

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+equipment-fault` | 报修、受理、完成或取消 | transition |
| `+maintenance-plan-run` | 查询计划，启动，完成或取消 | transition |
| `+maintenance-record-submit` | 创建维保记录并提交 | transition |
| `+environment-record` | 创建环境温湿度/压差记录 | write |
| `+process-record` | 创建过程参数记录 | write |
| `+metal-detection` | 创建金属探测记录并按批次查询 | write |
| `+cleaning-record` | 创建清洁消毒记录 | write |
| `+calibration-record` | 创建设备校准记录并查询超期设备 | write |
| `+rework-record` | 创建回料/返工记录 | write |
| `+fragile-item-inspection` | 创建玻璃硬塑检查记录 | write |
| `+line-change-check` | 创建换产前检查记录 | write |
| `+visitor-register` | 创建访客登记 | write |
| `+waste-record` | 创建废弃物记录和处置记录 | write |

#### 追溯与批次

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+production-batch-create` | 创建生产批次，确认批次 | transition |
| `+batch-material-usage` | 维护生产批次投料关系 | transition |
| `+traceability-query` | 正追、反追、图谱、快照、导出 | read |
| `+material-balance-check` | 查询单批次或全量物料平衡 | read |
| `+incoming-inspection` | 基于 `MaterialBatch` 创建来料检验 | write |

#### 仓库管理

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+material-master` | 创建/更新/停用物料主数据 | transition |
| `+supplier-onboard` | 创建供应商、上传资质、替换资质文件 | transition |
| `+material-inbound-complete` | 创建入库单，完成入库并生成物料批次 | transition |
| `+material-return-complete` | 创建退料单并完成 | transition |
| `+material-scrap-complete` | 创建报废单并完成 | destructive |

#### 培训

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+training-plan-submit` | 创建培训计划并提交审批 | transition |
| `+training-project-run` | 创建项目、添加学员、启动、完成或取消 | transition |
| `+training-question-import` | 批量导入题目并调整顺序 | write |
| `+training-exam-submit` | 开始考试并提交答案 | transition |
| `+training-archive-download` | 创建/查询/下载培训档案 | read |

#### 数据分析

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+stats-export` | 导出文档、任务、培训或统计报表 | sensitive-read |
| `+deviation-analysis` | 查询偏差趋势、字段分布、部门/模板偏差率 | read |
| `+audit-export` | 查询并导出登录、权限、敏感操作日志 | sensitive-read |
| `+traceability-export` | 导出追溯报告或快照结果 | sensitive-read |

#### 系统治理

| Shortcut | 闭环 | 风险 |
|---|---|---|
| `+user-provision` | 创建用户、重置密码、授予默认角色 | transition |
| `+role-permission-sync` | 创建角色并同步权限 | transition |
| `+grant-permissions` | 给用户批量授权或撤销权限 | transition |
| `+notification-read` | 查询未读、标记已读、全部已读 | write |
| `+search-index` | 建索引、查索引、删索引 | transition |
| `+audit-search` | 跨日志搜索、生成 BRCGS 报告 | read |

### Frontend-Derived Registry 推导规则

本轮不要求用户逐个补业务闭环。实现时先用前端推导：

1. 从 `client/src/navigation/menu.ts` 抽菜单域和页面入口。
2. 从 `client/src/router/index.ts` 抽 path 到 Vue view 的映射。
3. 从 `client/src/views/**/*.vue` 抽按钮、表单、页面方法和调用顺序。
4. 从 `client/src/api/*.ts` 抽前端 API adapter 的 method/path。
5. 从 `server/src/modules/**/*controller.ts` 校验后端 route 和 handler。

风险、确认门、幂等、审计、E2E 样例仍然是 registry 字段，但不阻塞草稿生成。推不出来就写 `needs-review`，保留 `sourceEvidence`，最后交给用户统一检查。草稿 registry 不等于可执行 registry；任何缺字段、低置信度或需要复核的 shortcut 都不得被 CLI 注册为可执行命令。

| 前端信号 | 推导结果 |
|---|---|
| 菜单入口 | 生成 read/list shortcut 或 API command alias |
| `openCreateDialog`、`handleCreate`、`create*` | 生成 `+*-create` 或领域命名 shortcut |
| `handleSubmit`、`submit*` | 生成 submit/transition shortcut |
| `handleApprove`、`handleReject` | 生成审批 decision shortcut |
| `handleComplete`、`complete*` | 生成 complete shortcut |
| `handleCancel`、`cancel*` | 生成 cancel shortcut |
| `handleArchive`、`archive*`、`publish*` | 生成归档/发布 shortcut |
| `handleDelete`、`remove*` | 生成 delete/destructive shortcut 草稿 |
| `export*`、`download*` | 生成 export/download shortcut |
| 直接 `request.*` 调用 | 记录为 view-level source evidence |
| API adapter 调用 | 绑定 operationIds 和 schema |

置信度规则：

| Confidence | 解释 |
|---|---|
| `high` | 单页面、单 API 或清晰列表/创建/导出动作，字段来自前端表单和 DTO |
| `medium` | 多 API 串联，前端调用顺序清楚，但有状态流转 |
| `low` | 涉及多个页面或详情页、批量动作、上传、库存、审批、追溯 |
| `needs-review` | 前端有动作但 API/DTO/状态含义无法稳定推断 |

`low` 和 `needs-review` 不阻塞草稿生成，只影响最后 review 报告分组。进入可执行 registry 的最低要求：

- `confidence` 必须是 `high` 或经过人工 review 的 `medium`。
- `risk`、`requiresConfirmation`、`audit`、`idempotency`、`dryRunFixture`、`sourceEvidence` 必须完整。
- `sensitive-read`、`write`、`transition`、`destructive` 必须有服务端审计路径。
- `transition`、`destructive` 必须有 `--dry-run` 预览和 exit code `10` 确认测试。
- 涉及库存、批次、追溯、审批、召回、投诉、不合格、返工、CAPA 的 shortcut 必须有 live E2E 或服务层集成测试覆盖。

### Registry 字段

```json
{
  "name": "+environment-record",
  "domain": "equipment-site",
  "description": "创建环境温湿度/压差记录",
  "triggerExamples": ["补一条环境温湿度记录"],
  "sourceRoute": "/environment-records",
  "sourceView": "client/src/views/environment-record/EnvironmentRecordList.vue",
  "startObject": "ProductionBatch",
  "operationIds": ["environment-records.list", "environment-records.create"],
  "risk": "write",
  "status": "executable",
  "requiresConfirmation": false,
  "audit": "required",
  "idempotency": "client-key-required",
  "checkpointSteps": ["create-environment-record"],
  "dryRunFixture": "environment-record.ok.json",
  "liveE2EFixture": "environment-record.live.json",
  "skillName": "noidear-quality-records",
  "sourceEvidence": [
    {
      "kind": "view",
      "file": "client/src/views/environment-record/EnvironmentRecordList.vue",
      "symbols": ["openCreateDialog", "handleCreate"]
    },
    {
      "kind": "api",
      "file": "client/src/api/environment-record.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    },
    {
      "kind": "controller",
      "file": "server/src/modules/environment-record/environment-record.controller.ts",
      "routes": ["GET /environment-records", "POST /environment-records"]
    }
  ],
  "confidence": "high",
  "reviewNotes": []
}
```

registry 中每个 shortcut 至少包含以上所有字段。API 全覆盖由 operation registry 负责，业务闭环最大覆盖由 shortcut registry 负责。`status` 只能是 `draft`、`reviewed`、`executable`、`disabled`；CLI 只加载 `executable`，Skill 只引用 `executable`。文件路径：

```text
tools/noidear-chat/src/shortcuts/frontend-derived-shortcut-registry.json
tools/noidear-chat/src/shortcuts/domains/<domain>.ts
tools/noidear-chat/src/skills/noidear-*/SKILL.md
```

未被前端推导出来的业务仍可通过 API Commands 或 Raw API 调用。

### 最后给用户看的 Review Report

实现时生成：

```text
tools/noidear-chat/reports/frontend-derived-shortcut-review.md
```

报告结构：

```text
# Frontend-Derived Shortcut Review

## Summary
- total shortcuts:
- high confidence:
- medium confidence:
- low confidence:
- needs review:

## Missing API Or Ambiguous Evidence
...

## High Confidence
...

## Medium Confidence
...

## Low Confidence
...

## Needs Review
...
```

用户最后一次性检查要点：

1. 是否遗漏页面上的按钮、批量动作、详情页动作、抽屉动作。
2. shortcut 名称是否符合业务人员说法。
3. 一句话触发语是否自然。
4. 自动步骤是否和前端页面顺序一致。
5. 被标记为 `needs-review` 的字段是否需要改名或拆分。
6. 页面里没有的业务闭环是否要额外补 shortcut。

草稿生成时允许字段不完美，但必须保留 `sourceEvidence`，让最终 review 能追回前端文件、API 文件和后端 route。

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

Skill 不包装旧 MCP，不指导 Agent 使用已移除的 `noidear-mcp`。

### Skill → Domain 映射

每个 shortcut 的 `skillName` 字段指向下表中的某一个 skill。Agent 安装 CLI 后按需加载对应 skill。

| Skill | 覆盖的菜单域 |
|---|---|
| `noidear-shared` | work-execution、product-rd、training、analytics、admin-governance |
| `noidear-quality-records` | quality-compliance、equipment-site |
| `noidear-warehouse` | warehouse |
| `noidear-traceability` | traceability-batch |
| `noidear-document-control` | document-control、production-execution |

### noidear-shared 必须包含

通用 CLI 规则（所有 Agent 都必须读）：

- `profile add`、`auth login`、`auth status` 首次使用流程。
- 调用任何 API Command 或 Raw API 前必须先运行 `schema`。
- stdout 是数据、stderr 是错误、`_notice` 是维护提示，三者含义和处理方式。
- exit code 表：0 成功 / 2 用法错误 / 3 未登录 / 4 权限不足 / 5 schema 校验失败 / 6 网络 / 7 后端 5xx / 8 幂等冲突 / 10 需要确认。
- exit code `10` 的确认流程：把 dry-run 输出展示给用户 → 用户明确同意 → 原 argv 末尾追加 `--yes` 重试。
- `_notice` 处理：update 提示运行 `noidear-chat update`，skills 提示运行 `noidear-chat update --skills`，registry 提示运行 `noidear-chat update --from-file`。
- 高风险操作（transition/destructive）必须先 `--dry-run` 再执行。
- `sensitive-read` 必须填写 `--reason` 并创建服务端审计，不能当成普通 read。
- Skill 只引用 executable shortcut，不引用 draft/reviewed/disabled shortcut。

work-execution 规则：

- `+workbench-digest` 是只读汇总，不触发任何写操作。
- `+todo-complete`、`+record-task-fill`、`+approval-decision` 都是 transition，必须 `--yes`。
- approval decision 的 reason 必须明确，不能留空。

product-rd 规则：

- 产品主数据模型名：`Product`、`ProcessTemplate`、`ProcessInstance`、`ProcessStepData`、`Recipe`。
- R&D 流程步骤提交前必须先查询当前步骤状态，不能重复提交。

training / analytics / admin-governance 规则：

- training exam 提交后不可撤回，必须先 dry-run。
- analytics 中普通图表查询是 read；统计导出、审计导出、追溯导出是 `sensitive-read`，必须 `--reason` 和服务端审计。
- admin-governance 的权限变更（`+grant-permissions`、`+role-permission-sync`）是 transition，必须 `--yes` 并填写 `--reason`。

### noidear-quality-records 必须包含

quality-compliance 规则：

- 模型名：`CcpRecord`、`NonConformance`、`CorrectiveAction`、`CustomerComplaint`、`ProductRecall`、`SupplierEvaluation`、`ChangeEvent`。
- CCP 偏差记录创建后，必须同时创建或关联 NonConformance。
- ProductRecall 的 submit/notify 是 transition，必须先 `+traceability-query` 确认追溯范围再执行。
- CorrectiveAction 关闭前必须有验证记录。

equipment-site 规则：

- 模型名：`EnvironmentRecord`、`ProcessMonitorRecord` / process-record 模块、`MetalDetectionLog`、`CleaningRecord`、`MeasuringEquipment`、`ReworkRecord`、`VisitorRecord`、`WasteRecord`。
- 所有现场记录必须引用 `ProductionBatch`，不能用批次编号文本作为外键替代。
- 设备校准超期（MeasuringEquipment.calibrationDueDate 过期）不能直接创建校准记录，必须先查询设备状态。
- 废弃物处置记录（`+waste-record`）的 disposalMethod 字段不能留空。

### noidear-warehouse 必须包含

- `MaterialBatch` 只能通过入库流程创建，不能通过 Raw API 直接 POST 创建孤立批次。
- `MaterialBatch.lotNumber` 是事实标识，不能用自由文本描述替代批次号进行追溯。
- 入库（`+material-inbound-complete`）是 transition，完成后自动生成 `MaterialBatch`，批次 ID 从响应中读取。
- 退料（`+material-return-complete`）和报废（`+material-scrap-complete`）必须引用已存在的 `MaterialBatch`，不能凭空创建。
- FIFO 和库存锁由后端控制，CLI 不做本地库存计算。

### noidear-traceability 必须包含

- 追溯事实链：`MaterialBatch` → `BatchMaterialUsage` → `ProductionBatch`，这三个模型是不可替代的事实源。
- 禁止在 CLI 内拼装第二条追溯链（例如用 lotNumber 文本串联）。
- `+traceability-query` 支持 forward（正追）、backward（反追）、graph（图谱）、snapshot（快照）和 export（导出）。其中 export 是 `sensitive-read`。
- 追溯结果必须从 API 响应读取，不能从 shortcut 运行时的本地变量合成。
- `ProductRecall` 的批次范围必须来自 traceability 查询结果，不能手工填写。

### noidear-document-control 必须包含

document-control 规则：

- 模型名：`Document`、`DocumentVersion`、`BusinessDocumentLink`、`ApprovalInstance`、`ApprovalTask`。
- 文件发布（`+document-publish`）前必须查询审批状态，`ApprovalInstance.status` 必须是 `approved`。
- 文件修订（`+document-revise-submit`）会创建新的 `DocumentVersion`，不修改已发布版本。
- `BusinessDocumentLink` 是文件与业务对象（如产品、工序）的关联，修改时需确认影响范围。

production-execution 规则：

- 记录模型名：`RecordTemplate`、`Record`、`RecordTaskAssignment`、`RecordTaskInstance`。
- 记录填报（`+record-create-submit`）必须通过 `RecordTemplate` 创建，不能绕过模板直接写字段。
- 领料（`+material-requisition`）提交后触发审批流，不能直接 complete，必须等审批通过。
- 车间暂存转移（`+staging-transfer`）必须引用现有 `MaterialBatch`，不接受自由文本描述。

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

Executable shortcut E2E 必须覆盖：

- dry-run E2E：每个 executable shortcut 必须有，不需要真实业务密钥，断言 method、URL、params、body、risk、audit、idempotency。
- live E2E：每个新增 executable shortcut 必须有，使用受控测试数据，执行 create/use/cleanup 或可重复的闭环断言。draft shortcut 只要求进入 review report，不要求 live E2E。

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
7. 每个 executable shortcut 都有 dry-run、成功执行、失败恢复和重复执行测试；draft shortcut 不对 Agent 暴露。
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
