# GAP-408 Training Archive Route Design

## 背景

培训档案前端页面直接调用 `/api/v1/training/archives`，但后端控制器声明为 `@Controller('training/archive')`。同时前端路径自带 `/api/v1`，会和 request baseURL 叠加，形成双前缀。

## 设计结论

保持后端 `training/archive` 单数路径不变，修正前端并补齐后端详情读取合同：

- `/api/v1/training/archives` -> `/training/archive`
- `/api/v1/training/archives/:id` -> `/training/archive/:id`
- 下载路径统一为 `/training/archive/:id/download`。

同时，`ArchiveService.findArchives()` 当前返回数组，前端不能继续按 `{ data, total }` 读取；列表页要兼容数组响应，避免路径修好后仍显示空表。

## 范围

修改：

- `client/src/views/training/archives/ArchiveList.vue`
- `client/src/views/training/archives/ArchiveDetail.vue`
- `server/src/modules/training/archive.controller.ts`
- `server/src/modules/training/archive.service.ts`

不做：

- 不改后端 `ArchiveController` 路由命名。
- 不重构培训档案数据结构。
- 不改培训档案 PDF 生成逻辑。

## 验收

- `rg "/api/v1/training/archives" client/src/views/training/archives` 无结果。
- 档案列表请求路径为 `/api/v1/training/archive`。
- 档案详情请求路径为 `/api/v1/training/archive/:id`，后端返回单条档案。
- 档案下载请求路径为 `/api/v1/training/archive/:id/download`。

## Superpower 与 grill-me 校准记录

- `brainstorming`：确认主问题是前端硬编码路径与后端 controller 路径不一致。
- `grill-me`：路径修复后详情页仍需要单条档案读取；补 `GET /training/archive/:id` 是同一合同闭环，不涉及 schema。
- `writing-plans`：见 `docs/superpowers/plans/2026-05-01-gap-408-training-archive-route-implementation.md`。
