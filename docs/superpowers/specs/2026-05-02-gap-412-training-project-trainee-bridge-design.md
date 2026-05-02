# GAP-412 TrainingProject Trainee Bridge 设计

## 背景和现状

GAP-412 已验证：培训模块当前把 `TrainingProject.trainees` 存为 `String[]` 学员 ID 数组。该字段没有 Prisma relation，也没有数据库外键约束。创建、更新、添加、移除学员、考试准入、档案生成和前端统计都直接读取这个数组。

这会让培训参与人名单变成脱离 `User` 主数据的平行关联事实：数组里可以保留不存在、已软删除或已停用的用户 ID；前端只能额外查询用户状态，数据库无法阻止脚本、旧接口或脏数据写入无效学员。

本 GAP 的目标是把培训项目与学员之间的多对多关系迁移到桥接表 `TrainingProjectTrainee(projectId, userId)`，让培训名单回到 `TrainingProject -> TrainingProjectTrainee -> User` 的可约束关系，同时保留当前 API 对 `trainees: string[]` 的兼容投影，降低执行 PR 的改动面。

## 当前代码事实源

- `docs/module-usage/11-training-internal-audit.md`：GAP-412 标记为 P2、已验证，建议为 TrainingProject 学员关系引入桥接表，替代 `trainees String[]`，并注明需要数据迁移。
- `docs/module-usage/97-gap-triage.md`：GAP-412 当前为 `needs_spec`，推荐 `brainstorming -> grill-with-docs -> writing-plans`。
- `docs/module-usage/module-usage.manifest.json`：GAP-412 当前 `triageStatus = needs_spec`，`specPath` 与 `planPath` 为空。
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：`Employee` 是跨模块高复用基础实体；下游不应重复维护人员事实源。当前 noidear 代码中培训学员实际引用 `User.id`。
- `server/src/prisma/schema.prisma`：`TrainingProject` 当前含 `trainees String[]`，`User` 模型有 `status`、`deletedAt`、`departmentId` 等可用于人员状态与展示。
- `server/src/modules/training/dto/create-project.dto.ts`：创建培训项目时 `trainees: string[]` 必填，限制 1-100 人。
- `server/src/modules/training/dto/update-project.dto.ts`：当前 DTO 未声明 `trainees`，但 `TrainingService.updateProject()` 仍按 `dto.trainees` 处理学员同步。
- `server/src/modules/training/training.service.ts`：`createProject()` 写入 `trainees` 数组并创建学习记录；`addTrainees()`、`removeTrainee()` 直接改数组；`createTodoTasksForProject()` 用数组生成待办。
- `server/src/modules/training/exam.service.ts`：考试开始和提交用 `project.trainees.includes(userId)` 判断学员身份。
- `server/src/modules/training/archive.service.ts`：培训档案 PDF 用 `project.trainees.length` 输出总人数。
- `client/src/types/training.ts`、`client/src/api/training.ts`、`client/src/views/training/**`：前端创建/编辑仍提交 `trainees: string[]`，列表和详情使用 `project.trainees.length` 或 `traineeCount` 展示人数。

## 任务类型判断

GAP-412 是 `needs_spec`。它影响 Prisma schema、历史数据迁移、培训事实源和 User 主数据引用完整性，必须先写 spec，再做 grill-with-docs 校准，最后输出 implementation plan。

## Brainstorming 方案比较

### 方案 A：只在服务层校验 `trainees` 数组

创建或更新项目时校验 `User` 存在且 active，但继续存 `String[]`。实现最小，但数据库仍无法建立 FK，脚本或旧路径仍可写入脏 ID；User 删除/停用后也无法通过 relation 查询状态。这不能真正关闭 GAP-412。

### 方案 B：新增桥接表，但保留旧 `trainees` 字段双写过渡

新增 `TrainingProjectTrainee`，新路径写桥接表，同时保留 `TrainingProject.trainees` 并双写。迁移风险较低，但会产生两个事实源，需要额外一致性校验，且后续还要再做一次删除旧字段的 PR。

### 方案 C（推荐）：桥接表成为唯一持久事实源，API 返回旧数组投影

新增 `TrainingProjectTrainee`，迁移现有数组数据，随后删除 `TrainingProject.trainees` 字段。服务层用桥接表维护学员关系，并在返回给前端时投影出 `trainees: string[]`、`traineeCount` 和可选 `traineeList`。前端提交合同暂时不变，执行 PR 不必重写页面表单结构。

推荐方案 C，因为它一次性消除数据库层平行事实源，同时保留当前 API 形态，让执行范围集中在 schema、migration、training service、exam service、archive service、类型和 focused tests。

## 业务边界

本 GAP 只重构培训项目的学员关系事实源：

- `TrainingProjectTrainee` 是 TrainingProject 与 User 的桥接表。
- 新增培训项目、批量替换学员、添加学员、移除学员均写桥接表。
- 新写入的学员必须是存在、未软删除、状态为 `active` 的 `User`。
- 已迁移的历史学员关系保留人员状态快照查询能力；若历史用户已停用但仍存在，应保留关系，不自动删除培训证据。
- API 对前端继续返回 `trainees: string[]` 兼容字段，该字段由桥接表派生，不再是数据库列。
- `LearningRecord`、`TodoTask`、`ExamRecord` 仍按现有模型存在；学员桥接表负责名单事实源，学习记录负责学习/考试状态。

## 不做什么

- 不新增 Employee 独立模型；当前代码事实源仍是 `User`，业务口径中的 Employee 在本 GAP 中映射为 `User`。
- 不改培训项目页面的主交互，不把前端 `trainees` DTO 改成新的对象数组。
- 不把 `trainerId` 一并重构为 FK；本 GAP 只处理 trainees。
- 不重构 `documentIds String[]` 或 AuditPlan 的文件数组；这些属于其他 GAP。
- 不改变培训计划审批、培训项目状态机、考试评分规则、档案 PDF 归档规则。
- 不把培训模块接入追溯主链；培训仍是治理/管理支持模块，不关联 ProductionBatch、MaterialBatch 或 BatchMaterialUsage。
- 不自动把历史 orphan 学员 ID 猜测为其他用户，不按姓名、部门或相似账号做回填。

## 数据、接口和页面影响

### 数据影响

- 新增 Prisma 模型 `TrainingProjectTrainee`，映射表名 `training_project_trainees`。
- 建议字段：
  - `id String @id @default(cuid())`
  - `projectId String`
  - `userId String`
  - `createdAt DateTime @default(now())`
  - `project TrainingProject @relation(fields: [projectId], references: [id], onDelete: Cascade)`
  - `user User @relation(fields: [userId], references: [id], onDelete: Restrict)`
  - `@@unique([projectId, userId])`
  - `@@index([projectId])`
  - `@@index([userId])`
  - `@@map("training_project_trainees")`
- `TrainingProject` 删除持久字段 `trainees String[]`，新增 `traineeLinks TrainingProjectTrainee[]`。
- `User` 新增反向关系 `trainingProjectTrainees TrainingProjectTrainee[]`。
- migration 在删除旧列前：
  - 检查 `training_projects.trainees` 是否存在 orphan user id。
  - 检查是否存在空学员数组的项目；如果业务要求每个项目至少一名学员，应 fail-fast。
  - 将每个数组元素 `DISTINCT` 后插入 `training_project_trainees`。
  - 删除 `training_projects.trainees` 列。

### 接口影响

- `POST /training/projects` 请求合同暂时保持 `trainees: string[]`。
- `PUT /training/projects/:id` 如允许替换学员名单，DTO 必须显式声明 `trainees?: string[]`，并沿用 1-100 人限制。
- `POST /training/projects/:id/trainees` 当前前端 `addTrainee(projectId, userId)` 发送 `{ userId }`，服务端 controller 当前读取 `{ userIds }`。执行 PR 必须兼容 `{ userId }` 和 `{ userIds }`，避免桥接重构后添加学员接口仍不可用。
- `GET /training/projects` 和 `GET /training/projects/:id` 继续返回 `trainees: string[]`；该字段由 `traineeLinks.map(link => link.userId)` 派生。
- 详情接口可返回 `traineeList`，包含 `id`、`username`、`name`、`status`、`deletedAt`、`departmentId` 或现有可安全展示字段，用于后续页面展示离职/停用状态。
- `ExamService.startExam()` 与 `submitExam()` 必须通过桥接表或 include 的 `traineeLinks` 判断用户是否为学员。
- `ArchiveService` 必须用桥接表人数或 `learningRecords.length` 输出总人数，不再读取数据库列 `project.trainees`。

### 页面影响

- 创建/编辑表单继续维护 `form.trainees: string[]`，不做 UI 重构。
- 列表、详情和统计页继续优先使用 `traineeCount`，否则读取 API 投影的 `trainees.length`。
- 前端类型保留 `TrainingProject.trainees: string[]`，并可补充 `traineeList` 中的人员状态字段。
- `client/src/api/training.ts` 的 `addTrainee()` 请求体应与后端兼容，推荐统一为 `{ userIds: [userId] }` 或后端兼容 `{ userId }`。

## 历史数据和迁移策略

本 GAP 需要数据库迁移，但不自动修复业务不明的历史脏数据：

1. migration 先创建桥接表。
2. migration 检查 `training_projects.trainees` 中是否存在找不到 `User.id` 的 orphan ID；发现则抛错并停止。
3. migration 检查是否存在空学员数组；如果存在，执行 agent 必须停止并回报，因为当前 DTO 要求至少一名学员，是否允许历史空项目需要业务确认。
4. migration 将旧数组展开并插入 `training_project_trainees`，同一项目重复 userId 只保留一条。
5. migration 删除 `training_projects.trainees` 列。
6. 不基于姓名、部门、学习记录、待办任务或考试记录猜测修复 orphan 学员。
7. 历史已停用但仍存在的 User 不阻断迁移；它是历史培训证据的一部分。新建和新增学员路径必须阻止 inactive 或 deleted user。

## Superpower 与 grill-me 校准记录

- **brainstorming 结论：** 采用“桥接表唯一事实源 + API 兼容数组投影”。只做服务层校验不能建立数据库完整性；双写过渡会留下两个事实源。
- **grill-with-docs 校准结论：**
  - 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 不冲突；业务口径中的 Employee 在当前代码实现中落到 `User`，本设计复用 `User`，不新增人员事实源。
  - 不重复造主数据或事实源；`TrainingProjectTrainee` 只是 TrainingProject 与 User 的桥接关系，不保存姓名、部门等人员副本。
  - 不引入平行批次链路；培训模块不进入追溯主链，不关联 ProductionBatch、MaterialBatch、BatchMaterialUsage 或 InventoryMovement。
  - 不破坏 ProductionBatch / MaterialBatch / BatchMaterialUsage / InventoryMovement 主链；本 GAP 只影响培训治理模块。
  - 需要历史数据迁移，orphan 用户 ID 或空学员项目会使 migration preflight 停止，执行 agent 必须回报而不是猜测修复。
  - 不需要新增业务确认，除非 migration preflight 发现历史数据不满足当前“项目至少一名学员且学员必须存在”的合同。
  - 可拆成独立小 PR，集中在 training schema、migration、service、exam、archive、API 类型和 focused tests。
  - 可由执行 agent 按 `superpowers:executing-plans` 独立完成；若当前代码已先行重构或与本 spec 冲突，执行 agent 必须停止并回报。

## 验收标准

- Prisma schema 中存在 `TrainingProjectTrainee` 模型，`TrainingProject` 与 `User` 均有对应 relation。
- Prisma schema 中 `TrainingProject.trainees String[]` 被移除，不再作为持久事实源。
- migration 能从 `training_projects.trainees` 展开迁移到 `training_project_trainees`，并在 orphan 用户或空学员历史数据出现时 fail-fast。
- `POST /training/projects` 使用桥接表写入学员关系，并同步创建 `LearningRecord` 和 `TodoTask`。
- `PUT /training/projects/:id` 或添加/移除学员接口通过桥接表维护名单，并同步学习记录和待办。
- `GET /training/projects`、`GET /training/projects/:id` 返回兼容的 `trainees: string[]`、`traineeCount`，详情可返回 `traineeList`。
- `ExamService` 不再调用 `project.trainees.includes()`，考试准入通过桥接表判断。
- `ArchiveService` 不再读取数据库列 `project.trainees`。
- 新写入学员必须校验 User 存在、`deletedAt IS NULL`、`status = active`；无效用户返回明确 400。
- `client/src/types/training.ts` 与 `client/src/api/training.ts` 和服务端合同一致。
- `(cd server && npx prisma validate --schema src/prisma/schema.prisma)` 通过。
- `(cd server && npm test -- training.service.spec.ts exam.service.spec.ts --runInBand)` 通过；如果当前仓库没有 `exam.service.spec.ts`，执行 agent 必须记录缺失并跑现有 training focused tests。
- `npm run build:client` 通过。
- `node tools/check-module-usage-docs.mjs` 在文档回写后通过。
