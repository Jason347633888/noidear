# 系统更新中心设计

## 背景

当前项目已经可以通过 Docker Compose 在服务器上运行，远端 `/app` 是 Git 仓库，服务由 `noidear-client`、`noidear-server`、`noidear-postgres`、`noidear-redis`、`noidear-minio` 组成。现在的上线方式主要依赖人工 SSH 到服务器后执行拉代码、构建镜像、同步 schema、重启容器和检查日志。

这个方式能用，但存在几个问题：

- 发布过程依赖人工记忆，容易漏掉备份、健康检查或数据校验。
- staging 和 production 没有明确门禁，无法稳定区分“测试通过”和“正式发布”。
- 远端数据库存在 migration history 漂移，不能无脑执行 `prisma migrate deploy`。
- 每次更新后缺少系统内可见的版本、日志、失败原因和回滚记录。
- 数据库和 MinIO 文件必须保护，不能因为发布新版本导致历史数据丢失。

本设计目标是新增一个完整但不过度复杂的更新机制：GitHub Actions 自动部署 staging，admin 在后台批准 production，服务器本地 Docker Compose 构建和启动，发布前备份，发布后冒烟，失败可回滚，数据库和 MinIO 恢复必须由 admin 二次确认。

## 目标

- 让合并到 `master` 后的代码自动部署到 staging。
- 让 production 发布必须由 admin 明确批准。
- 保留历史业务数据，发布新版本不是重新安装系统。
- 用受控脚本处理 schema、系统数据、配置和初始化数据，不在生产库上乱跑危险迁移。
- 发布前自动备份数据库，并记录 MinIO 文件清单或快照。
- 发布后自动执行健康检查和业务冒烟测试。
- 失败时自动回滚应用代码和容器。
- 数据库和 MinIO 恢复能力完整保留，但执行时必须二次确认。
- 在后台提供“系统更新中心”，展示版本、更新日志、环境状态、发布记录、备份、回滚、健康检查和错误日志。

## 非目标

- 第一版不引入 Kubernetes。
- 第一版不强制引入镜像仓库。服务器本地执行 `docker compose build/up`，后续可以升级为不可变镜像发布。
- 第一版不做 canary 流量灰度。
- 不允许自动清空数据库、重置 volume、清空 MinIO bucket。
- 不把用户业务数据当作 seed 数据覆盖。
- 不让 NestJS Web 进程直接重启自己。实际部署动作由 GitHub Actions 通过 SSH 执行服务器脚本。

## 环境模型

系统按多环境设计：

- `development`：本地开发环境。
- `staging`：测试/预发布环境，当前可对应 `119.91.216.201`。
- `production`：正式环境，后续可独立服务器。

每个环境需要独立记录：

- 环境名称。
- 服务器地址。
- 当前 Git tag。
- 当前 commit hash。
- 当前部署时间。
- 当前数据库 schema 状态。
- 最近一次备份路径。
- 最近一次健康检查结果。
- 最近一次业务冒烟结果。

发布顺序：

```text
PR 合并到 master
→ GitHub Actions 自动部署 staging
→ staging 自动健康检查和业务冒烟
→ 通过后生成可发布版本
→ admin 在系统更新中心批准发布 production
→ GitHub Actions 执行 production 发布
→ production 自动只读冒烟
→ 记录发布结果
```

## 版本模型

版本采用组合模式：

- Git tag：业务版本，例如 `v1.2.3`。
- commit hash：精确代码来源，例如 `876b8c7`。
- 构建时间：GitHub Actions 执行时间。
- 部署环境：`staging` 或 `production`。
- 部署方式：服务器本地 Docker Compose 构建。
- 构建产物：当前阶段记录镜像 id，后续升级镜像仓库后记录 image digest。
- 更新日志：分层展示。

系统内默认展示业务版本和中文摘要，展开后显示 commit、PR、构建日志、部署日志、schema 变更、数据脚本和备份路径。

## 更新日志

更新日志分四层：

- 用户层：中文摘要，说明新增、优化、修复了什么。
- 管理员层：影响模块、是否需要手动验证、是否包含数据库/数据/配置变更。
- 技术层：PR、commit、tag、构建日志、部署日志、schema 脚本、数据脚本。
- 审计层：谁批准、谁触发、什么时候执行、结果是什么、是否回滚。

更新日志来源：

- GitHub PR 标题和标签。
- commit 列表。
- 手工补充的 Release Note。
- 发布过程中自动生成的检查结果。

## 数据策略

数据分成四类处理。

### 用户业务数据

包括文档、审批记录、供应商、产品、体系文件、上传 PDF、待办、流程实例、历史版本等。

规则：

- 默认不覆盖。
- 默认不删除。
- 发布前必须备份。
- 发布后通过迁移或兼容逻辑继续接到新版本。
- 禁止使用 `prisma migrate reset`、`prisma db push --force-reset`、`DROP DATABASE`、删除 Docker volume、清空 MinIO bucket 作为常规更新动作。

### 数据库 schema

schema 更新必须受控：

- 发布前检测当前数据库和 Prisma schema 差异。
- 如果 migration history 正常，优先使用 `prisma migrate deploy`。
- 如果 migration history 漂移，进入“受控 schema 对齐”流程，不直接乱跑 migrate。
- 破坏性变更必须拆分为 expand-contract 多阶段：
  - 先新增字段/表。
  - 代码兼容新旧结构。
  - 后台迁移历史数据。
  - 确认完成后再删除旧字段。

### 系统数据

包括权限、菜单、审批定义、流程模板、系统配置、初始化模板。

规则：

- 通过受控数据脚本更新。
- 每个脚本必须有唯一 id、说明、版本、幂等性说明、是否可回滚说明。
- 脚本执行结果写入 `UpdateDataScriptRun` 或同等记录。
- 允许新增和必要更新，不允许粗暴覆盖用户业务修改。

### 文件和对象存储

包括 MinIO 中的 PDF、证照、外检报告、体系文件附件。

规则：

- 发布前记录 MinIO 文件清单。
- 高风险发布可创建 MinIO 快照或按 bucket 备份。
- 发布后校验数据库引用的文件是否存在。
- 数据库恢复和 MinIO 恢复必须成对评估，避免数据库指向不存在的文件。

## 发布流程

### staging 自动发布

触发条件：

- `master` 被更新。
- 或 GitHub Actions 手动触发 `workflow_dispatch`。

流程：

```text
1. GitHub Actions 连接 staging 服务器。
2. 记录当前版本和容器状态。
3. 备份数据库。
4. 生成 MinIO 文件清单。
5. 拉取最新代码。
6. 执行 schema 检测和受控 schema 对齐。
7. 执行受控系统数据脚本。
8. docker compose build server client。
9. docker compose up -d server client。
10. 执行基础健康检查。
11. 执行业务冒烟测试。
12. 写入发布记录。
13. 失败时自动回滚代码和容器。
```

### production 手动发布

触发条件：

- staging 发布成功。
- staging 业务冒烟通过。
- admin 在系统更新中心点击“发布到正式环境”。

流程：

```text
1. admin 查看版本、更新日志、schema 变化、数据脚本、staging 检查结果。
2. admin 确认发布 production。
3. GitHub Actions 执行 production 发布。
4. production 发布前强制数据库备份。
5. production 发布后执行只读冒烟测试。
6. 成功后记录 production 当前版本。
7. 失败时自动回滚代码和容器。
```

## 回滚策略

回滚分层处理。

### 应用回滚

应用回滚可以自动执行：

- 切回上一个 Git commit 或 tag。
- 重新构建旧版本镜像。
- 重启 server/client。
- 执行健康检查。
- 写入回滚记录。

应用回滚适用于：

- 容器启动失败。
- 首页不可访问。
- 后端关键接口失败。
- 冒烟测试失败。

### 数据库恢复

数据库恢复必须 admin 二次确认：

- 系统展示备份时间、备份文件、恢复目标环境。
- 系统提示可能覆盖发布后新增数据。
- admin 输入确认信息后执行。
- 恢复后运行 schema 检查和只读冒烟。

### MinIO 恢复

MinIO 恢复必须 admin 二次确认：

- 系统展示文件清单差异。
- 系统提示可能覆盖发布后上传文件。
- 恢复后执行数据库引用文件一致性检查。

### 整体恢复

整体恢复包含：

- 应用版本回滚。
- 数据库备份恢复。
- MinIO 文件恢复。
- 配置恢复。
- 一致性检查。

整体恢复不是自动动作，只能由 admin 在明确影响范围后触发。

## 系统更新中心

新增后台入口：

- 菜单名：`系统更新中心`。
- 仅 admin 可访问。

页面能力：

- 环境总览：staging、production 当前版本和状态。
- 待发布版本：staging 通过但 production 未发布的版本。
- 更新日志：用户层、管理员层、技术层、审计层。
- 发布记录：每次发布的开始时间、结束时间、触发人、环境、结果。
- 健康检查：基础检查、接口检查、业务冒烟结果。
- 数据库备份：备份路径、大小、创建时间、关联发布记录。
- 数据脚本：脚本 id、说明、执行状态、错误原因。
- 回滚中心：应用回滚、数据库恢复、MinIO 恢复入口。

后台不会直接执行 Docker 命令。后台触发 production 发布或回滚时，调用 GitHub Actions workflow dispatch 或写入发布请求，再由 GitHub Actions 执行服务器脚本。

## 数据模型

建议新增以下模型或等价表：

### UpdateEnvironment

记录环境配置：

- `id`
- `name`
- `kind`
- `serverHost`
- `currentVersion`
- `currentCommit`
- `currentStatus`
- `lastDeploymentId`
- `createdAt`
- `updatedAt`

### UpdateRelease

记录一个可发布版本：

- `id`
- `versionTag`
- `commitHash`
- `sourceBranch`
- `sourceRunId`
- `summary`
- `releaseNotes`
- `status`
- `createdAt`

### UpdateDeployment

记录一次部署：

- `id`
- `releaseId`
- `environmentId`
- `triggeredBy`
- `triggerType`
- `status`
- `startedAt`
- `finishedAt`
- `previousCommit`
- `targetCommit`
- `backupId`
- `healthResult`
- `smokeResult`
- `errorMessage`

### UpdateBackup

记录备份：

- `id`
- `deploymentId`
- `environmentId`
- `backupType`
- `path`
- `size`
- `checksum`
- `createdAt`

### UpdateDataScriptRun

记录数据脚本：

- `id`
- `deploymentId`
- `scriptId`
- `scriptVersion`
- `status`
- `startedAt`
- `finishedAt`
- `errorMessage`

### UpdateActionAudit

记录人工操作：

- `id`
- `actorId`
- `action`
- `targetType`
- `targetId`
- `riskLevel`
- `confirmationText`
- `createdAt`

## GitHub Actions

需要两个 workflow：

### deploy-staging

触发：

- push 到 `master`。
- 手动触发。

职责：

- SSH 到 staging。
- 执行 `/app/scripts/deploy.sh staging <commit>`。
- 上传部署日志。
- 调用系统 API 或写入部署记录。

### deploy-production

触发：

- `workflow_dispatch`。
- 参数包含 release id、commit hash、admin id。

职责：

- 校验 staging 对应版本已通过。
- SSH 到 production。
- 执行 `/app/scripts/deploy.sh production <commit>`。
- 上传部署日志。
- 调用系统 API 或写入部署记录。

## 服务器脚本

核心脚本建议拆分：

- `scripts/deploy.sh`：主部署入口。
- `scripts/backup-db.sh`：数据库备份。
- `scripts/check-schema.sh`：schema 检测。
- `scripts/apply-schema.sh`：受控 schema 对齐。
- `scripts/run-data-scripts.sh`：执行系统数据脚本。
- `scripts/snapshot-minio.sh`：MinIO 清单或快照。
- `scripts/health-check.sh`：基础健康检查。
- `scripts/smoke-test.sh`：业务冒烟。
- `scripts/rollback-app.sh`：应用回滚。
- `scripts/restore-db.sh`：数据库恢复。
- `scripts/restore-minio.sh`：MinIO 恢复。

脚本原则：

- 所有脚本必须 `set -euo pipefail`。
- 所有关键步骤写日志。
- 所有危险动作需要显式参数。
- 不允许默认执行数据库重置。
- 每次发布生成独立目录：`/app/releases/<deployment-id>/`。

## 健康检查和业务冒烟

基础检查：

- client 首页返回 `200`。
- Swagger 或 API docs 返回 `200`。
- server 容器状态为 running。
- postgres、redis、minio 状态健康。

接口检查：

- admin 登录成功。
- 获取当前用户成功。
- 文档列表可读。
- 待办列表可读。
- 流程模板可读。

业务冒烟：

- 登录后进入首页。
- 打开体系文件中心。
- 查询文档列表。
- 打开文档详情。
- 查询引用健康接口。
- 查询更新中心当前版本。

production 冒烟必须只读，不创建业务数据。

## 错误处理

发布失败分级：

- `build_failed`：构建失败，不重启旧服务。
- `schema_failed`：schema 对齐失败，不继续发布。
- `data_script_failed`：数据脚本失败，不继续发布。
- `startup_failed`：容器无法启动，自动应用回滚。
- `health_failed`：健康检查失败，自动应用回滚。
- `smoke_failed`：业务冒烟失败，自动应用回滚。
- `rollback_failed`：回滚失败，标记为紧急人工处理。

错误必须记录：

- 所属发布。
- 所属环境。
- 失败阶段。
- 日志位置。
- 推荐处理动作。

## 权限和审计

权限：

- 只有 admin 可以进入系统更新中心。
- 只有 admin 可以批准 production 发布。
- 只有 admin 可以触发回滚。
- 数据库恢复和 MinIO 恢复需要二次确认。

审计：

- 发布批准。
- 发布取消。
- 应用回滚。
- 数据库恢复。
- MinIO 恢复。
- 重跑健康检查。
- 重跑数据脚本。

## 安全

- GitHub SSH key 存在 GitHub Secrets，不写入仓库。
- 服务器只允许部署脚本执行必要命令。
- 后台不展示敏感配置值。
- 备份文件路径可见，但下载权限需要 admin。
- 日志中需要过滤 JWT、密码、密钥、数据库连接串。

## 分阶段落地

虽然目标是全量功能，但实现建议分阶段，以减少风险。

### 阶段 1：服务器部署脚本和 GitHub Actions

- staging 自动部署。
- production 手动 workflow dispatch。
- 数据库备份。
- Docker Compose build/up。
- 基础健康检查。
- 应用回滚。

### 阶段 2：系统更新中心

- 环境总览。
- 发布记录。
- 更新日志。
- 健康检查结果。
- 手动触发 production 发布。

### 阶段 3：受控数据策略

- schema 漂移检测。
- 数据脚本登记和执行记录。
- 体系文件导入任务登记。
- MinIO 文件清单。

### 阶段 4：完整恢复能力

- 数据库恢复。
- MinIO 恢复。
- 数据库和 MinIO 一致性检查。
- 完整回滚审计。

### 阶段 5：升级不可变镜像发布

- GitHub Actions 构建镜像。
- 推送镜像仓库。
- 服务器 pull 镜像。
- 记录 image digest。

## 成功标准

- 合并到 `master` 后，staging 能自动部署并记录结果。
- staging 冒烟失败时不会允许发布 production。
- admin 可以在后台看到当前版本、待发布版本、更新日志和检查结果。
- admin 可以批准 production 发布。
- production 发布前一定有数据库备份。
- 发布失败时应用层能自动回滚。
- 数据库和 MinIO 恢复不会自动执行，必须 admin 二次确认。
- 历史业务数据不会因为发布新版本被覆盖或清空。
- 发布记录能回答：谁发的、发了什么、发到哪里、是否成功、失败原因、如何回滚。
