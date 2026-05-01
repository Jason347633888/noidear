# GAP-402 文控派生培训需求入口澄清实施计划

> **给执行 agent：** 必须使用 `superpowers:executing-plans` 按本计划逐项执行。只做入口澄清和已有关联能力的轻量补齐，不重做培训模块，不改表结构。如果当前代码与本计划描述不一致，停止并回报主 agent。

**目标：** 让 `documents/operations/training-needs` 页面清楚表达它是“文控派生培训需求入口”，不是培训项目主入口；并尽量复用已有 `linkTrainingNeed` API 连接到培训项目。

**GAP：** `GAP-402`

**Spec：** 不需要。本任务是低风险前端体验和已有 API 使用补齐，不涉及 schema 或历史数据迁移。

**业务边界：**

- `DocumentTrainingNeed` 来源于文控文件变更、阅读确认和影响分析，是文控派生需求。
- `TrainingProject` 是培训模块的执行项目。
- 本计划只让页面边界更清楚，并提供到培训项目的操作入口，不把两套事实源合并。

**非目标：**

- 不新增培训项目 schema。
- 不新增新的培训项目创建流程。
- 不修改 `DocumentTrainingNeed` 数据结构。
- 不把培训模块页面并入文控页面。
- 不处理 GAP-403 的 283 表单落地批量确认。

---

## 文件范围

- 修改：`client/src/views/documents/TrainingNeedCenter.vue`
- 检查：`client/src/api/document-operations.ts`
- 检查：`client/src/router/index.ts`
- 可选新增/修改：相邻前端测试文件（如果已有相同页面测试模式）

---

## 任务 1：页面定位澄清

**文件：**

- `client/src/views/documents/TrainingNeedCenter.vue`

- [ ] 在页面顶部加入紧凑说明或状态条，明确这是“文控派生培训需求”，不是“培训项目列表”。
- [ ] 增加跳转到 `/training/projects` 的操作入口，命名要清楚，例如“查看培训项目”。
- [ ] 不使用大面积营销式说明，不改变页面主要表格结构。
- [ ] 保持现有状态筛选和刷新功能。

**验收：**

- 用户进入页面后能区分“派生需求”和“培训项目”。
- 页面不会新增一套培训项目编辑表单。

---

## 任务 2：补齐关联培训项目操作

**文件：**

- `client/src/views/documents/TrainingNeedCenter.vue`
- `client/src/api/document-operations.ts`

- [ ] 确认 `documentOperationsApi.linkTrainingNeed(id, linkedTrainingProjectId)` 已存在。
- [ ] 在表格操作区增加“关联项目”入口。
- [ ] 用简洁弹窗让用户输入或选择培训项目 ID；如果项目选择器当前不存在，可以先用 ID 输入，但文案必须说明这是关联已有培训项目。
- [ ] 调用 `linkTrainingNeed` 成功后刷新列表。
- [ ] 不在本 PR 新做培训项目选择器，不引入新 API。

**验收：**

- 已接受或待评估的派生需求可以关联到已有培训项目。
- 关联后页面刷新，状态可以反映后端返回结果。

---

## 任务 3：列表信息补足

**文件：**

- `client/src/views/documents/TrainingNeedCenter.vue`

- [ ] 如果 row 中存在 `linkedTrainingProjectId`，在列表中显示。
- [ ] 如果 row 中存在 `document.title`，保持文件标题列。
- [ ] 不假设后端一定返回不存在的字段；模板里用安全降级显示 `-`。

**验收：**

- 用户能看到某条派生需求是否已经关联培训项目。

---

## 任务 4：验证

运行：

```bash
rg -n "文控派生培训需求|linkTrainingNeed|linkedTrainingProjectId|/training/projects" client/src/views/documents/TrainingNeedCenter.vue client/src/api/document-operations.ts
npm run build:client
node tools/check-module-usage-docs.mjs
git diff --check
```

**最终回报必须包含：**

- 已确认使用 `superpowers:executing-plans`。
- 修改的文件列表。
- 是否新增了培训项目选择器；如没有，说明仍用已有项目 ID 关联。
- 验证命令结果。
- 确认没有修改 schema 或后端 API。
