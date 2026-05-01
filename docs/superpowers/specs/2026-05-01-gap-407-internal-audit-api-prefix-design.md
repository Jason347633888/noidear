# GAP-407 Internal Audit API Prefix Design

## 背景

前端请求封装 `client/src/api/request.ts` 已统一设置 `baseURL: '/api/v1'`。但 `client/src/api/internal-audit/*.ts` 内部又硬编码 `/api/v1/audit/...`，最终浏览器请求会变成 `/api/v1/api/v1/audit/...`。

后端内审控制器的有效路径来自 `@Controller('audit/...')`，因此前端 API 文件应只写相对业务路径 `/audit/...`。

## 设计结论

统一修正 `client/src/api/internal-audit/` 目录下所有请求路径：

- `/api/v1/audit/plans` -> `/audit/plans`
- `/api/v1/audit/findings` -> `/audit/findings`
- `/api/v1/audit/reports` -> `/audit/reports`
- 所有模板字符串同样去掉 `/api/v1` 前缀。

## 范围

修改范围只在前端 API adapter：

- `client/src/api/internal-audit/plan.ts`
- `client/src/api/internal-audit/finding.ts`
- `client/src/api/internal-audit/report.ts`

不做：

- 不改后端 controller route。
- 不改页面交互。
- 不改权限或审计业务状态机。

## 验收

- `rg "/api/v1/audit" client/src/api/internal-audit` 无结果。
- 内审页面请求路径应为 `/api/v1/audit/...`，不是 `/api/v1/api/v1/audit/...`。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认这是 request baseURL 与 API adapter 重复前缀导致的接口合同问题。
- `grill-me`：关键问题“改前端还是改后端”可由代码判断；后端 route 已是 `audit/...`，应修前端 adapter。
- `writing-plans`：见 `docs/superpowers/plans/2026-05-01-gap-407-internal-audit-api-prefix-implementation.md`。
