# 移动端账号登录与旧小程序清理设计

## 背景

仓库当前同时存在 `miniprogram/` 和 `mobile/` 两套 uni-app 相关目录。`miniprogram/` 是早期微信小程序壳，页面少、配置占位、接口前缀与后端不一致，已经不适合作为后续移动端主线。`mobile/` 功能更完整，包含待办、记录、日历、设备、拍照、签名、离线同步等现场使用能力，应作为唯一移动端/小程序代码入口。

登录方案经过讨论后收敛为账号密码登录，不接入微信手机号快捷登录，不新增手机号字段，也不通过 `wechat_openid` 识别用户。这样系统只维护一套账号体系，管理员不需要额外维护手机号或微信绑定关系。

## 目标

1. 删除旧的 `miniprogram/` workspace，避免移动端入口重复。
2. 保留并整理 `mobile/` 的账号密码登录作为唯一移动端登录主线。
3. 让 `mobile/` 的 API 地址配置符合后端 `/api/v1` 前缀和服务器部署方式。
4. 验证移动端登录保存的 token/user 字段与后端 `/auth/login` 返回结构一致。

## 非目标

1. 不新增 `users.phone` 字段。
2. 不实现微信手机号快捷登录。
3. 不新增短信验证码登录。
4. 不在本次删除后端 `WechatModule` 或 `/auth/wechat/miniprogram`。微信订阅消息或历史微信接口是否保留，后续单独评估。
5. 不重做 `mobile/` 其他业务页面。

## 方案

### 1. 清理 `miniprogram/`

删除 `miniprogram/` 目录，并移除所有构建和依赖入口中的引用：

- 根 `package.json` 的 `workspaces` 删除 `"miniprogram"`。
- 根 `package-lock.json` 移除 `noidear-miniprogram` workspace 及其依赖记录。
- `client/Dockerfile` 和 `server/Dockerfile` 不再复制 `miniprogram/package.json`。
- 文档中描述历史 npm workspace 治理的归档内容不强行重写；但当前运行入口和构建入口不得再依赖 `miniprogram`。

本地未跟踪的 `miniprogram/.env` 属于环境文件，不纳入提交。删除目录时只处理已纳入仓库的代码和配置。

### 2. `mobile/` 登录主线

`mobile/` 保持账号密码登录：

- 登录页字段为账号和密码。
- 登录接口继续调用 `/auth/login`。
- 登录成功后沿用现有 token/user store。
- 不显示微信登录、手机号登录或绑定入口。
- 文案应明确这是系统账号登录，避免用户误以为需要微信授权。

后端 `/auth/login` 当前返回结构为：

```ts
{
  token: string,
  user: {
    id: string,
    username: string,
    name: string,
    role: string
  }
}
```

`mobile` 类型和存储逻辑应与这个结构一致。若移动端现有 `UserInfo` 类型仍使用 `realName`、`department`、`position`、`avatar` 等必填字段，应调整为与实际后端登录响应兼容，避免登录成功后前端读取用户信息时出现字段错位。

### 3. API 地址配置

`mobile/src/config/env.ts` 当前默认值是 `http://localhost:3000/api`，但后端 `main.ts` 设置的全局前缀是 `/api/v1`。本地开发默认值应改为：

```env
http://localhost:3000/api/v1
```

`localhost` 只作为本地开发兜底值，不代表服务器部署地址。生产构建必须通过环境变量显式指定真实 HTTPS API 域名，例如：

```env
VITE_API_BASE_URL=https://api.example.com/api/v1
```

微信小程序真机或线上运行时，请求域名还必须在微信小程序后台配置为合法 request 域名。构建产物会固化当次构建读取到的 `VITE_API_BASE_URL`，所以上线构建不能依赖 `localhost` 兜底值。

建议补充或更新 `mobile/.env.example`，说明本地和生产的 `VITE_API_BASE_URL` 写法。

### 4. 后端微信相关边界

后端已有 `WechatModule`、微信订阅消息服务和 `/auth/wechat/miniprogram`。本次不把它们接入 `mobile` 登录，也不在本次删除它们。

原因：

- 本次目标是收敛移动端登录入口，不是清理所有微信能力。
- `WechatModule` 可能还服务于订阅消息等独立能力。
- 删除微信后端接口需要额外确认调用方、迁移和历史数据，不应混入本次移动端入口清理。

## 数据流

账号登录数据流如下：

1. 用户打开 `mobile` 登录页。
2. 用户输入系统账号和密码。
3. `mobile` 调用 `POST /api/v1/auth/login`。
4. 后端校验用户名、密码、账号状态和锁定状态。
5. 后端返回 `token` 和 `user`。
6. `mobile` 保存 token/user，跳转首页。
7. 后续请求由 `mobile/src/utils/request.ts` 注入 `Authorization: Bearer <token>`。

失败场景：

- 账号或密码错误：展示后端错误信息。
- 账号禁用：展示“账号已被禁用”。
- 账号锁定：展示“账号已被锁定”。
- API 地址未配置或不可达：展示网络错误，并通过部署文档要求修正 `VITE_API_BASE_URL`。

## 验收标准

1. 根 `package.json` 不再包含 `miniprogram` workspace。
2. `package-lock.json` 不再包含 `noidear-miniprogram` workspace。
3. Dockerfile 不再复制 `miniprogram/package.json`。
4. `mobile` 能执行微信小程序构建：

```bash
npm run build:mp-weixin -w mobile
```

5. 后端账号密码登录相关测试通过。
6. `mobile` 登录后保存的 token/user 字段与后端 `/auth/login` 返回结构一致。
7. `mobile` 本地默认 API 地址包含 `/api/v1`。
8. 生产部署说明或 `.env.example` 明确要求配置 `VITE_API_BASE_URL=https://真实域名/api/v1`。
9. 本次提交不包含 `.env`、测试报告、coverage、dist 等本地未跟踪产物。

## 风险与处理

### 风险：删除 `miniprogram/` 后仍有构建引用

处理：实现时用 `rg "miniprogram|noidear-miniprogram"` 检查当前运行配置、Dockerfile、lockfile 和脚本，确保运行入口无残留引用。历史设计文档中的归档文字可保留。

### 风险：移动端用户类型与后端响应不一致

处理：以 `/auth/login` 当前响应为准调整 `mobile/src/types/index.ts` 和 store 使用方式。不要要求后端为移动端补无关字段。

### 风险：上线构建误用 localhost

处理：更新默认开发值和 `.env.example`，并在验收中明确生产必须配置 `VITE_API_BASE_URL`。如果生产构建未配置该变量，应在部署文档或构建检查中暴露出来。

## 后续可选工作

1. 单独评估是否废弃 `/auth/wechat/miniprogram`。
2. 单独评估微信订阅消息是否仍需要 `wechat_openid`。
3. 如果未来确实需要免密登录，再重新设计手机号、微信授权、账号绑定和审计边界。
