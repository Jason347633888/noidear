# Dependency and Image Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the remaining dependency audit and Docker image security gates after the feature-strip plan has merged.

**Architecture:** This is the second execution track for `2026-05-14-full-production-audit-cleanup-design.md`. It assumes unused product/deployment surfaces are already removed, then replaces browser-side `xlsx`, implements machine-checked audit policy scripts, upgrades remaining npm dependency chains, and pins runtime images by immutable digest.

**Tech Stack:** Node 20/npm 10, Vue 3, Vite/Vitest, NestJS, Prisma, ExcelJS, Docker Compose, Trivy, npm audit JSON, YAML, GitNexus.

---

## Execution Rules

- Do not start until `2026-05-14-app-feature-strip-implementation.md` has merged to `master`.
- Implement in an isolated worktree or Multica workspace, not the root checkout.
- Read `docs/AGENT_GUIDE.md`, `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`, and `docs/superpowers/specs/2026-05-14-full-production-audit-cleanup-design.md` before edits.
- Use Node 20/npm 10 for every npm command.
- Before editing functions/classes/methods, run GitNexus impact analysis for the symbol. Before final commit, run `mcp__gitnexus__detect_changes({ "repo": "noidear", "scope": "all" })`.
- Do not restore `mobile`, monitoring stack, Backup, Health management, RecycleBin, or generic ExportModule to make tests pass.
- Keep dependency upgrade commits separate from Excel behavior changes and audit-script changes.
- Never use `npm audit fix --force` without reviewing the diff and proving build/test gates still pass.
- If a high/critical advisory truly has no fix, stop and ask the user to choose: replace dependency, delete capability, or sign a short-term risk in PR description. Do not place high/critical items in the risk register.

Worktree setup:

```bash
git fetch origin master
ROOT_PARENT="$(dirname "$(git rev-parse --show-toplevel)")"
WORKTREE_ROOT="${ROOT_PARENT}/noidear-dependency-image-hardening"
git worktree add "${WORKTREE_ROOT}" -b codex/dependency-image-hardening origin/master
cd "${WORKTREE_ROOT}"
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
git status --short
```

Expected:

```text
noidear-dependency-image-hardening
codex/dependency-image-hardening
```

If running in Multica, use the Multica checkout and verify it is not `/Users/jiashenglin/Desktop/project/noidear`.

Node wrapper:

```bash
npx -y -p node@20 -p npm@10 npm --version
```

Expected: npm 10.x.

## File Structure

### Audit Gate Scripts

- Create `tools/lib/audit-register.mjs`: shared YAML parser, schema validator, npm audit advisory extractor, register/audit joiner, JSON-line diagnostics.
- Create `tools/check-audit-register.mjs`: validates `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml`.
- Create `tools/check-npm-audit-strict.mjs`: runs `npm audit --json`, loads the YAML register itself, and enforces strict policy.
- Modify `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml`: only when low/moderate advisories remain with no stable fix.
- Modify root `package.json` and `package-lock.json`: add the `yaml` dev dependency plus `security:audit:prod`, `security:audit:raw`, `security:audit:register`, `security:audit:strict`, `security:docker`, `verify:full:ci`.
- Add root tests for the audit register library using Node's built-in test runner if no root test framework exists.

### Excel / xlsx Replacement

- App feature strip deletes `client/src/views/admin/ImportPage.vue`, `client/src/api/import.ts`, and `server/src/modules/import/**`; do not rebuild import preview/templates in this hardening plan.
- Do not add a replacement CLI import command in this hardening plan. If bulk import is needed later, rebuild it from a fresh requirement; the old `/import/*` surface was a half-finished product feature and must stay deleted.
- Modify `server/src/modules/training/training.controller.ts` / `training.service.ts` or add a focused export service under `server/src/modules/training/`: expose training statistics Excel export.
- Modify `client/src/views/training/statistics/StatisticsPage.vue`: remove `xlsx` import and download backend blob.
- Modify or create `client/src/api/training.ts`: add export method.
- Remove `xlsx` from `client/package.json` and `package-lock.json`.

### Dependency and Docker Hardening

- Modify root, client, server, and MCP `package.json` / `package-lock.json` only as needed for audit cleanup.
- Create `tools/check-docker-images.sh`: build server/client images, scan local images and third-party digest refs with Trivy.
- Modify `docker-compose.yml`: replace PostgreSQL, Redis, MinIO third-party image refs with immutable digest refs.
- Update README and `docs/AGENT_GUIDE.md` only for new security commands and immutable image policy.

---

## Task 1: Preflight After Feature Strip

**Files:**
- Read current repo state only.

- [ ] **Step 1: Verify branch and clean staged state**

Run:

```bash
pwd
basename "$(git rev-parse --show-toplevel)"
git branch --show-current
git status --short
```

Expected: isolated checkout on `codex/dependency-image-hardening`; no unrelated modifications.

- [ ] **Step 2: Confirm feature-strip already landed**

Run:

```bash
rg -n "\"mobile\"|@dcloudio|uni-app|BackupModule|RecycleBinModule|ExportModule|@Controller\\('export|prometheus|grafana|alertmanager|loki|promtail" package.json package-lock.json server/src client/src docker-compose.yml README.md docs/AGENT_GUIDE.md --glob '!**/node_modules/**' --glob '!**/dist/**'
```

Expected: no active runtime matches. If mobile, backup, recycle-bin, generic import/export, or monitoring stack still exist, stop and run/merge the feature-strip plan first.

- [ ] **Step 3: Install and snapshot audit**

Run:

```bash
npm ci
npm audit --json > /tmp/noidear-audit-before.json || true
node -e "const a=require('/tmp/noidear-audit-before.json'); console.log(a.metadata?.vulnerabilities || a.vulnerabilities)"
```

Expected: outputs current vulnerability counts. Save counts in task notes.

- [ ] **Step 4: Baseline build/test**

Run:

```bash
npm run verify:full
npm run test -w server -- --runInBand
npm run test -w client
```

Expected: establish current baseline before dependency changes.

## Task 2: Implement Audit Register Library and Scripts

**Files:**
- Create `tools/lib/audit-register.mjs`
- Create `tools/check-audit-register.mjs`
- Create `tools/check-npm-audit-strict.mjs`
- Create `tools/audit-register.test.mjs`
- Modify root `package.json`
- Modify `package-lock.json`

- [ ] **Step 1: Write failing tests for register parsing and policy join**

Create `tools/audit-register.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advisoryIdFromVia,
  validateRegister,
  joinAuditWithRegister,
} from './lib/audit-register.mjs';

test('extracts GHSA advisory id from npm audit via URL', () => {
  assert.equal(
    advisoryIdFromVia({ source: 123, name: 'vite', url: 'https://github.com/advisories/GHSA-abcd-efgh-ijkl' }),
    'GHSA-abcd-efgh-ijkl',
  );
});

test('falls back to npm source and name when GHSA URL is absent', () => {
  assert.equal(advisoryIdFromVia({ source: 123, name: 'vite' }), 'npm:123:vite');
  assert.equal(advisoryIdFromVia({ name: 'vite' }), 'npm:vite');
});

test('rejects high severity register entries', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'high',
      occurrences: [],
      currentBlocker: 'none',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 0,
      owner: '@owner',
      notes: 'none',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /severity/);
});

test('flags unknown code path after renewal', () => {
  assert.throws(() => validateRegister({
    version: 1,
    updatedAt: '2026-05-14',
    entries: [{
      advisoryId: 'GHSA-abcd-efgh-ijkl',
      severity: 'moderate',
      occurrences: [{
        workspace: 'client',
        packageName: 'vite',
        packageChain: ['vite'],
        reachedProjectCodePath: 'unknown',
      }],
      currentBlocker: 'No stable fix',
      decision: 'wait_upstream',
      discoveredAt: '2026-05-14',
      nextReviewAt: '2026-05-21',
      renewalCount: 1,
      owner: '@owner',
      notes: '需 code-path 调查 + 下次复核完成 for client/vite',
    }],
  }, new Date('2026-05-14T00:00:00Z')), /unknown/);
});

test('joins audit items against register states', () => {
  const joined = joinAuditWithRegister(
    [{ advisoryId: 'GHSA-abcd-efgh-ijkl', severity: 'moderate', packageName: 'vite', workspace: 'client' }],
    {
      entries: [{
        advisoryId: 'GHSA-abcd-efgh-ijkl',
        severity: 'moderate',
        occurrences: [{
          workspace: 'client',
          packageName: 'vite',
        packageChain: ['vite'],
          reachedProjectCodePath: 'no',
        }],
        currentBlocker: 'No stable fix',
        decision: 'wait_upstream',
        discoveredAt: '2026-05-14',
        nextReviewAt: '2026-05-21',
        renewalCount: 0,
        owner: '@owner',
        notes: 'No project path reached',
      }],
    },
    new Date('2026-05-14T00:00:00Z'),
  );
  assert.equal(joined[0].status, 'registered');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tools/audit-register.test.mjs
```

Expected: FAIL because `tools/lib/audit-register.mjs` does not exist.

- [ ] **Step 3: Add YAML parser dependency**

Run:

```bash
npm install --save-dev yaml
```

Expected: root `package.json` and `package-lock.json` now include `yaml`. Keep this dependency root-scoped so both audit scripts share one parser and the register can be non-empty without custom YAML parsing.

- [ ] **Step 4: Implement shared library**

Create `tools/lib/audit-register.mjs` with these exports and behavior:

```js
import fs from 'node:fs';
import YAML from 'yaml';

const WORKSPACES = new Set(['root', 'client', 'server', 'mobile', 'packages/types', 'tools/noidear-mcp']);
const SEVERITIES = new Set(['low', 'moderate']);
const DECISIONS = new Set(['override', 'wait_upstream', 'replace_dependency', 'remove_capability']);
const CODE_PATH = new Set(['yes', 'no', 'unknown']);

export function advisoryIdFromVia(via) {
  if (!via || typeof via !== 'object') return null;
  const match = String(via.url || '').match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i);
  if (match) return match[0];
  if (via.source && via.name) return `npm:${via.source}:${via.name}`;
  if (via.name) return `npm:${via.name}`;
  return null;
}

export function extractAuditItems(auditJson, workspace = 'root') {
  const items = new Map();
  for (const [packageName, vuln] of Object.entries(auditJson.vulnerabilities || {})) {
    for (const via of vuln.via || []) {
      const advisoryId = advisoryIdFromVia(via);
      if (!advisoryId) continue;
      const current = items.get(advisoryId) || {
        advisoryId,
        severity: via.severity || vuln.severity,
        packageName,
        workspace,
        occurrences: [],
      };
      current.occurrences.push({
        workspace,
        packageName,
        // packageChain stores npm audit's via package list. It is not a full npm ls dependency-tree path.
        packageChain: [packageName, ...((vuln.via || []).filter((entry) => typeof entry === 'string'))],
      });
      items.set(advisoryId, current);
    }
  }
  return [...items.values()];
}

export function loadRegister(path) {
  if (!fs.existsSync(path)) {
    const err = new Error(`register file not found: ${path}`);
    err.code = 'REGISTER_NOT_FOUND';
    throw err;
  }
  const parsed = YAML.parse(fs.readFileSync(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error('register root must be an object');
  return parsed;
}

export function validateRegister(register, now = new Date()) {
  const entries = register.entries || [];
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.advisoryId)) throw new Error(`duplicate advisoryId: ${entry.advisoryId}`);
    ids.add(entry.advisoryId);
    if (!SEVERITIES.has(entry.severity)) throw new Error(`invalid severity for ${entry.advisoryId}`);
    if (!DECISIONS.has(entry.decision)) throw new Error(`invalid decision for ${entry.advisoryId}`);
    if (!entry.owner || entry.owner === 'implementation-agent') throw new Error(`invalid owner for ${entry.advisoryId}`);
    if (!Number.isInteger(entry.renewalCount) || entry.renewalCount < 0 || entry.renewalCount > 4) throw new Error(`invalid renewalCount for ${entry.advisoryId}`);
    const review = new Date(`${entry.nextReviewAt}T23:59:59Z`);
    if (review < now) throw new Error(`expired nextReviewAt for ${entry.advisoryId}`);
    for (const occurrence of entry.occurrences || []) {
      if (!WORKSPACES.has(occurrence.workspace)) throw new Error(`invalid workspace for ${entry.advisoryId}`);
      if (!CODE_PATH.has(occurrence.reachedProjectCodePath)) throw new Error(`invalid reachedProjectCodePath for ${entry.advisoryId}`);
      if (occurrence.reachedProjectCodePath === 'unknown' && entry.renewalCount > 0) throw new Error(`unknown code path past first review for ${entry.advisoryId}`);
    }
  }
  return register;
}

export function joinAuditWithRegister(auditItems, register, now = new Date()) {
  const byId = new Map((register.entries || []).map((entry) => [entry.advisoryId, entry]));
  const results = auditItems.map((item) => {
    const entry = byId.get(item.advisoryId);
    if (!entry) return { ...item, status: 'unregistered' };
    if (['high', 'critical'].includes(item.severity)) return { ...item, status: 'highCriticalNotRegisterable' };
    if (new Date(`${entry.nextReviewAt}T23:59:59Z`) < now) return { ...item, status: 'expired' };
    return { ...item, status: 'registered' };
  });
  for (const entry of register.entries || []) {
    if (!auditItems.some((item) => item.advisoryId === entry.advisoryId)) {
      results.push({ advisoryId: entry.advisoryId, severity: entry.severity, status: 'staleRegistered' });
    }
  }
  return results;
}

export function printJsonLine(code, items) {
  process.stderr.write(`${JSON.stringify({ code, items })}\n`);
}
```

- [ ] **Step 5: Implement register checker**

Create `tools/check-audit-register.mjs`:

```js
#!/usr/bin/env node
import { loadRegister, printJsonLine, validateRegister } from './lib/audit-register.mjs';

const registerPath = process.argv[2] || 'docs/superpowers/specs/2026-05-14-audit-risk-register.yaml';

try {
  const register = loadRegister(registerPath);
  validateRegister(register);
  printJsonLine(0, []);
  process.exit(0);
} catch (error) {
  if (error.code === 'REGISTER_NOT_FOUND') {
    printJsonLine(3, [{ status: 'registerMissing', message: error.message }]);
    process.exit(3);
  }
  printJsonLine(2, [{ status: 'schemaInvalid', message: error.message }]);
  process.exit(2);
}
```

- [ ] **Step 6: Implement strict audit checker**

Create `tools/check-npm-audit-strict.mjs`:

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  extractAuditItems,
  joinAuditWithRegister,
  loadRegister,
  printJsonLine,
  validateRegister,
} from './lib/audit-register.mjs';

const registerPath = 'docs/superpowers/specs/2026-05-14-audit-risk-register.yaml';

try {
  const register = validateRegister(loadRegister(registerPath));
  let auditJson;
  try {
    const output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    auditJson = JSON.parse(output);
  } catch (error) {
    const output = error.stdout || '{}';
    auditJson = JSON.parse(output);
  }

  const auditItems = extractAuditItems(auditJson, 'root');
  const joined = joinAuditWithRegister(auditItems, register);
  const failures = joined.filter((item) => ['unregistered', 'expired', 'highCriticalNotRegisterable'].includes(item.status));
  const warnings = joined.filter((item) => item.status === 'staleRegistered');
  if (failures.length > 0) {
    printJsonLine(1, failures);
    process.exit(1);
  }
  printJsonLine(0, warnings);
  process.exit(0);
} catch (error) {
  if (error.code === 'REGISTER_NOT_FOUND') {
    printJsonLine(3, [{ status: 'registerMissing', message: error.message }]);
    process.exit(3);
  }
  printJsonLine(2, [{ status: 'invalidAuditOrRegister', message: error.message }]);
  process.exit(2);
}
```

- [ ] **Step 7: Add package scripts**

Modify root `package.json` scripts:

```json
{
  "security:audit:prod": "npm audit --omit=dev",
  "security:audit:raw": "npm audit",
  "security:audit:register": "node tools/check-audit-register.mjs docs/superpowers/specs/2026-05-14-audit-risk-register.yaml",
  "security:audit:strict": "node tools/check-npm-audit-strict.mjs",
  "security:docker": "bash tools/check-docker-images.sh",
  "verify:full:ci": "npm run verify:full && npm run security:audit:strict && npm run test -w server -- --runInBand && npm run test -w client && python3 tools/generate-system-map.py"
}
```

Keep existing scripts and add these keys. Do not add a no-suffix `security:audit` alias.

- [ ] **Step 8: Verify audit script tests**

Run:

```bash
node --test tools/audit-register.test.mjs
npm run security:audit:register
```

Expected: PASS and register checker exits 0 for the empty YAML.

- [ ] **Step 9: Commit**

Run:

```bash
git add tools/lib/audit-register.mjs tools/check-audit-register.mjs tools/check-npm-audit-strict.mjs tools/audit-register.test.mjs package.json package-lock.json
git commit -m "chore: add strict audit register gate"
```

## Task 3: Verify In-App Batch Import Is Removed

**Files:**
- Verify only; feature-strip track owns deletion of `client/src/views/admin/ImportPage.vue`, `client/src/api/import.ts`, and `server/src/modules/import/**`.

- [ ] **Step 1: Confirm feature-strip merge state**

Run:

```bash
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(documents|users|templates|preview)|批量导入|import:users|import:documents|bulk import" server/src client/src packages/types README.md docs/AGENT_GUIDE.md package.json
```

Expected: no active runtime matches. If matches remain, stop and return to the first execution track; do not rebuild import preview/templates or replacement CLI import commands in this hardening plan.

- [ ] **Step 2: Keep xlsx removal focused on remaining callers**

Run:

```bash
rg -n "from ['\"]xlsx|import\\s+.*XLSX|require\\(['\"]xlsx|XLSX\\." client/src client/package.json
```

Expected: after import removal, remaining active caller should be training statistics only before Task 4. This plan removes browser-side `xlsx` by moving training statistics export to the backend, then deletes the dependency.

## Task 4: Move Training Statistics Export to Backend

**Files:**
- Modify `server/src/modules/training/training.controller.ts`
- Modify `server/src/modules/training/training.service.ts` or create `server/src/modules/training/training-statistics-export.service.ts`
- Modify `server/src/modules/training/training.module.ts`
- Modify `client/src/api/training.ts`
- Modify `client/src/views/training/statistics/StatisticsPage.vue`

- [ ] **Step 1: Run GitNexus impact checks**

Run:

```text
mcp__gitnexus__impact({ "repo": "noidear", "target": "TrainingService", "direction": "upstream" })
mcp__gitnexus__impact({ "repo": "noidear", "target": "TrainingController", "direction": "upstream" })
```

- [ ] **Step 2: Add failing server tests for export semantics**

Create or update `server/src/modules/training/training-statistics-export.service.spec.ts`:

```ts
import * as ExcelJS from 'exceljs';
import {
  mapTrainingStatusLabel,
  TrainingStatisticsExportService,
} from './training-statistics-export.service';

it('maps every TrainingProjectStatus explicitly', () => {
  expect(mapTrainingStatusLabel('planned' as any)).toBe('计划中');
  expect(mapTrainingStatusLabel('ongoing' as any)).toBe('进行中');
  expect(mapTrainingStatusLabel('completed' as any)).toBe('已完成');
  expect(mapTrainingStatusLabel('cancelled' as any)).toBe('已取消');
  expect(() => mapTrainingStatusLabel('paused' as any)).toThrow(/training status out of contract/);
});

it('exports trainer display name and trainee count, not internal IDs', async () => {
  const service = new TrainingStatisticsExportService({
    trainingProject: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([{
        id: 'project-1',
        title: '年度质量培训',
        department: '质量部',
        quarter: 2,
        status: 'planned',
        trainerId: 'user-trainer-1',
        trainees: ['u1', 'u2', 'u3'],
        scheduledDate: new Date('2026-05-20T00:00:00.000Z'),
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
        learningRecords: [{ id: 'lr-1' }, { id: 'lr-2' }],
      }]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'user-trainer-1', name: '张三', username: 'zhangsan' }]),
    },
  } as any);

  const buffer = await service.exportProjects();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const row = workbook.getWorksheet('培训统计')!.getRow(2).values as any[];

  expect(row).toContain('张三');
  expect(row).not.toContain('user-trainer-1');
  expect(row).toContain(3);
});

it('rejects defensive over-limit training statistics exports', async () => {
  const service = new TrainingStatisticsExportService({
    trainingProject: {
      count: jest.fn().mockResolvedValue(10001),
      findMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  } as any);

  await expect(service.exportProjects()).rejects.toThrow('培训统计导出最多支持 10000 条');
});
```

- [ ] **Step 3: Implement export service**

Create `server/src/modules/training/training-statistics-export.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

const STATUS_LABELS = {
  planned: '计划中',
  ongoing: '进行中',
  completed: '已完成',
  cancelled: '已取消',
} as const;

const MAX_TRAINING_STATISTICS_EXPORT_ROWS = 10000;

export function mapTrainingStatusLabel(status: keyof typeof STATUS_LABELS): string {
  const label = STATUS_LABELS[status];
  if (!label) throw new BadRequestException(`training status out of contract: ${status}`);
  return label;
}

@Injectable()
export class TrainingStatisticsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProjects(): Promise<Buffer> {
    const total = await this.prisma.trainingProject.count();
    if (total > MAX_TRAINING_STATISTICS_EXPORT_ROWS) {
      throw new BadRequestException(`培训统计导出最多支持 ${MAX_TRAINING_STATISTICS_EXPORT_ROWS} 条`);
    }

    const projects = await this.prisma.trainingProject.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_TRAINING_STATISTICS_EXPORT_ROWS,
      include: {
        plan: {
          select: { year: true, title: true },
        },
        learningRecords: {
          select: { id: true },
        },
      },
    });
    const trainerIds = [...new Set(projects.map((project) => project.trainerId).filter(Boolean))];
    const trainers = await this.prisma.user.findMany({
      where: { id: { in: trainerIds } },
      select: { id: true, name: true, username: true },
    });
    const trainerNameById = new Map(trainers.map((trainer) => [
      trainer.id,
      trainer.name || trainer.username || '(未命名讲师)',
    ]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('培训统计');
    sheet.addRow(['项目标题', '部门', '季度', '状态', '学员数', '讲师', '计划日期', '创建时间']);
    for (const project of projects) {
      const traineeCount = project.trainees.length;
      sheet.addRow([
        project.title,
        project.department,
        `Q${project.quarter}`,
        mapTrainingStatusLabel(project.status as any),
        traineeCount,
        trainerNameById.get(project.trainerId) ?? '(未匹配讲师)',
        project.scheduledDate ? project.scheduledDate.toISOString().slice(0, 10) : '',
        project.createdAt.toISOString().slice(0, 10),
      ]);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
```

The snippet matches the current `TrainingProject` Prisma model: `department` is a string, `trainees` is the project trainee ID array, `trainerId` is the stored trainer identifier, and `scheduledDate` is the planned date field. It exports all training projects, resolves trainer display names from `User`, uses `trainees.length` for the "学员数" column, and keeps a defensive 10000-row back-end limit without introducing async export jobs. Unknown project statuses must fail with `BadRequestException` instead of being silently mapped to "未知" or "已取消".

- [ ] **Step 4: Add controller endpoint**

In `TrainingController`, inject `TrainingStatisticsExportService` and add:

```ts
@Get('statistics/export')
async exportStatistics(@Res() res: Response) {
  const buffer = await this.statisticsExportService.exportProjects();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="training-statistics-${Date.now()}.xlsx"`);
  res.send(buffer);
}
```

Add needed imports:

```ts
import { Get, Res } from '@nestjs/common';
import { Response } from 'express';
```

Register the new service in `TrainingModule.providers`.

- [ ] **Step 5: Update front-end training API**

In `client/src/api/training.ts`, add:

```ts
export function exportTrainingStatistics(): Promise<Blob> {
  return request.get('/training/statistics/export', { responseType: 'blob' });
}
```

Use the existing request import/style in that file.

- [ ] **Step 6: Remove XLSX from StatisticsPage**

In `client/src/views/training/statistics/StatisticsPage.vue`, remove:

```ts
import * as XLSX from 'xlsx';
```

Replace local `XLSX.utils.json_to_sheet` / `XLSX.writeFile` export logic with:

```ts
const exportStatistics = async () => {
  const blob = await exportTrainingStatistics();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `培训统计_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
```

- [ ] **Step 7: Verify training export**

Run:

```bash
npm run test -w server -- training-statistics-export.service.spec.ts --runInBand
npm run build:server
npm run build:client
rg -n "from ['\"]xlsx|import\\s+.*XLSX|require\\(['\"]xlsx|XLSX\\." client/src/views/training/statistics/StatisticsPage.vue
```

Expected: tests/build pass; no `xlsx` import/call remains in training statistics page.

- [ ] **Step 8: Commit**

Run:

```bash
git add server/src/modules/training client/src/api/training.ts client/src/views/training/statistics/StatisticsPage.vue
git commit -m "feat: move training statistics export to backend"
```

## Task 5: Remove xlsx Dependency and Clear Remaining npm Advisories

**Files:**
- Modify `client/package.json`
- Modify root `package-lock.json`
- Modify root/client/server/MCP package manifests as audit requires
- Modify `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml` only for allowed low/moderate no-fix advisories

- [ ] **Step 1: Remove xlsx**

Remove this from `client/package.json`:

```json
"xlsx": "^0.18.5"
```

Run:

```bash
npm install --package-lock-only
npm ls xlsx
```

Expected: `npm ls xlsx` does not show `xlsx`.

- [ ] **Step 2: Run strict audit and classify**

Run:

```bash
npm audit --json > /tmp/noidear-audit-after-xlsx.json || true
npm run security:audit:strict || true
```

Expected: high/critical advisories must be fixed by dependency replacement/upgrade/deletion. Low/moderate may enter register only if no stable fix exists.

- [ ] **Step 3: Apply dependency fixes in small groups**

For each remaining dependency group, use this loop:

```bash
npm outdated
npm audit --json > /tmp/noidear-audit-current.json || true
```

Then choose the smallest safe action:

- Patch/minor upgrade when available.
- npm `overrides` for transitive package when direct upgrade is not needed.
- Major upgrade only when audit cannot clear otherwise.
- Dependency deletion when dependency only served deleted surfaces.

Work in this order: high severity before moderate before low; within the same severity, fix the shortest direct package chain first so direct dependencies are upgraded before deep transitive chains. Do not batch unrelated major upgrades. Example command for one direct package:

```bash
TARGET_WORKSPACE=client
TARGET_PACKAGE=vite
TARGET_VERSION=latest-fixed-stable-version-from-audit
npm install "${TARGET_PACKAGE}@${TARGET_VERSION}" -w "${TARGET_WORKSPACE}"
npm run build:server
npm run build:client
npm run test -w server -- --runInBand
npm run test -w client
```

Set `TARGET_WORKSPACE`, `TARGET_PACKAGE`, and `TARGET_VERSION` from the current `npm audit --json` item before running the command. The commit message must name the package group being fixed.

- [ ] **Step 4: Update risk register only for allowed residuals**

If strict audit has low/moderate advisories without stable fixes, update `docs/superpowers/specs/2026-05-14-audit-risk-register.yaml` using this shape. Do not copy the dates below literally; compute `updatedAt` and `discoveredAt` from the day the advisory is first observed, and set `nextReviewAt` to that date plus 7 days.

```yaml
version: 1
updatedAt: "<discovery-date>"
entries:
  - advisoryId: "GHSA-xxxx-xxxx-xxxx"
    severity: "moderate"
    occurrences:
      - workspace: "client"
        packageName: "vite"
        packageChain:
          - "vite"
          - "esbuild"
        reachedProjectCodePath: "no"
    currentBlocker: "No stable fixed release exists as of <discovery-date>."
    decision: "wait_upstream"
    discoveredAt: "<discovery-date>"
    nextReviewAt: "<discovery-date-plus-7-days>"
    renewalCount: 0
    owner: "@actual-owner"
    notes: "packageChain is npm audit's via package list, not a full npm ls tree path. No runtime code path reached; recheck upstream release notes by <discovery-date-plus-7-days>."
```

Do not register high/critical. Do not leave `owner` as `implementation-agent`. Do not use `unknown` unless notes require code-path investigation by the next review.

- [ ] **Step 5: Verify npm security gate**

Run:

```bash
npm run security:audit:register
npm run security:audit:strict
npm audit
```

Expected:

- `security:audit:register` exits 0.
- `security:audit:strict` exits 0.
- `npm audit` exits 0 if all vulnerabilities cleared; if low/moderate remain and are registered, `npm audit` may still exit nonzero, and the handoff must state “full cleanup blocked by upstream stable fix” rather than “cleared”.

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json client/package.json server/package.json tools/noidear-mcp/package.json docs/superpowers/specs/2026-05-14-audit-risk-register.yaml
git commit -m "chore: clear npm audit dependency chain"
```

## Task 6: Pin Third-Party Docker Images by Immutable Digest

**Files:**
- Modify `docker-compose.yml`
- Create `tools/check-docker-images.sh`
- Modify `package.json`
- Update README / `docs/AGENT_GUIDE.md` if command docs exist

- [ ] **Step 1: Select candidate tags and resolve digests**

For PostgreSQL, Redis, and MinIO, choose stable official tags published in the last 60 days. Use these commands to inspect, pull, and resolve digest refs:

```bash
POSTGRES_TAG=resolved-recent-stable-tag
REDIS_TAG=resolved-recent-stable-tag
MINIO_TAG=resolved-recent-release-tag

docker pull "postgres:${POSTGRES_TAG}"
POSTGRES_REF="$(docker image inspect "postgres:${POSTGRES_TAG}" --format '{{index .RepoDigests 0}}')"

docker pull "redis:${REDIS_TAG}"
REDIS_REF="$(docker image inspect "redis:${REDIS_TAG}" --format '{{index .RepoDigests 0}}')"

docker pull "minio/minio:${MINIO_TAG}"
MINIO_REF="$(docker image inspect "minio/minio:${MINIO_TAG}" --format '{{index .RepoDigests 0}}')"

printf '%s\n%s\n%s\n' "$POSTGRES_REF" "$REDIS_REF" "$MINIO_REF"
```

Expected output examples:

```text
postgres@sha256:resolved-postgres-digest
redis@sha256:resolved-redis-digest
minio/minio@sha256:resolved-minio-digest
```

Do not commit rolling tags like `postgres:15-alpine`, `redis:7-alpine`, or `minio/minio:latest`.

- [ ] **Step 2: Scan candidate refs**

Run:

```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 "$POSTGRES_REF"
trivy image --severity HIGH,CRITICAL --exit-code 1 "$REDIS_REF"
trivy image --severity HIGH,CRITICAL --exit-code 1 "$MINIO_REF"
```

Expected: all exit 0. If any fail, choose a different official stable tag within the last 60 days. If three candidate tags for the same image fail Trivy, stop and report; do not commit a partial `docker-compose.yml` change, and leave the feature-strip branch's existing compose image refs untouched until the user chooses a risk tradeoff or alternate image.

- [ ] **Step 3: Update docker-compose image refs**

Replace image refs in `docker-compose.yml`:

```yaml
postgres:
  image: postgres@sha256:resolved-postgres-digest

redis:
  image: redis@sha256:resolved-redis-digest

minio:
  image: minio/minio@sha256:resolved-minio-digest
```

Use the exact digest strings from Step 1.

- [ ] **Step 4: Create Docker scan script**

Create `tools/check-docker-images.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if ! command -v trivy >/dev/null 2>&1; then
  echo "trivy is required. Install from https://aquasecurity.github.io/trivy/" >&2
  exit 2
fi

if [[ "${SKIP_DOCKER_BUILD:-0}" != "1" ]]; then
  docker compose build server client
fi

SERVER_IMAGE_ID="$(docker compose images -q server)"
CLIENT_IMAGE_ID="$(docker compose images -q client)"
docker image tag "${SERVER_IMAGE_ID}" noidear-server:audit-local
docker image tag "${CLIENT_IMAGE_ID}" noidear-client:audit-local

mapfile -t THIRD_PARTY_IMAGES < <(
  docker compose config --format json | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      const config = JSON.parse(input);
      for (const name of ["postgres", "redis", "minio"]) {
        const ref = config.services?.[name]?.image;
        if (!ref) {
          console.error(`missing image ref for service ${name}`);
          process.exit(3);
        }
        console.log(ref);
      }
    });
  '
)
if (( ${#THIRD_PARTY_IMAGES[@]} != 3 )); then
  echo "docker compose config must expose postgres, redis, and minio image refs" >&2
  exit 3
fi

failures=()
for image in noidear-server:audit-local noidear-client:audit-local "${THIRD_PARTY_IMAGES[@]}"; do
  if [[ -z "${image}" || "${image}" == *":latest" || ( "${image}" != *@sha256:* && "${image}" != noidear-* ) ]]; then
    echo "invalid image ref for scan: ${image}" >&2
    failures+=("${image}:invalid-ref")
    continue
  fi
  if ! trivy image --severity HIGH,CRITICAL --exit-code 1 "${image}"; then
    failures+=("${image}")
  fi
done

if (( ${#failures[@]} > 0 )); then
  printf 'Docker image scan failed for:\n' >&2
  printf ' - %s\n' "${failures[@]}" >&2
  exit 1
fi
```

Make executable:

```bash
chmod +x tools/check-docker-images.sh
```

- [ ] **Step 5: Add script to root package if missing**

Ensure root `package.json` has:

```json
"security:docker": "bash tools/check-docker-images.sh"
```

- [ ] **Step 6: Verify Docker gate**

Run:

```bash
npm run security:docker
rg -n "image: .*:latest|postgres:[^@]|redis:[^@]|minio/minio:[^@]" docker-compose.yml
```

Expected: scan exits 0. The `rg` command has no matches for third-party rolling tags.

- [ ] **Step 7: Commit**

Run:

```bash
git add docker-compose.yml tools/check-docker-images.sh package.json README.md docs/AGENT_GUIDE.md
git commit -m "chore: pin and scan docker images"
```

## Task 7: Final CI Gate and System Map Verification

**Files:**
- Modify docs if command references changed
- Generated `docs/system-map.html` if script writes it

- [ ] **Step 1: Run full verification**

Run:

```bash
npm ci
npm run security:audit:register
npm run security:audit:strict
npm run security:docker
npm run verify:full:ci
```

Expected:

- Security scripts exit 0.
- `verify:full:ci` covers `verify:full`, server tests, client tests, and system-map generation.
- Builds/tests pass.
- System map reports `api_adapter_missing`, `direct_client_missing`, and `deleted_scope_*_residue` as 0.

- [ ] **Step 2: Run residual scans**

Run:

```bash
rg -n "from ['\"]xlsx|import\\s+.*XLSX|require\\(['\"]xlsx|XLSX\\." client/src client/package.json
npm ls xlsx
rg -n "ImportPage|client/src/api/import|/admin/import|@Controller\\('import|ImportModule|ImportService|/import/(documents|users|templates|preview)|批量导入|import:users|import:documents|bulk import" server/src client/src packages/types README.md docs/AGENT_GUIDE.md package.json
rg -n "image: .*:latest|mobile/package.json|prometheus|grafana|alertmanager|loki|promtail|@willsoto/nestjs-prometheus|prom-client" docker-compose.yml client/Dockerfile server/Dockerfile server/package.json README.md docs/AGENT_GUIDE.md monitoring server/src --glob '!**/coverage/**' --glob '!**/dist/**'
rg -n "security:audit\\\"" package.json
```

Expected:

- No browser-side `xlsx`.
- `npm ls xlsx` does not show `xlsx`.
- No in-app or CLI replacement bulk import surface.
- No deleted observability/mobile dependency residue.
- No no-suffix `security:audit` script.

- [ ] **Step 3: Run GitNexus detection**

Run:

```text
mcp__gitnexus__detect_changes({ "repo": "noidear", "scope": "all" })
```

Expected: changed flows are dependency gates, training statistics Excel export, and Docker config only. Application import-center paths should already be absent from the feature-strip branch and must not be rebuilt here.

- [ ] **Step 4: Commit generated verification artifacts if needed**

If `docs/system-map.html` changed and is tracked:

```bash
git add docs/system-map.html
git commit -m "chore: refresh system map after hardening"
```

- [ ] **Step 5: Push**

Run:

```bash
git status -sb
git push -u origin codex/dependency-image-hardening
```

Expected: branch pushed. Handoff must include commit hashes, exact verification output summary, npm audit status, Docker image refs, and any risk-register entries.

---

## Self-Review Checklist

- This plan assumes the feature-strip plan is already merged.
- Browser-side `xlsx` is removed; in-app batch import was deleted by the feature-strip track, and backend ExcelJS owns the remaining training statistics export.
- Strict audit/register scripts have a shared implementation and machine-readable contract.
- npm audit high/critical items are not registered as risk entries.
- Third-party Docker images use immutable digest refs, not rolling tags.
- Generic import/export center is not restored.
