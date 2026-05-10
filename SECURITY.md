# 安全说明

本文档按当前代码库可确认的安全措施记录，不声明未经验证的上线结论。

## 1. 认证与会话

代码来源：`server/src/modules/auth/`、`client/src/api/request.ts`。

- 登录接口：`POST /api/v1/auth/login`。
- 当前用户接口：`GET /api/v1/auth/profile`。
- 改密码接口：`PATCH /api/v1/auth/change-password`。
- 前端将 token 存入 `localStorage.token`，请求时写入 `Authorization: Bearer <token>`。
- JWT payload 包含 `sub`、`username`、`roleCode`、`companyId`。
- 后端认证上下文要求 `companyId` 存在；缺失会失败。
- 密码校验使用 `bcrypt.compare()`。
- 默认登录失败锁定策略：5 分钟窗口内失败 5 次后锁定 1 分钟；`AUTH_LOCKOUT_DISABLED=true` 可关闭。
- SSO 相关代码存在于 `server/src/modules/auth/sso.*`，具体部署依赖环境配置。

## 2. 后端安全基线

代码来源：`server/src/main.ts`。

- 全局 API 前缀：`/api/v1`。
- 启用 Helmet，包含 CSP、HSTS、X-Frame-Options、nosniff、referrer policy 等配置。
- CORS 默认允许 `process.env.CORS_ORIGIN || 'http://localhost:5173'`。
- 全局 `ValidationPipe` 开启：
  - `whitelist`
  - `transform`
  - `forbidNonWhitelisted`
- 全局响应拦截器：`ResponseInterceptor`。
- 全局异常过滤器：`HttpExceptionFilter`。
- Swagger 路径为 `/api/docs`；生产环境仅在 `SWAGGER_ENABLED=true` 时启用。
- 静态上传访问路径为 `/uploads/`。

## 3. 数据访问与审计

- 数据访问主要通过 Prisma。
- 权限模型包括 `Role`、`Permission`、`RolePermission`、`FineGrainedPermission`、`UserPermission`、`DepartmentPermission`。
- 审计相关模型包括 `OperationLog`、`LoginLog`、`PermissionLog`、`SensitiveLog`。
- 敏感配置应通过环境变量提供，不应写入仓库。

## 4. 生产配置要求

部署前至少确认：

- `JWT_SECRET` 使用强随机值，且不要复用 README 示例值。
- `DATABASE_URL`、MinIO、Redis、SSO 等凭据来自安全的环境变量或 secret 管理。
- 生产 CORS 只允许真实前端域名。
- 生产环境不要开启 Swagger，除非临时诊断并显式设置 `SWAGGER_ENABLED=true`。
- `/uploads/` 的公开访问范围符合业务要求。
- 反向代理启用 HTTPS。
- 数据库、MinIO、Redis 不直接暴露到公网。

## 5. 依赖安全检查

本文件不内置固定漏洞结论。依赖状态会随时间变化，检查时以当前命令输出为准：

```bash
npm audit
npm audit --omit=dev
npm outdated
```

依赖升级后至少运行：

```bash
npm run build:server
npm run build:client
npm run test:server
npm run test:client
```

## 6. 安全报告

如发现安全问题，请通过项目维护者约定渠道报告。不要在公开 issue 中发布可利用细节、真实密钥、生产数据或攻击步骤。

报告中建议包含：

- 受影响版本或 commit。
- 影响范围。
- 最小复现。
- 已知缓解方式。
