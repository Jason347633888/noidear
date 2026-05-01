# GAP-408 Training Archive Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Do not redesign training archive storage, PDF generation, or archive schema. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make training archive frontend requests match the backend `training/archive` route, add the missing archive detail read endpoint, and avoid duplicate `/api/v1` prefixes.

**Architecture:** Keep `training/archive` as the canonical backend route. Add a thin `GET /training/archive/:id` endpoint that reuses `ArchiveService`, and make frontend archive pages use request-wrapper-relative paths only.

**Tech Stack:** Vue 3, Element Plus, Axios request wrapper, NestJS route contract.

---

## Superpower 与 grill-me 校准记录

- **brainstorming：** 已核对 `ArchiveController` 是 `@Controller('training/archive')`，前端页面写了 `/api/v1/training/archives`。
- **grill-me：** 路径修复后详情页仍需要单条档案读取；补 `GET /training/archive/:id` 是同一合同闭环，不涉及 schema。
- **writing-plans：** 本计划覆盖列表/详情/下载路径修正和单条详情后端读取。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。

## Files

- Modify: `client/src/views/training/archives/ArchiveList.vue`
- Modify: `client/src/views/training/archives/ArchiveDetail.vue`
- Modify: `server/src/modules/training/archive.controller.ts`
- Modify: `server/src/modules/training/archive.service.ts`
- Test: `server/src/modules/training/archive.service.spec.ts` or `server/src/modules/training/archive.controller.spec.ts` if present; otherwise add focused service test only if project patterns allow minimal mocks.

## Task 1: Align Frontend Archive Paths

- [ ] **Step 1: Confirm current mismatch**

Run:

```bash
rg -n "/api/v1/training/archives|training/archive" client/src/views/training/archives server/src/modules/training/archive.controller.ts
```

Expected: frontend uses `/api/v1/training/archives`; backend uses `training/archive`; backend lacks `GET(':id')`.

- [ ] **Step 2: Update archive list request paths**

In `client/src/views/training/archives/ArchiveList.vue`, replace:

```ts
request.get<any>('/api/v1/training/archives', { params })
```

with:

```ts
request.get<any>('/training/archive', { params })
```

Then normalize the response so the page works with the current backend array response:

```ts
const res = await request.get<any[]>('/training/archive', { params });
const list = Array.isArray(res) ? res : ((res as any).data || []);
archives.value = list;
pagination.value.total = Array.isArray(res) ? res.length : ((res as any).total || list.length);
```

Replace:

```ts
request.get(`/api/v1/training/archives/${id}/download`, {
  responseType: 'blob',
})
```

with:

```ts
request.get(`/training/archive/${id}/download`, {
  responseType: 'blob',
})
```

- [ ] **Step 3: Update archive detail download paths**

In `client/src/views/training/archives/ArchiveDetail.vue`, replace all download calls:

```ts
request.get(`/api/v1/training/archives/${id}/download`, {
  responseType: 'blob',
})
```

with:

```ts
request.get(`/training/archive/${id}/download`, {
  responseType: 'blob',
})
```

For the detail fetch call, replace:

```ts
request.get<any>(`/api/v1/training/archives/${id}`)
```

with:

```ts
request.get<any>(`/training/archive/${id}`)
```

- [ ] **Step 4: Add archive detail service method**

In `server/src/modules/training/archive.service.ts`, add this method after `findArchives()`:

```ts
  async findArchiveById(id: string) {
    const archive = await this.prisma.trainingArchive.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            plan: {
              select: { year: true, title: true },
            },
          },
        },
      },
    });

    if (!archive) {
      throw new NotFoundException('培训档案不存在');
    }

    return {
      ...archive,
      pdfUrl: await this.storageService.getFileUrl(archive.pdfPath),
    };
  }
```

- [ ] **Step 5: Add archive detail controller route**

In `server/src/modules/training/archive.controller.ts`, keep `@Get(':id/download')` above the new detail route, then add:

```ts
  @Get(':id')
  @ApiOperation({ summary: '查询培训档案详情' })
  async findArchiveById(@Param('id') id: string) {
    return this.archiveService.findArchiveById(id);
  }
```

- [ ] **Step 6: Verify duplicate path removal and backend route**

Run:

```bash
rg -n "/api/v1/training/archives|training/archive|findArchiveById" client/src/views/training/archives server/src/modules/training/archive.controller.ts server/src/modules/training/archive.service.ts
```

Expected: no `/api/v1/training/archives` remains; frontend uses `/training/archive`; backend has `findArchiveById`.

- [ ] **Step 7: Run verification**

Run:

```bash
npm --prefix client run type-check
npm --prefix server test -- archive.service --runInBand
```

Expected: PASS. If either script/test target is unavailable, run the closest focused command and report the exact command used.

- [ ] **Step 8: Commit**

```bash
git add client/src/views/training/archives/ArchiveList.vue client/src/views/training/archives/ArchiveDetail.vue server/src/modules/training/archive.controller.ts server/src/modules/training/archive.service.ts
git commit -m "fix: align training archive frontend routes"
```

## Completion

- Push branch.
- Open PR.
- Include route grep and verification command output in PR description.
