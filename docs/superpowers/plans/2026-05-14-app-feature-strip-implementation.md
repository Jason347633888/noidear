# App Feature Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused mobile workspace, in-app operations surfaces, and generic cross-domain tool centers while preserving the current Web/H5 business system.

**Architecture:** This is the first execution track for `2026-05-14-full-production-audit-cleanup-design.md`. It deletes product/deployment surfaces that the user explicitly rejected, keeps business-owned files/storage/exports/status fields, and leaves dependency major upgrades plus Docker immutable digest hardening to the second plan.

**Tech Stack:** Vue 3, Vite, NestJS, Prisma, PostgreSQL migrations, Docker Compose, Node 20/npm 10, GitNexus.

---

## Execution Rules

- Implement in an isolated worktree or Multica workspace, not the root checkout.
- Read `docs/AGENT_GUIDE.md`, `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`, and `docs/superpowers/specs/2026-05-14-full-production-audit-cleanup-design.md` before edits.
- Do not start this plan until `post-api-cleanup-hardening` is merged into `master`.
- This plan must be merged before `2026-05-14-dependency-and-image-hardening-implementation.md` starts.
- Use Node 20/npm 10 for all npm commands.
- Before editing functions/classes/methods, run GitNexus impact analysis for the symbol. Before final commit, run `mcp__gitnexus__detect_changes({ "scope": "all", "repo": "noidear" })`.
- Do not remove `client/src/views/**` Web/H5 business pages except the explicitly deleted pages in this plan.
- Do not remove MinIO, `StorageService`, business attachments, document reference health, business health fields, audit logs, traceability exports, record PDFs, or object-specific status fields such as `deletedAt`.
- Keep commits small: one task or closely coupled deletion group per commit.
- If a scan reveals a code fact contradicting the spec, stop and report instead of expanding scope.

Worktree setup:

```bash
git fetch origin master
ROOT_PARENT="$(dirname "$(git rev-parse --show-toplevel)")"
WORKTREE_ROOT="${ROOT_PARENT}/noidear-app-feature-strip"
git worktree add "${WORKTREE_ROOT}" -b codex/app-feature-strip origin/master
cd "${WORKTREE_ROOT}"
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
git status --short
```

Expected:

```text
noidear-app-feature-strip
codex/app-feature-strip
```

If running in Multica, use the Multica checkout and only verify it is not `/Users/jiashenglin/Desktop/project/noidear`.

Node wrapper:

```bash
npx -y -p node@20 -p npm@10 npm --version
```

Expected: npm 10.x.

## File Structure

### Mobile Removal

- Delete `mobile/**`.
- Modify `package.json`: remove `"mobile"` from workspaces.
- Modify `package-lock.json`: remove mobile workspace and `@dcloudio/uni-*` dependency graph by running npm install after workspace removal.
- Modify `client/Dockerfile`: remove `COPY mobile/package.json`.
- Modify `server/Dockerfile`: remove both `COPY mobile/package.json` lines.
- Delete `server/src/modules/mobile/**`.
- Modify `server/src/app.module.ts`: remove `MobileModule` import and module registration.
- Modify `server/src/prisma/schema.prisma`: remove `MobileUpload` and `SyncSubmission`.
- Create Prisma migration under `server/src/prisma/migrations/<timestamp>_remove_mobile_workspace/`.

### In-App Operations Surface Removal

- Delete `client/src/views/backup/BackupManage.vue`, `client/src/api/backup.ts`, `server/src/modules/backup/**`.
- Modify `server/src/app.module.ts`: remove `BackupModule`.
- Modify `server/src/prisma/seed-dev.ts`, `seed.ts`, `seed-e2e.ts` if they reference `backupHistory`.
- Modify `server/src/prisma/schema.prisma`: remove `BackupHistory`.
- Modify `server/src/modules/health/**`: keep only `LivenessController` and a minimal module.
- Delete `HealthController` and `HealthService`.
- Delete `client/src/views/RecycleBin.vue`, `client/src/views/recycle-bin/**`, `client/src/api/recycle-bin.ts`, `server/src/modules/recycle-bin/**`.
- Modify `server/src/app.module.ts`: remove `RecycleBinModule`.
- Delete `client/src/views/admin/ImportPage.vue`, `client/src/api/import.ts`, and `server/src/modules/import/**`.
- Modify `server/src/app.module.ts`: remove `ImportModule`.
- Remove `/admin/import` route and “批量导入” menu entry. Data bootstrap or large one-off loads are handled by seed, Prisma Studio, SQL, or one-off development/operations scripts, not by a product UI. Do not add a replacement CLI import feature in this plan.

### Generic Import/Export Center Removal

- Delete `client/src/views/admin/ImportPage.vue`, `client/src/views/admin/ExportPage.vue`, `client/src/api/import.ts`, `client/src/api/export.ts`, `client/src/components/ExportDialog.vue`, `client/src/components/ExportButton.vue`.
- Modify `client/src/router/index.ts`: remove `/recycle-bin`, `/backup/manage`, `/admin/import`, `/admin/export`.
- Modify `client/src/navigation/menu.ts`: remove menu items “回收站”, “备份管理”, “批量导入”, “批量导出”.
- Delete `server/src/modules/import/**`.
- Delete `server/src/modules/export/**`.
- Modify `server/src/app.module.ts`: remove `ImportModule` and `ExportModule`.
- Modify modules importing `ExportModule`, currently `server/src/modules/document/document.module.ts`, `server/src/modules/deviation/deviation.module.ts`, and `server/src/modules/statistics/statistics.module.ts`.
- Move deviation report export from `server/src/modules/export/**` into `server/src/modules/deviation/**`; keep `GET /deviation-reports/export` as a deviation-owned business export and delete only `POST /export/deviation-reports`.
- Replace `POST /export/task-records` with record-owned `POST /records/export`. Export all records matching explicit export filters, not only the visible page, with a server-side synchronous limit of 10000 records. The front end must expose export filters (`templateId`, `status`, date range, submitter, keyword and/or selected `recordIds`) and must not hardcode the row limit as a second source of truth. When no status is selected, exclude `draft`; allow draft export only when the user explicitly filters `draft`. Single-template exports return `.xlsx`; cross-template exports return `.zip` with one `.xlsx` per template. The front end exports all fields by default and does not add a field-selection UI in this plan. Attachment-like fields are rendered as readable text or links only; this export does not package source attachments. `POST /records/export` must be recorded as a sensitive `export_data` operation in the audit log.
- Migrate active statistics page exports from `client/src/api/export.ts` to `client/src/api/statistics.ts` / `server/src/modules/statistics/**`.
- Do not migrate user export. User chose option B: delete `/admin/export` user export in this round.

### Deployment Surface Strip

- Modify `docker-compose.yml`: remove Prometheus, Grafana, Alertmanager, Loki, Promtail services and their volumes/networks dependencies.
- Delete `monitoring/**`.
- Remove `@willsoto/nestjs-prometheus` and `prom-client` from `server/package.json` only if a fresh scan confirms no runtime import remains.
- Update README and `docs/AGENT_GUIDE.md` so they no longer list `mobile`, in-app backup management, generic recycle bin, generic import/export center, or monitoring stack as current surfaces.

---

## Task 1: Preflight Snapshot

**Files:**
- Read `docs/AGENT_GUIDE.md`
- Read `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- Read `docs/superpowers/specs/2026-05-14-full-production-audit-cleanup-design.md`
- No code changes.

- [ ] **Step 1: Verify isolated checkout**

Run:

```bash
pwd
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
git status --short
```

Expected: checkout is not `/Users/jiashenglin/Desktop/project/noidear`; status is empty or only contains pre-approved local generated files.

- [ ] **Step 2: Install dependencies with Node 20**

Run:

```bash
npx -y -p node@20 -p npm@10 npm ci
```

Expected: command exits 0.

- [ ] **Step 3: Capture current deletion candidates**

Run:

```bash
rg -n "MobileModule|MobileUpload|SyncSubmission|mobile_uploads|sync_submissions|@Controller\\('mobile|mobile/sync|class Mobile|class Sync|interface Mobile|interface Sync|enum Mobile|enum Sync|model Mobile|model Sync" server/src/prisma/schema.prisma server/src packages/types client/src --glob '!**/node_modules/**'
rg -n "BackupModule|BackupHistory|backup_history|BackupManage|client/src/api/backup|/backup/manage|@Controller\\('backup|triggerMinIOBackup|triggerPostgresBackup|docker exec noidear-(postgres-1|minio-1|postgres|minio)" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "HealthController|HealthService|/health/(postgres|redis|minio|disk|dependencies|system-info)|client/src/api/health|健康管理" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "RecycleBinModule|RecycleBin|recycle-bin|/recycle-bin|回收站|RecycleBinCron" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(users|documents)|批量导入|importUsers|importDocuments|bulk import|import:users|import:documents" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
rg -n "ExportPage|ExportDialog|ExportButton|exportApi|client/src/api/export|/admin/export|@Controller\\('export|ExportModule|ExportService|/export/" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
```

Expected: matches are limited to surfaces covered by this plan plus business-owned exports/health/status references explicitly preserved by the spec.

- [ ] **Step 4: Baseline build/test**

Run:

```bash
npm run build:server
npm run build:client
npm run test -w server -- --runInBand
npm run test -w client
```

Expected: establish baseline. If failures pre-exist, record exact failing tests and continue only if failures are unrelated to this plan.

## Task 2: Remove Mobile Workspace and Backend Mobile API

**Files:**
- Delete `mobile/**`
- Modify `package.json`
- Modify `package-lock.json`
- Modify `client/Dockerfile`
- Modify `server/Dockerfile`
- Delete `server/src/modules/mobile/**`
- Modify `server/src/app.module.ts`
- Modify `server/src/prisma/schema.prisma`
- Create migration under `server/src/prisma/migrations/`

- [ ] **Step 1: Run GitNexus impact checks**

Run GitNexus impact before editing:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "MobileModule", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "MobileUpload", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "SyncSubmission", "direction": "upstream" })
```

Expected: direct usage is app module registration, schema, and mobile module files. If active Web/H5 code depends on them, stop and report.

- [ ] **Step 2: Delete mobile files**

Run:

```bash
git rm -r mobile
git rm -r server/src/modules/mobile
```

Expected: both paths are staged as deleted.

- [ ] **Step 3: Remove workspace and Docker package copies**

Edit `package.json` workspaces from:

```json
[
  "client",
  "server",
  "mobile",
  "packages/types",
  "tools/noidear-mcp"
]
```

to:

```json
[
  "client",
  "server",
  "packages/types",
  "tools/noidear-mcp"
]
```

Remove this line from `client/Dockerfile`:

```dockerfile
COPY mobile/package.json ./mobile/package.json
```

Remove both occurrences of this line from `server/Dockerfile`:

```dockerfile
COPY mobile/package.json ./mobile/package.json
```

- [ ] **Step 4: Remove MobileModule from AppModule**

In `server/src/app.module.ts`, remove:

```ts
import { MobileModule } from './modules/mobile/mobile.module';
```

and remove `MobileModule,` from the `imports` array.

- [ ] **Step 5: Remove mobile Prisma models**

In `server/src/prisma/schema.prisma`, delete the full `model MobileUpload { ... }` and `model SyncSubmission { ... }` blocks. Do not remove unrelated sync concepts or responsive UI references.

- [ ] **Step 6: Regenerate package lock**

Run:

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` no longer contains `mobile` workspace or `@dcloudio/uni-*`.

- [ ] **Step 7: Generate Prisma migration**

Run:

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server -- --name remove_mobile_workspace
```

Expected: migration contains `DROP TABLE` statements for `mobile_uploads` and `sync_submissions` or equivalent schema removal.

- [ ] **Step 8: Verify mobile removal**

Run:

```bash
rg -n "\"mobile\"|noidear-mobile|@dcloudio|uni-app|vite-plugin-uni" package.json package-lock.json client server packages tools README.md docs --glob '!**/node_modules/**'
rg -n "MobileModule|MobileUpload|SyncSubmission|mobile_uploads|sync_submissions|@Controller\\('mobile|mobile/sync|class Mobile|class Sync|interface Mobile|interface Sync|enum Mobile|enum Sync|model Mobile|model Sync" server/src server/src/prisma/schema.prisma packages/types client/src --glob '!**/coverage/**' --glob '!**/dist/**'
python3 tools/generate-system-map.py
```

Expected: no active code matches. Documentation matches must be historical or this plan/spec only. System map deleted-scope residue for mobile is 0.

- [ ] **Step 9: Commit**

Run:

```bash
git add package.json package-lock.json client/Dockerfile server/Dockerfile server/src/app.module.ts server/src/prisma/schema.prisma server/src/prisma/migrations
git commit -m "refactor: remove unused mobile workspace"
```

## Task 3: Remove In-App Backup Management

**Files:**
- Delete `client/src/views/backup/BackupManage.vue`
- Delete `client/src/api/backup.ts`
- Delete `server/src/modules/backup/**`
- Modify `server/src/app.module.ts`
- Modify `server/src/prisma/seed-dev.ts`, `seed.ts`, `seed-e2e.ts` if needed
- Modify `server/src/prisma/schema.prisma`
- Create Prisma migration

- [ ] **Step 1: Run GitNexus impact checks**

Run:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "BackupModule", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "BackupHistory", "direction": "upstream" })
```

Expected: backup page/API/module/seed/schema only. If `StorageService` or MinIO file storage appears, do not delete those paths.

- [ ] **Step 2: Delete backup page/API/module**

Run:

```bash
git rm -r client/src/views/backup
git rm client/src/api/backup.ts
git rm -r server/src/modules/backup
```

- [ ] **Step 3: Remove BackupModule registration**

In `server/src/app.module.ts`, remove:

```ts
import { BackupModule } from './modules/backup/backup.module';
```

and remove `BackupModule,` from the imports array.

- [ ] **Step 4: Remove backup seed data before schema**

Search:

```bash
rg -n "backupHistory|BackupHistory|backup_history" server/src/prisma
```

Remove any `prisma.backupHistory.*` seed blocks. In current code, `server/src/prisma/seed-dev.ts` contains:

```ts
await prisma.backupHistory.createMany({
  data: [
    { backupType: 'postgres', fileName: 'backup-001.sql', status: 'success', fileSize: 1024000, startedAt: new Date(Date.now() - 86400000 * 2), completedAt: new Date(Date.now() - 86400000 * 2 + 300000) },
    { backupType: 'minio', fileName: 'backup-002.zip', status: 'success', fileSize: 2048000, startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86400000 + 600000) },
  ],
});
```

Delete that block.

- [ ] **Step 5: Remove BackupHistory schema and migrate**

Delete `model BackupHistory { ... }` from `server/src/prisma/schema.prisma`.

Run:

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server -- --name remove_backup_management
```

Expected: migration drops `backup_history`.

- [ ] **Step 6: Verify backup removal**

Run:

```bash
rg -n "BackupModule|BackupHistory|backup_history|BackupManage|client/src/api/backup|/backup/manage|@Controller\\('backup|triggerMinIOBackup|triggerPostgresBackup|docker exec noidear-(postgres-1|minio-1|postgres|minio)" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "StorageService|MINIO_ENDPOINT|document.*file|supplier.*document|incoming.*report|product.*report" server/src/modules client/src --glob '!**/node_modules/**'
```

Expected: first command has no active matches; second command still shows business file storage paths.

- [ ] **Step 7: Commit**

Run:

```bash
git add -A \
  client/src/views/backup \
  client/src/api/backup.ts \
  server/src/modules/backup \
  server/src/app.module.ts \
  server/src/prisma/seed-dev.ts \
  server/src/prisma/seed.ts \
  server/src/prisma/seed-e2e.ts \
  server/src/prisma/schema.prisma \
  server/src/prisma/migrations
git commit -m "refactor: remove in-app backup management"
```

## Task 4: Keep Only Minimal Liveness and Remove Health Management

**Files:**
- Modify `server/src/modules/health/health.module.ts`
- Delete `server/src/modules/health/health.controller.ts`
- Delete `server/src/modules/health/health.service.ts`
- Delete or update health tests

- [ ] **Step 1: Run GitNexus impact checks**

Run:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "HealthController", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "HealthService", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "LivenessController", "direction": "upstream" })
```

Expected: `LivenessController` remains.

- [ ] **Step 2: Delete health management controller/service**

Run:

```bash
git rm server/src/modules/health/health.controller.ts
git rm server/src/modules/health/health.service.ts
```

- [ ] **Step 3: Reduce HealthModule to liveness**

Change `server/src/modules/health/health.module.ts` to:

```ts
import { Module } from '@nestjs/common';
import { LivenessController } from './liveness.controller';

@Module({
  controllers: [LivenessController],
})
export class HealthModule {}
```

- [ ] **Step 4: Verify liveness remains and health management is gone**

Run:

```bash
rg -n "HealthController|HealthService|/health/(postgres|redis|minio|disk|dependencies|system-info)|client/src/api/health|健康管理" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "LivenessController|@Controller\\('liveness'|/liveness" server/src README.md docs/AGENT_GUIDE.md
```

Expected: first command has no active runtime matches. Second command finds `LivenessController`.

- [ ] **Step 5: Commit**

Run:

```bash
git add server/src/modules/health README.md docs/AGENT_GUIDE.md
git commit -m "refactor: keep liveness and remove health management"
```

## Task 5: Remove Generic Recycle Bin

**Files:**
- Delete `client/src/views/RecycleBin.vue`
- Delete `client/src/views/recycle-bin/**`
- Delete `client/src/api/recycle-bin.ts`
- Delete `server/src/modules/recycle-bin/**`
- Modify `client/src/router/index.ts`
- Modify `client/src/navigation/menu.ts`
- Modify `server/src/app.module.ts`

- [ ] **Step 1: Run GitNexus impact checks**

Run:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "RecycleBinModule", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "RecycleBinService", "direction": "upstream" })
```

Expected: generic recycle-bin routes, menu, and tests only. Do not remove `deletedAt` fields.

- [ ] **Step 2: Delete recycle-bin files**

Run:

```bash
git rm client/src/views/RecycleBin.vue
git rm -r client/src/views/recycle-bin
git rm client/src/api/recycle-bin.ts
git rm -r server/src/modules/recycle-bin
```

- [ ] **Step 3: Remove route and menu**

Remove this route block from `client/src/router/index.ts`:

```ts
{
  path: 'recycle-bin',
  name: 'RecycleBin',
  component: () => import('@/views/RecycleBin.vue'),
},
```

Remove this menu entry from `client/src/navigation/menu.ts`:

```ts
{ path: '/recycle-bin', title: '回收站', icon: Delete },
```

- [ ] **Step 4: Remove module registration**

In `server/src/app.module.ts`, remove:

```ts
import { RecycleBinModule } from './modules/recycle-bin/recycle-bin.module';
```

and remove `RecycleBinModule,` from imports.

- [ ] **Step 5: Verify recycle-bin removal without deleting business status fields**

Run:

```bash
rg -n "RecycleBinModule|RecycleBin|recycle-bin|/recycle-bin|回收站|RecycleBinCron" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "deletedAt|archived|voided|cancelled|作废|归档|撤销" server/src/prisma/schema.prisma server/src/modules/document server/src/modules/record-template server/src/modules/record --glob '!**/node_modules/**'
```

Expected: first command has no active matches; second command still finds business lifecycle/status fields.

- [ ] **Step 6: Commit**

Run:

```bash
git add client/src/router/index.ts client/src/navigation/menu.ts server/src/app.module.ts
git commit -m "refactor: remove generic recycle bin"
```

## Task 6: Remove Generic Import/Export Center, Migrate Deviation Export, and Build Record-Owned Export

**Files:**
- Delete `client/src/views/admin/ImportPage.vue`
- Delete `client/src/views/admin/ExportPage.vue`
- Delete `client/src/api/import.ts`
- Delete `client/src/api/export.ts`
- Delete `client/src/components/ExportDialog.vue`
- Delete `client/src/components/ExportButton.vue`
- Delete related tests
- Delete `server/src/modules/import/**`
- Delete `server/src/modules/export/**`
- Modify `server/src/app.module.ts`
- Modify `server/src/modules/document/document.module.ts`
- Modify `server/src/modules/deviation/deviation.module.ts`
- Modify `server/src/modules/statistics/statistics.module.ts`
- Modify `client/src/router/index.ts`
- Modify `client/src/navigation/menu.ts`
- Modify `client/src/views/statistics/DocumentStatistics.vue`
- Modify `client/src/views/statistics/TaskStatistics.vue`
- Modify `client/src/views/statistics/__tests__/*Statistics.spec.ts`
- Create `server/src/modules/record/dto/export-records.dto.ts`
- Create `server/src/modules/record/record-export.service.ts`
- Modify `server/src/modules/record/record.controller.ts`
- Modify `server/src/modules/record/record.module.ts`
- Modify `client/src/api/record.ts`
- Modify `client/src/views/record/RecordList.vue`
- Modify `server/package.json` and `package-lock.json` to add direct `jszip` dependency

- [ ] **Step 1: Run GitNexus impact checks**

Run:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "ImportModule", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "ImportService", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "ExportModule", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "ExportService", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "DeviationExportService", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "RecordService", "direction": "upstream" })
```

Expected: generic import/export modules and front-end generic adapter/component users. In-app batch import is deleted, not reimplemented. `DeviationController` currently depends on `ExportService`; preserve that business export by moving the deviation export service and DTO into the deviation module before deleting `server/src/modules/export/**`. Business audit/traceability/PDF exports must remain.

- [ ] **Step 2: Move deviation report export into deviation module**

Run:

```bash
git mv server/src/modules/export/services/deviation-export.service.ts server/src/modules/deviation/deviation-export.service.ts
git mv server/src/modules/export/dto/export-deviation-reports.dto.ts server/src/modules/deviation/dto/export-deviation-reports.dto.ts
```

In `server/src/modules/deviation/deviation-export.service.ts`, replace imports:

```ts
import { PrismaService } from '../../../prisma/prisma.service';
import { ExportDeviationReportsDto } from '../dto';
import { formatDate, formatStatus } from '../../../shared/utils/format.util';
import {
  FieldConfig,
  setupWorksheet,
  getFilteredFields,
  filterRow,
  addDateRange,
} from '../../../shared/utils/excel.util';
```

with:

```ts
import { PrismaService } from '../../prisma/prisma.service';
import { ExportDeviationReportsDto } from './dto/export-deviation-reports.dto';
import { formatDate, formatStatus } from '../../shared/utils/format.util';
import {
  FieldConfig,
  setupWorksheet,
  getFilteredFields,
  filterRow,
  addDateRange,
} from '../../shared/utils/excel.util';
```

In `server/src/modules/deviation/deviation.controller.ts`, replace:

```ts
import { ExportService } from '../export/export.service';
import { ExportDeviationReportsDto } from '../export/dto';
```

with:

```ts
import { DeviationExportService } from './deviation-export.service';
import { ExportDeviationReportsDto } from './dto/export-deviation-reports.dto';
```

and replace constructor/call usage:

```ts
private readonly exportService: ExportService,
const buffer = await this.exportService.exportDeviationReports(dto, req.user);
```

with:

```ts
private readonly deviationExportService: DeviationExportService,
const buffer = await this.deviationExportService.exportDeviationReports(dto, req.user);
```

In `server/src/modules/deviation/deviation.module.ts`, remove `ExportModule` from imports and add `DeviationExportService` to providers:

```ts
providers: [DeviationService, DeviationAnalyticsService, DeviationCronService, DeviationExportService],
```

- [ ] **Step 3: Add record-owned bulk export for filled records**

Install a direct zip dependency in the server workspace:

```bash
npm install jszip -w server
```

Create `server/src/modules/record/dto/export-records.dto.ts`:

```ts
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class ExportRecordsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recordIds?: string[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  usageType?: string;

  @IsOptional()
  @IsString()
  changeEventId?: string;

  @IsOptional()
  @IsString()
  submitterId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}
```

Create `server/src/modules/record/record-export.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportRecordsDto } from './dto/export-records.dto';

interface TemplateField {
  name?: string;
  key?: string;
  label?: string;
  type?: string;
  options?: { label: string; value: string | number | boolean }[];
}

interface ExportResult {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  signed: '已签署',
  approved: '已通过',
  rejected: '已驳回',
};

const MAX_RECORD_EXPORT_ROWS = 10000;

@Injectable()
export class RecordExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportRecords(dto: ExportRecordsDto): Promise<ExportResult> {
    const where = this.buildWhere(dto);
    const total = await this.prisma.record.count({ where });

    if (total === 0) {
      throw new BadRequestException('没有可导出的记录');
    }

    if (total > MAX_RECORD_EXPORT_ROWS) {
      throw new BadRequestException(`记录导出最多支持 ${MAX_RECORD_EXPORT_ROWS} 条，请缩小筛选范围`);
    }

    const records = await this.prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: MAX_RECORD_EXPORT_ROWS,
      include: {
        template: true,
        creator: { select: { id: true, name: true, username: true } },
      },
    });

    const groups = new Map<string, any[]>();
    for (const record of records) {
      const key = record.templateId;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }

    if (groups.size === 1) {
      const [templateRecords] = groups.values();
      const workbookBuffer = await this.buildWorkbook(templateRecords, dto.fields);
      const templateName = this.safeFileName(templateRecords[0].template?.name ?? '记录');
      return {
        buffer: workbookBuffer,
        filename: `${templateName}-记录导出.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const zip = new JSZip();
    for (const templateRecords of groups.values()) {
      const templateName = this.safeFileName(templateRecords[0].template?.name ?? templateRecords[0].templateId);
      zip.file(`${templateName}.xlsx`, await this.buildWorkbook(templateRecords, dto.fields));
    }

    return {
      buffer: Buffer.from(await zip.generateAsync({ type: 'nodebuffer' })),
      filename: `记录导出-${new Date().toISOString().slice(0, 10)}.zip`,
      contentType: 'application/zip',
    };
  }

  private buildWhere(dto: ExportRecordsDto) {
    const where: any = { deletedAt: null };
    if (dto.recordIds?.length) where.id = { in: dto.recordIds };
    if (dto.status && dto.status !== 'all') {
      where.status = dto.status;
    } else {
      where.status = { in: ['submitted', 'signed', 'approved', 'rejected'] };
    }
    if (dto.templateId) where.templateId = dto.templateId;
    if (dto.keyword) where.number = { contains: dto.keyword };
    if (dto.usageType) where.usageType = dto.usageType;
    if (dto.changeEventId) where.changeEventId = dto.changeEventId;
    if (dto.submitterId) where.createdBy = dto.submitterId;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }
    return where;
  }

  private async buildWorkbook(records: any[], selectedFields?: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('记录填写结果');
    const template = records[0].template;
    const fields = this.extractFields(template?.fieldsJson).filter((field) => {
      const key = field.name ?? field.key;
      return !selectedFields?.length || (key ? selectedFields.includes(key) : false);
    });

    worksheet.columns = [
      { header: '记录编号', key: 'number', width: 24 },
      { header: '模板名称', key: 'templateName', width: 28 },
      { header: '状态', key: 'status', width: 14 },
      { header: '填写人', key: 'creatorName', width: 18 },
      { header: '创建时间', key: 'createdAt', width: 22 },
      { header: '提交时间', key: 'submittedAt', width: 22 },
      ...fields.map((field) => ({
        header: field.label ?? field.name ?? field.key ?? '字段',
        key: field.name ?? field.key ?? '',
        width: 22,
      })),
    ];

    for (const record of records) {
      const data = (record.dataJson ?? {}) as Record<string, unknown>;
      const row: Record<string, unknown> = {
        number: record.number,
        templateName: template?.name ?? '',
        status: STATUS_LABELS[record.status] ?? record.status,
        creatorName: record.creator?.name ?? record.creator?.username ?? '',
        createdAt: this.formatDate(record.createdAt),
        submittedAt: record.submittedAt ? this.formatDate(record.submittedAt) : '',
      };
      for (const field of fields) {
        const key = field.name ?? field.key;
        if (!key) continue;
        row[key] = this.formatFieldValue(data[key], field);
      }
      worksheet.addRow(row);
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private extractFields(fieldsJson: unknown): TemplateField[] {
    if (Array.isArray(fieldsJson)) return fieldsJson as TemplateField[];
    const fields = (fieldsJson as { fields?: TemplateField[] } | null)?.fields;
    return Array.isArray(fields) ? fields : [];
  }

  private formatFieldValue(value: unknown, field: TemplateField): string {
    if (value === null || value === undefined) return '';
    if (field.type === 'richtext') return this.stripHtml(String(value));
    if (['file', 'image', 'photo'].includes(field.type ?? '')) return this.formatFileValue(value);
    if (field.type === 'signature') return this.formatSignatureValue(value);
    if (Array.isArray(value)) return value.map((item) => this.formatOption(item, field)).join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return this.formatOption(value, field);
  }

  private formatFileValue(value: unknown): string {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return item;
      if (typeof item !== 'object') return String(item);
      const file = item as { name?: string; fileName?: string; url?: string; path?: string };
      const name = file.name ?? file.fileName ?? '附件';
      const url = file.url ?? file.path;
      return url ? `${name} ${url}` : name;
    }).filter(Boolean).join(', ');
  }

  private formatSignatureValue(value: unknown): string {
    if (!value) return '未签名';
    if (typeof value !== 'string') return '已签名';
    if (value.startsWith('data:image/')) return '已签名';
    return `已签名 ${value}`;
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private formatOption(value: unknown, field: TemplateField): string {
    const option = field.options?.find((item) => item.value === value);
    return option ? option.label : String(value);
  }

  private formatDate(value: Date | string): string {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private safeFileName(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || '记录';
  }
}
```

In `server/src/modules/record/record.module.ts`, import `RecordExportService` and add it to providers:

```ts
import { RecordExportService } from './record-export.service';
```

```ts
providers: [RecordService, RecordExportService, ChangeLogInterceptor, DynamicFormBatchService],
```

In `server/src/modules/record/record.controller.ts`, import `RecordExportService` and `ExportRecordsDto`:

```ts
import { RecordExportService } from './record-export.service';
import { ExportRecordsDto } from './dto/export-records.dto';
import { SensitiveLog } from '../audit/decorators/sensitive-log.decorator';
```

Inject it in the constructor:

```ts
constructor(
  private readonly recordService: RecordService,
  private readonly recordExportService: RecordExportService,
) {}
```

Add this route before `@Get(':id')`:

```ts
@Post('export')
@SensitiveLog('export_data', 'record')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: '批量导出记录填写结果（单模板 Excel；跨模板 zip）' })
async exportRecords(@Body() dto: ExportRecordsDto, @Res() res: Response) {
  const result = await this.recordExportService.exportRecords(dto);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
  res.send(result.buffer);
}
```

Before implementing the route, verify the existing audit pattern:

```bash
rg -n "SensitiveLog\\(|SensitiveLogInterceptor|APP_INTERCEPTOR" server/src/modules server/src/main.ts server/src/app.module.ts
```

Expected: use the existing `SensitiveLog` / `SensitiveLogInterceptor` pattern. If the interceptor is not globally active for decorated routes, wire it according to the current `AuditModule` pattern before exposing `POST /records/export`; do not leave this bulk export without a sensitive-log event.

In `client/src/api/record.ts`, add:

```ts
export interface ExportRecordsPayload extends RecordListParams {
  recordIds?: string[];
  submitterId?: string;
  startDate?: string;
  endDate?: string;
  fields?: string[];
}
```

Add this method inside the existing default export object:

```ts
  exportRecords(payload: ExportRecordsPayload) {
    return request.post('/records/export', payload, { responseType: 'blob' });
  },
```

In `client/src/views/record/RecordList.vue`, add an export button in the panel header actions. Do not make it a one-click "export everything" action. The click opens an export dialog or drawer that lets the user confirm or narrow the export filters:

```vue
<el-button type="primary" :loading="exporting" @click="openExportDialog">
  导出记录
</el-button>
```

The dialog must expose at least `templateId`, `status`, date range, submitter, keyword, and optionally selected `recordIds`. It can prefill `status`, `templateId`, and `keyword` from the current list filters, but it must not silently export all records when the current list only has `status`. If `RecordList.vue` does not currently load template or user options, add the minimal option loading using the existing record-template/user adapters; do not hardcode ids.

```ts
const exporting = ref(false);
const exportDialogVisible = ref(false);
const exportFilters = reactive({
  templateId: '',
  status: filterForm.status || '',
  keyword: '',
  submitterId: '',
  startDate: '',
  endDate: '',
});

const openExportDialog = () => {
  exportFilters.status = filterForm.status || '';
  exportFilters.templateId = (filterForm as any).templateId || '';
  exportFilters.keyword = (filterForm as any).keyword || '';
  exportDialogVisible.value = true;
};

const handleExportRecords = async () => {
  exporting.value = true;
  try {
    const blob = await recordApi.exportRecords({
      templateId: exportFilters.templateId || undefined,
      status: exportFilters.status || undefined,
      keyword: exportFilters.keyword || undefined,
      submitterId: exportFilters.submitterId || undefined,
      startDate: exportFilters.startDate || undefined,
      endDate: exportFilters.endDate || undefined,
    });
    const contentType = (blob as Blob).type;
    const extension = contentType.includes('zip') ? 'zip' : 'xlsx';
    const url = window.URL.createObjectURL(blob as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `记录导出_${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    window.URL.revokeObjectURL(url);
    exportDialogVisible.value = false;
    ElMessage.success('记录导出成功');
  } catch (error: any) {
    ElMessage.error(error.message || '记录导出失败');
  } finally {
    exporting.value = false;
  }
};
```

The server-side `MAX_RECORD_EXPORT_ROWS` is the only row-limit source of truth. The client must not duplicate that constant; it should surface the backend validation message when the result set is too large.

Create `server/src/modules/record/record-export.service.spec.ts`:

```ts
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { RecordExportService } from './record-export.service';

const record = (overrides: any = {}) => ({
  id: overrides.id ?? 'rec-1',
  number: overrides.number ?? 'R-001',
  templateId: overrides.templateId ?? 'tpl-clean',
  status: overrides.status ?? 'submitted',
  dataJson: overrides.dataJson ?? { temperature: 12 },
  createdAt: new Date('2026-05-14T08:00:00.000Z'),
  submittedAt: new Date('2026-05-14T09:00:00.000Z'),
  creator: { id: 'u1', name: '张三', username: 'zhangsan' },
  template: overrides.template ?? {
    id: overrides.templateId ?? 'tpl-clean',
    name: overrides.templateName ?? '清洁记录',
    fieldsJson: {
      fields: [{ name: 'temperature', label: '温度', type: 'number' }],
    },
  },
  ...overrides,
});

const serviceWithRecords = (records: any[], count = records.length) => new RecordExportService({
  record: {
    count: jest.fn().mockResolvedValue(count),
    findMany: jest.fn().mockResolvedValue(records),
  },
} as any);

describe('RecordExportService', () => {
  it('exports one template as xlsx with dynamic field columns', async () => {
    const service = serviceWithRecords([record()]);
    const result = await service.exportRecords({ templateId: 'tpl-clean' });

    expect(result.contentType).toContain('spreadsheetml');
    expect(result.filename).toContain('清洁记录');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as any);
    const worksheet = workbook.getWorksheet('记录填写结果')!;
    expect(worksheet.getRow(1).values).toContain('温度');
    expect(worksheet.getRow(2).values).toContain(12);
  });

  it('exports multiple templates as zip with one xlsx per template', async () => {
    const service = serviceWithRecords([
      record({ templateId: 'tpl-clean', templateName: '清洁记录' }),
      record({
        id: 'rec-2',
        number: 'R-002',
        templateId: 'tpl-glass',
        templateName: '玻璃硬塑检查',
        dataJson: { result: '合格' },
        template: {
          id: 'tpl-glass',
          name: '玻璃硬塑检查',
          fieldsJson: { fields: [{ name: 'result', label: '结果', type: 'text' }] },
        },
      }),
    ]);

    const result = await service.exportRecords({});
    expect(result.contentType).toBe('application/zip');

    const zip = await JSZip.loadAsync(result.buffer);
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining(['清洁记录.xlsx', '玻璃硬塑检查.xlsx']),
    );
  });

  it('rejects synchronous exports above 10000 records', async () => {
    const service = serviceWithRecords([], 10001);
    await expect(service.exportRecords({})).rejects.toThrow('最多支持 10000 条');
  });

  it('excludes drafts by default and allows explicit draft export', async () => {
    const service = serviceWithRecords([record()]);
    await service.exportRecords({});
    expect((service as any).prisma.record.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: { in: ['submitted', 'signed', 'approved', 'rejected'] } }),
    });

    await service.exportRecords({ status: 'draft' });
    expect((service as any).prisma.record.count).toHaveBeenLastCalledWith({
      where: expect.objectContaining({ status: 'draft' }),
    });
  });

  it('renders attachment, signature, and richtext fields as readable cell values', async () => {
    const service = serviceWithRecords([record({
      dataJson: {
        attachment: { name: '现场照片.jpg', url: '/uploads/photo.jpg' },
        sign: 'data:image/png;base64,abc',
        notes: '<p>复核<strong>通过</strong></p>',
      },
      template: {
        id: 'tpl-clean',
        name: '清洁记录',
        fieldsJson: {
          fields: [
            { name: 'attachment', label: '附件', type: 'image' },
            { name: 'sign', label: '签名', type: 'signature' },
            { name: 'notes', label: '备注', type: 'richtext' },
          ],
        },
      },
    })]);

    const result = await service.exportRecords({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as any);
    const rowValues = (workbook.getWorksheet('记录填写结果')!.getRow(2).values as unknown[]).join(' ');
    expect(rowValues).toContain('现场照片.jpg /uploads/photo.jpg');
    expect(rowValues).toContain('已签名');
    expect(rowValues).toContain('复核 通过');
    expect(rowValues).not.toContain('data:image/png');
  });
});
```

Run:

```bash
npm run test -w server -- record-export.service.spec.ts --runInBand
npm run build:server
npm run build:client
```

Expected: single-template payload produces `.xlsx`; cross-template payload produces `.zip` with one workbook per template. Export query must not pass page/limit; it exports every record matching the supplied filters up to 10000 rows. Front end must not send `fields` in this plan, so exported workbooks contain all template fields by default. The backend blocks exports above 10000 records and is the only limit source of truth; the service test must cover the back-end `BadRequestException` path for over-limit results, and the client must display that backend message. Status defaults exclude `draft`, and `draft` is exported only when explicitly filtered. Attachment, image, photo, signature, and richtext fields are rendered as readable text or links in Excel; the zip contains workbooks only, not source attachments. `POST /records/export` is covered by sensitive audit logging.

The `填写人` export column is defined as `creator.name ?? creator.username ?? ''`; add or keep a test assertion for this fallback so the display-name rule is explicit.

- [ ] **Step 4: Delete generic import/export files**

Run:

```bash
ls client/src/views/admin/ImportPage.vue client/src/views/admin/ExportPage.vue client/src/api/import.ts client/src/api/export.ts client/src/components/ExportDialog.vue client/src/components/ExportButton.vue 2>/dev/null || true
ls server/src/modules/import server/src/modules/export 2>/dev/null || true

git rm --ignore-unmatch client/src/views/admin/ImportPage.vue
git rm --ignore-unmatch client/src/views/admin/ExportPage.vue
git rm --ignore-unmatch client/src/api/import.ts
git rm --ignore-unmatch client/src/api/export.ts
git rm --ignore-unmatch client/src/components/ExportDialog.vue
git rm --ignore-unmatch client/src/components/ExportButton.vue
git rm -r --ignore-unmatch server/src/modules/import
git rm -r --ignore-unmatch server/src/modules/export
```

If component tests exist for the deleted components/pages, remove them with:

```bash
git rm --ignore-unmatch client/src/views/admin/__tests__/ImportPage.spec.ts client/src/components/__tests__/ExportDialog.spec.ts client/src/components/__tests__/ExportButton.spec.ts
```

- [ ] **Step 5: Remove route and menu**

Remove `/admin/import` and `/admin/export` routes from `client/src/router/index.ts`.

Remove these menu entries from `client/src/navigation/menu.ts`:

```ts
{ path: '/admin/import', title: '批量导入', icon: Upload },
{ path: '/admin/export', title: '批量导出', icon: DataAnalysis },
```

Do not add replacement import UI, CLI import command, or user export elsewhere; user chose deletion for both. Future bulk import must be rebuilt from a fresh requirement instead of keeping the old half-finished `/import/*` surface.

- [ ] **Step 6: Remove ImportModule and ExportModule imports**

Remove these imports and registrations from `server/src/app.module.ts`:

```ts
import { ImportModule } from './modules/import/import.module';
import { ExportModule } from './modules/export/export.module';
ImportModule,
ExportModule,
```

Remove `ExportModule` imports/usages from:

```text
server/src/modules/document/document.module.ts
server/src/modules/statistics/statistics.module.ts
```

- [ ] **Step 7: Verify backend statistics export route shape**

Inspect the existing backend route before editing the adapter:

```bash
rg -n "@Get\\('export|async export\\(|StatisticsExportService|exportDocumentStatistics|exportTaskStatistics|exportApprovalStatistics" server/src/modules/statistics
```

Expected: `server/src/modules/statistics/statistics.controller.ts` serves `GET /statistics/export` with `type=documents|tasks|approvals`. This plan only keeps the `documents` and `tasks` business callers; the unused `approvals` export branch is removed in Step 9.

- [ ] **Step 8: Migrate statistics page export calls to statistics adapter**

Create or update `client/src/api/statistics.ts` so it exposes business-owned export methods:

```ts
import request from './request';

export const statisticsApi = {
  exportDocuments(): Promise<Blob> {
    return request.get('/statistics/export', { params: { type: 'documents' }, responseType: 'blob' });
  },
  exportTasks(): Promise<Blob> {
    return request.get('/statistics/export', { params: { type: 'tasks' }, responseType: 'blob' });
  },
};
```

In `client/src/views/statistics/DocumentStatistics.vue`, replace generic export import:

```ts
import exportApi from '@/api/export';
```

with:

```ts
import { statisticsApi } from '@/api/statistics';
```

Replace the call:

```ts
const blob = await exportApi.exportStatistics('documents');
```

with:

```ts
const blob = await statisticsApi.exportDocuments();
```

In `client/src/views/statistics/TaskStatistics.vue`, replace:

```ts
const blob = await exportApi.exportStatistics('tasks');
```

with:

```ts
const blob = await statisticsApi.exportTasks();
```

If `client/src/api/statistics.ts` already exists with another export shape, add these methods without changing existing callers.

- [ ] **Step 9: Remove unused approvals statistics export branch**

Confirm there is no active front-end caller:

```bash
rg -n "exportStatistics\\('approvals'|type:\\s*'approvals'|statisticsApi\\.exportApprovals|exportApprovalStatistics" client/src server/src/modules/statistics --glob '!**/node_modules/**'
```

Expected: only backend `StatisticsController` and `StatisticsExportService` contain approvals export code. Remove the `approvals` type branch from `server/src/modules/statistics/statistics.controller.ts`, remove `exportApprovalStatistics()` from `server/src/modules/statistics/statistics-export.service.ts`, and update any validation/error text from `documents, tasks, or approvals` to `documents or tasks`. Keep approval count/statistics read endpoints if they are still used by dashboards; this step deletes only the Excel export dead branch.

- [ ] **Step 10: Update tests**

Update statistics tests to mock `statisticsApi` instead of `exportApi`.

For `client/src/views/statistics/__tests__/DocumentStatistics.spec.ts`, replace:

```ts
vi.mock('@/api/export', () => ({
  default: { exportStatistics: vi.fn().mockResolvedValue(new Blob()) },
}));
```

with:

```ts
vi.mock('@/api/statistics', () => ({
  statisticsApi: {
    exportDocuments: vi.fn().mockResolvedValue(new Blob()),
    exportTasks: vi.fn().mockResolvedValue(new Blob()),
  },
}));
```

Apply the same mock to `TaskStatistics.spec.ts`.

- [ ] **Step 11: Verify export-center removal**

Run:

```bash
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(users|documents)|批量导入|importUsers|importDocuments|ExportPage|ExportDialog|ExportButton|client/src/api/export|/admin/export|@Controller\\('export|ExportModule|/export/(documents|tasks|task-records|deviation-reports|users)|批量导出" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
rg -n "deviation-reports.*export|DeviationExportService|records/export|RecordExportService|SensitiveLog\\('export_data',\\s*'record'\\)|permission-logs|login-logs|sensitive-logs|traceability|record.*pdf|batch.*pdf|statistics.*export" server/src client/src --glob '!**/node_modules/**'
python3 tools/generate-system-map.py
```

Expected: first command has no active matches. Second command still finds business-owned exports, including `GET /deviation-reports/export` owned by the deviation module and `POST /records/export` owned by the record module with sensitive audit logging. System map deleted-scope residue for generic import/export is 0.

- [ ] **Step 12: Commit**

Run:

```bash
git add -A \
  client/src/views/admin/ImportPage.vue \
  client/src/views/admin/ExportPage.vue \
  client/src/api/import.ts \
  client/src/api/export.ts \
  client/src/components/ExportDialog.vue \
  client/src/components/ExportButton.vue \
  client/src/views/admin/__tests__/ImportPage.spec.ts \
  client/src/components/__tests__/ExportDialog.spec.ts \
  client/src/components/__tests__/ExportButton.spec.ts \
  server/src/modules/import \
  server/src/modules/export \
  server/src/modules/deviation/deviation-export.service.ts \
  server/src/modules/deviation/dto/export-deviation-reports.dto.ts \
  server/src/modules/deviation/deviation.controller.ts \
  server/src/modules/record/dto/export-records.dto.ts \
  server/src/modules/record/record-export.service.ts \
  server/src/modules/record/record.controller.ts \
  server/src/modules/record/record.module.ts \
  server/package.json \
  package-lock.json \
  server/src/app.module.ts \
  server/src/modules/document/document.module.ts \
  server/src/modules/deviation/deviation.module.ts \
  server/src/modules/statistics/statistics.module.ts \
  server/src/modules/statistics/statistics.controller.ts \
  server/src/modules/statistics/statistics-export.service.ts \
  client/src/router/index.ts \
  client/src/navigation/menu.ts \
  client/src/api/record.ts \
  client/src/api/statistics.ts \
  client/src/views/record/RecordList.vue \
  client/src/views/statistics/DocumentStatistics.vue \
  client/src/views/statistics/TaskStatistics.vue \
  client/src/views/statistics/__tests__/DocumentStatistics.spec.ts \
  client/src/views/statistics/__tests__/TaskStatistics.spec.ts
git commit -m "refactor: remove generic import export center"
```

## Task 7: Remove Deployment Observability Stack

**Files:**
- Modify `docker-compose.yml`
- Delete `monitoring/**`
- Modify `server/package.json` and `package-lock.json` only if no runtime metrics import remains
- Modify README / `docs/AGENT_GUIDE.md`

- [ ] **Step 1: Confirm runtime metrics imports**

Run:

```bash
rg -n "@willsoto/nestjs-prometheus|prom-client|metrics|Prometheus|PROMETHEUS|METRICS" server/src server/package.json docker-compose.yml client server tools/noidear-mcp/src --glob '!**/coverage/**' --glob '!**/dist/**' --glob '!**/node_modules/**'
```

Expected: no active server runtime import. Business words like `monitoring_method` are not deployment metrics and must not be deleted.

- [ ] **Step 2: Remove observability services from compose**

In `docker-compose.yml`, delete full services:

```text
prometheus
grafana
alertmanager
loki
promtail
```

Delete volumes:

```text
prometheus_data
grafana_data
loki_data
alertmanager_data
```

Keep services:

```text
postgres
redis
minio
server
client
```

Do not pin third-party image digests in this plan; the second plan owns digest hardening.

- [ ] **Step 3: Delete monitoring config directory**

Run:

```bash
git rm -r monitoring
```

- [ ] **Step 4: Remove unused Prometheus dependencies if safe**

If Step 1 confirms no runtime import remains, remove these from `server/package.json`:

```json
"@willsoto/nestjs-prometheus": "^6.0.2",
"prom-client": "^15.1.3"
```

Then run:

```bash
npm install --package-lock-only
```

Expected: package lock no longer contains those packages unless pulled transitively by another kept dependency.

- [ ] **Step 5: Update docs service list**

In README and `docs/AGENT_GUIDE.md`, remove Prometheus/Grafana/Alertmanager/Loki entries from current services and remove `monitoring/` from current project structure.

Do not remove business monitoring terms such as CCP monitoring, process monitoring, or environment monitoring.

- [ ] **Step 6: Verify observability stack removal**

Run:

```bash
rg -n "image: .*:latest|prometheus|grafana|alertmanager|loki|promtail|@willsoto/nestjs-prometheus|prom-client" docker-compose.yml server/package.json README.md docs/AGENT_GUIDE.md monitoring server/src tools/noidear-mcp/src --glob '!**/coverage/**' --glob '!**/dist/**'
```

Expected: no deployment observability matches. Business monitoring matches under feature modules must be reviewed manually and preserved.

- [ ] **Step 7: Commit**

Run:

```bash
git add docker-compose.yml server/package.json package-lock.json README.md docs/AGENT_GUIDE.md
git commit -m "refactor: remove deployment observability stack"
```

## Task 8: Final Validation for Feature Strip

**Files:**
- Generated `docs/system-map.html` if system-map script writes it.
- No new business code.

- [ ] **Step 1: Build and test**

Run:

```bash
npm ci
npm run build:server
npm run build:client
npm run test -w server -- --runInBand
npm run test -w client
```

Expected: all pass or only unrelated pre-existing baseline failures documented in Task 1.

- [ ] **Step 2: Verify Web/H5 main system still exists**

Run:

```bash
rg -n "path: 'dashboard'|path: 'documents'|path: 'templates'|path: 'records'|path: 'warehouse|path: 'traceability|path: 'training" client/src/router/index.ts
rg -n "工作台|体系文件中心|模板管理|追溯查询|培训项目|用户管理" client/src/navigation/menu.ts
```

Expected: current browser system remains routed and present in menu.

- [ ] **Step 3: Run full deleted-surface scans**

Run:

```bash
rg -n "\"mobile\"|noidear-mobile|@dcloudio|uni-app|vite-plugin-uni" package.json package-lock.json client server packages tools README.md docs --glob '!**/node_modules/**'
rg -n "MobileModule|MobileUpload|SyncSubmission|mobile_uploads|sync_submissions|@Controller\\('mobile|mobile/sync|class Mobile|class Sync|interface Mobile|interface Sync|enum Mobile|enum Sync|model Mobile|model Sync" server/src server/src/prisma/schema.prisma packages/types client/src --glob '!**/coverage/**' --glob '!**/dist/**'
rg -n "BackupModule|BackupHistory|backup_history|BackupManage|client/src/api/backup|/backup/manage|@Controller\\('backup|triggerMinIOBackup|triggerPostgresBackup|docker exec noidear-(postgres-1|minio-1|postgres|minio)" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "HealthController|HealthService|/health/(postgres|redis|minio|disk|dependencies|system-info)|client/src/api/health|健康管理" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "RecycleBinModule|RecycleBin|recycle-bin|/recycle-bin|回收站|RecycleBinCron" server/src client/src README.md docs/AGENT_GUIDE.md
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(documents|users|templates|preview)|批量导入|import:users|import:documents|bulk import" server/src client/src packages/types README.md docs/AGENT_GUIDE.md package.json
rg -n "ExportPage|ExportDialog|ExportButton|client/src/api/export|/admin/export|@Controller\\('export|ExportModule|ExportService|/export/(documents|tasks|task-records|deviation-reports|users)|批量导出" server/src client/src packages/types README.md docs/AGENT_GUIDE.md
```

Expected: no active runtime matches. Matches inside archived specs/plans are acceptable only if the path is clearly historical.

- [ ] **Step 4: Run system map**

Run:

```bash
python3 tools/generate-system-map.py
```

Expected: `api_adapter_missing`, `direct_client_missing`, and `deleted_scope_*_residue` are 0. If the script writes `docs/system-map.html`, review the summary section and include the path in the handoff.

- [ ] **Step 5: Run GitNexus change detection**

Run:

```text
mcp__gitnexus__detect_changes({ "repo": "noidear", "scope": "all" })
```

Expected: changed flows align with deleted surfaces and route/menu cleanup.

- [ ] **Step 6: Final commit if validation changed docs/system-map**

If `docs/system-map.html` changed and should be committed:

```bash
git add docs/system-map.html
git commit -m "chore: refresh system map after feature strip"
```

- [ ] **Step 7: Push**

Run:

```bash
git status -sb
git push -u origin codex/app-feature-strip
```

Expected: branch pushed. Include commit hashes, validation commands, and remaining risks in handoff.

---

## Self-Review Checklist

- Mobile workspace, backend mobile API, and mobile Prisma models are removed with migration.
- Backup, health-management, recycle-bin, generic import/export center, and observability stack are removed.
- Web/H5 `client` system remains intact.
- MinIO file storage and business file attachments are preserved.
- Business-owned exports are preserved or migrated to owning modules.
- This plan intentionally does not replace `xlsx`, upgrade major dependencies, create audit scripts, or pin Docker digests; those belong to the second plan.
