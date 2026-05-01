# GAP-409 Training Project Status Endpoints Design

## 背景

前端 `client/src/api/training.ts` 提供：

- `startTrainingProject(id)` -> `POST /training/projects/:id/start`
- `completeTrainingProject(id)` -> `POST /training/projects/:id/complete`
- `cancelTrainingProject(id, reason)` -> `POST /training/projects/:id/cancel`

后端 `TrainingController` 目前只有 `PUT /training/projects/:id/status`，因此前端项目详情页上的开始、完成、取消操作会请求 404。

## 设计结论

保留现有通用 `PUT /projects/:id/status` 端点，同时补齐三个语义化 POST 端点作为前端合同：

- `POST projects/:id/start` -> `updateProjectStatus(id, 'ongoing')`
- `POST projects/:id/complete` -> `updateProjectStatus(id, 'completed')`
- `POST projects/:id/cancel` -> `updateProjectStatus(id, 'cancelled')`

理由：

- 前端多个页面已经使用语义化函数，改后端能最小化页面影响。
- 后端已有状态流转校验，三个新端点只复用现有 service，不复制状态机。
- `cancel` 的 reason 当前 service 未持久化，本 GAP 不新增字段，避免 schema 扩张。

## 范围

修改：

- `server/src/modules/training/training.controller.ts`
- `server/src/modules/training/training.service.spec.ts` 或 controller spec（优先 controller spec）

不做：

- 不新增取消原因字段。
- 不改培训项目状态机。
- 不改前端 API 函数名。

## 验收

- 三个 POST 端点存在且受 `JwtAuthGuard` 保护。
- 调用后复用现有 `updateProjectStatus()`，状态流转规则仍由 service 控制。
- 培训项目状态端点测试通过。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认前端语义化操作和后端通用状态更新端点不一致。
- `grill-me`：选择补后端语义化端点，避免前端多处行为改动，同时不复制业务逻辑。
- `writing-plans`：见 `docs/superpowers/plans/2026-05-01-gap-409-training-project-status-endpoints-implementation.md`。
