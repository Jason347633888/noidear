# GAP-501 Auth Profile Method Design

## 背景

`client/src/stores/user.ts` 在登录态恢复时调用 `GET /auth/profile`，但后端 `server/src/modules/auth/auth.controller.ts` 当前声明为 `@Post('profile')`。由于前端统一请求基址是 `/api/v1`，实际请求会落到 `GET /api/v1/auth/profile`，后端返回 404/405 后会清空本地 token，导致用户刷新页面后登录态丢失。

## 设计结论

统一以后端支持 `GET /auth/profile` 为准，不改前端调用方式。

理由：

- `profile` 是读取当前用户信息，语义上应为 GET。
- 前端已有调用路径正确，问题在后端 HTTP method。
- 不引入 POST 兼容端点，避免继续保留错误合同。

## 范围

修改范围只包含认证 profile 读取合同：

- `AuthController` 增加 `Get` import。
- `getProfile()` 从 `@Post('profile')` 改为 `@Get('profile')`。
- 增加/更新 controller 单测，确认 GET profile 由 JWT guard 保护并返回 `req.user`。

不做：

- 不修改 login、change-password。
- 不重构用户 store。
- 不改权限模型。

## 验收

- `GET /api/v1/auth/profile` 携带有效 token 返回当前用户。
- `POST /api/v1/auth/profile` 不再作为正式合同。
- 后端 auth controller 测试通过。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认这是前后端 HTTP method 合同断裂，不涉及 schema、历史数据或业务流程重设。
- `grill-me`：关键问题“改前端还是改后端”可由代码事实回答；前端读操作已使用 GET，后端应对齐 GET。
- `writing-plans`：见 `docs/superpowers/plans/2026-05-01-gap-501-auth-profile-method-implementation.md`。
