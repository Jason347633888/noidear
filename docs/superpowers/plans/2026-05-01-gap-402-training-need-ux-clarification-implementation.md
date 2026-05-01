# GAP-402 Training Need UX Clarification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign training projects or document training needs. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make the document-derived training need page clearly distinguish derived needs from actual training projects, and expose the existing link-to-project path.

**Architecture:** Reuse existing `DocumentTrainingNeedService.link()` and frontend API methods. Add UI copy and a focused link action in `TrainingNeedCenter.vue`; do not add new backend models.

**Tech Stack:** Vue 3, Element Plus, existing document operations API.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按项目文档和 `writing-plans` 要求完成上下文核对、范围收敛和 implementation plan 编写。
- **grill-me 校准结论：** 已确认 DocumentTrainingNeed 与 TrainingProject 不是同一个事实源；本次只改善入口说明和关联动作，不合并数据模型。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `client/src/views/documents/TrainingNeedCenter.vue`
- Modify only if needed: `client/src/api/document-operations.ts`
- Add/update focused frontend test only if there is an existing nearby test pattern.

## Task 1: Clarify page semantics

**Files:**
- Modify: `client/src/views/documents/TrainingNeedCenter.vue`

- [ ] **Step 1: Add a visible page note above the filter form**

Add an Element Plus alert near the top of the template:

```vue
<el-alert
  class="page-note"
  type="info"
  show-icon
  :closable="false"
  title="这里是文控派生培训需求，不是培训项目台账。接受后应关联到培训项目，由培训模块承接计划、签到、考试和档案。"
/>
```

- [ ] **Step 2: Add CSS spacing**

```css
.page-note {
  margin-bottom: 12px;
}
```

## Task 2: Expose link-to-training-project action

**Files:**
- Modify: `client/src/views/documents/TrainingNeedCenter.vue`

- [ ] **Step 1: Add action button for accepted needs**

In the operation column, keep existing accept/dismiss actions and add:

```vue
<el-button
  v-if="row.status === 'accepted'"
  link
  type="success"
  @click="openLinkDialog(row)"
>
  关联培训项目
</el-button>
```

- [ ] **Step 2: Add a dialog with project ID input**

Add after the table:

```vue
<el-dialog v-model="linkDialog.visible" title="关联培训项目" width="420px">
  <el-form label-width="100px">
    <el-form-item label="培训项目ID">
      <el-input v-model="linkDialog.projectId" placeholder="输入已有培训项目ID" clearable />
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="linkDialog.visible = false">取消</el-button>
    <el-button type="primary" :loading="linkDialog.loading" @click="submitLink">确认关联</el-button>
  </template>
</el-dialog>
```

- [ ] **Step 3: Add script state and methods**

```ts
const linkDialog = reactive({
  visible: false,
  loading: false,
  needId: '',
  projectId: '',
});

const openLinkDialog = (row: any) => {
  linkDialog.needId = row.id;
  linkDialog.projectId = row.linkedTrainingProjectId || '';
  linkDialog.visible = true;
};

const submitLink = async () => {
  if (!linkDialog.projectId.trim()) {
    ElMessage.warning('请输入培训项目ID');
    return;
  }
  linkDialog.loading = true;
  try {
    await documentOperationsApi.linkTrainingNeed(linkDialog.needId, linkDialog.projectId.trim());
    ElMessage.success('已关联培训项目');
    linkDialog.visible = false;
    fetchData();
  } finally {
    linkDialog.loading = false;
  }
};
```

If `reactive` is not imported, add it to the Vue import.

## Task 3: Verify

- [ ] **Step 1: Run focused frontend check**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build
```

Expected: build succeeds, or report exact unrelated blocker.

- [ ] **Step 2: Confirm no backend changes**

```bash
git diff -- server/src/modules/document/services/document-training-need.service.ts
```

Expected: no diff.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/documents/TrainingNeedCenter.vue
git commit -m "fix: clarify document-derived training needs"
```
