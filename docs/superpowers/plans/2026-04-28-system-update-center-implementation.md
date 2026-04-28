# System Update Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立“系统更新中心”，让 staging 自动发布、production 管理员批准发布、发布前备份、发布后冒烟、应用失败自动回滚、数据库和 MinIO 恢复二次确认形成闭环。

**Architecture:** 后端新增 `system-update` 模块，负责版本、部署、备份、数据脚本和操作审计的持久化与权限控制；服务器脚本负责实际 Docker Compose 发布、备份、健康检查、冒烟和回滚；GitHub Actions 通过 SSH 调用服务器脚本并把结果回写后端；前端新增后台页面展示版本状态并发起生产批准、重试、恢复确认。

**Tech Stack:** NestJS、Prisma、PostgreSQL、Vue 3、Element Plus、TypeScript、GitHub Actions、Docker Compose、Bash、MinIO、pg_dump。

---

## 约束和边界

- 所有用户业务数据、历史文档、审批、记录、供应商证照、外检文件都不能被发布流程覆盖或删除。
- staging 可以自动部署；production 必须由 admin 在后台批准或通过 GitHub Actions 手动 workflow 输入批准信息。
- 应用代码失败可以自动回滚到上一可用 commit；数据库恢复和 MinIO 恢复必须由 admin 二次确认。
- 第一版不引入 Kubernetes、镜像仓库、灰度流量和应用进程自更新。
- schema 只允许走受控脚本：优先 `prisma migrate deploy`，检测到 drift 时记录失败并停止自动发布，交给 admin 审核处理。

## 文件结构

### 后端

- Modify: `server/src/prisma/schema.prisma`
  - 新增更新中心枚举和模型。
  - 在 `User` 模型补充操作人反向关系。
- Create: `server/src/modules/system-update/system-update.module.ts`
  - 注册 controller、service、health service、audit service。
- Create: `server/src/modules/system-update/system-update.controller.ts`
  - 暴露 admin API 和 agent 回写 API。
- Create: `server/src/modules/system-update/system-update.service.ts`
  - 版本、部署、备份、恢复确认的核心业务逻辑。
- Create: `server/src/modules/system-update/system-update-health.service.ts`
  - 汇总健康检查和业务冒烟结果。
- Create: `server/src/modules/system-update/system-update-audit.service.ts`
  - 记录发布、批准、回滚、恢复确认审计。
- Create: `server/src/modules/system-update/dto/create-release.dto.ts`
- Create: `server/src/modules/system-update/dto/create-deployment.dto.ts`
- Create: `server/src/modules/system-update/dto/update-deployment-status.dto.ts`
- Create: `server/src/modules/system-update/dto/approve-production.dto.ts`
- Create: `server/src/modules/system-update/dto/confirm-restore.dto.ts`
- Create: `server/src/modules/system-update/system-update.service.spec.ts`
- Create: `server/src/modules/system-update/system-update.controller.spec.ts`
- Modify: `server/src/app.module.ts`
  - 引入 `SystemUpdateModule`。

### 部署脚本

- Create: `scripts/deploy.sh`
- Create: `scripts/backup-db.sh`
- Create: `scripts/check-schema.sh`
- Create: `scripts/apply-schema.sh`
- Create: `scripts/run-data-scripts.sh`
- Create: `scripts/snapshot-minio.sh`
- Create: `scripts/health-check.sh`
- Create: `scripts/smoke-test.sh`
- Create: `scripts/rollback-app.sh`
- Create: `scripts/restore-db.sh`
- Create: `scripts/restore-minio.sh`

### GitHub Actions

- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`

### 前端

- Create: `client/src/api/system-update.ts`
- Create: `client/src/views/system-update/SystemUpdateCenter.vue`
- Create: `client/src/views/system-update/__tests__/SystemUpdateCenter.spec.ts`
- Modify: `client/src/router/index.ts`
  - 新增 `/system-update` 路由。
- Modify: `client/src/views/Layout.vue`
  - 在系统管理菜单加入“系统更新中心”。

---

## Task 1: Prisma 模型和迁移

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Generate: `server/src/prisma/migrations/<timestamp>_add_system_update_center/migration.sql`

- [ ] **Step 1: 在 schema 中给 `User` 增加反向关系**

在 `model User` 的字段区加入：

```prisma
  updateDeployments UpdateDeployment[] @relation("UpdateDeploymentActor")
  updateAuditActions UpdateActionAudit[] @relation("UpdateActionActor")
```

- [ ] **Step 2: 在 schema 末尾新增枚举和模型**

```prisma
enum UpdateEnvironmentKind {
  development
  staging
  production
}

enum UpdateDeploymentStatus {
  pending
  running
  succeeded
  failed
  rolled_back
  rollback_failed
}

enum UpdateReleaseStatus {
  discovered
  staging_running
  staging_passed
  staging_failed
  production_ready
  production_running
  production_passed
  production_failed
}

enum UpdateBackupType {
  database
  minio_manifest
  minio_snapshot
  config
}

enum UpdateTriggerType {
  github_push
  workflow_dispatch
  admin_approval
  admin_retry
  admin_rollback
}

enum UpdateActionRiskLevel {
  low
  medium
  high
  critical
}

model UpdateEnvironment {
  id               String                @id @default(cuid())
  name             String                @unique
  kind             UpdateEnvironmentKind
  serverHost       String?
  appUrl           String?
  currentVersion   String?
  currentCommit    String?
  currentStatus    String                @default("unknown")
  lastDeploymentId String?
  metadata         Json?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  deployments UpdateDeployment[]
  backups     UpdateBackup[]

  @@map("update_environments")
}

model UpdateRelease {
  id               String              @id @default(cuid())
  versionTag       String?
  commitHash       String
  branchName       String
  title            String
  changelog        String?
  status           UpdateReleaseStatus @default(discovered)
  githubRunId      String?
  githubRunUrl     String?
  buildMetadata    Json?
  createdBy        String?
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  deployments UpdateDeployment[]

  @@unique([commitHash, branchName])
  @@index([status])
  @@index([createdAt])
  @@map("update_releases")
}

model UpdateDeployment {
  id             String                 @id @default(cuid())
  releaseId      String
  environmentId  String
  status         UpdateDeploymentStatus @default(pending)
  triggerType    UpdateTriggerType
  actorId        String?
  startedAt      DateTime?
  finishedAt     DateTime?
  previousCommit String?
  targetCommit   String
  backupId       String?
  healthResult   Json?
  smokeResult    Json?
  schemaResult   Json?
  dataResult     Json?
  logsPath       String?
  errorStage     String?
  errorMessage   String?
  rollbackResult Json?
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  release     UpdateRelease     @relation(fields: [releaseId], references: [id], onDelete: Cascade)
  environment UpdateEnvironment @relation(fields: [environmentId], references: [id], onDelete: Restrict)
  actor       User?             @relation("UpdateDeploymentActor", fields: [actorId], references: [id], onDelete: SetNull)
  backup      UpdateBackup?     @relation("UpdateDeploymentBackup", fields: [backupId], references: [id], onDelete: SetNull)
  scriptRuns  UpdateDataScriptRun[]
  audits      UpdateActionAudit[]

  @@index([releaseId])
  @@index([environmentId])
  @@index([status])
  @@index([createdAt])
  @@map("update_deployments")
}

model UpdateBackup {
  id              String           @id @default(cuid())
  environmentId   String
  deploymentId    String?
  type            UpdateBackupType
  filePath        String
  fileSize        BigInt?
  checksum        String?
  metadata        Json?
  restoreApproved Boolean          @default(false)
  restoreApprovedBy String?
  restoreApprovedAt DateTime?
  createdAt       DateTime         @default(now())

  environment UpdateEnvironment @relation(fields: [environmentId], references: [id], onDelete: Restrict)
  deployments UpdateDeployment[] @relation("UpdateDeploymentBackup")

  @@index([environmentId])
  @@index([type])
  @@index([createdAt])
  @@map("update_backups")
}

model UpdateDataScriptRun {
  id           String   @id @default(cuid())
  deploymentId String
  scriptId     String
  scriptName   String
  scriptVersion String
  status       String
  output       Json?
  startedAt    DateTime
  finishedAt   DateTime?
  createdAt    DateTime @default(now())

  deployment UpdateDeployment @relation(fields: [deploymentId], references: [id], onDelete: Cascade)

  @@unique([deploymentId, scriptId, scriptVersion])
  @@index([status])
  @@map("update_data_script_runs")
}

model UpdateActionAudit {
  id           String                @id @default(cuid())
  deploymentId String?
  actorId      String?
  action       String
  riskLevel    UpdateActionRiskLevel
  targetType   String
  targetId     String?
  reason       String?
  result       String
  metadata     Json?
  createdAt    DateTime              @default(now())

  deployment UpdateDeployment? @relation(fields: [deploymentId], references: [id], onDelete: SetNull)
  actor      User?             @relation("UpdateActionActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([deploymentId])
  @@index([actorId])
  @@index([action])
  @@index([createdAt])
  @@map("update_action_audits")
}
```

- [ ] **Step 3: 生成迁移**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma migrate dev --name add_system_update_center --create-only
```

Expected:

```text
Prisma Migrate created the following migration without applying it
```

- [ ] **Step 4: 校验 schema**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma validate --schema=src/prisma/schema.prisma
```

Expected:

```text
The schema at src/prisma/schema.prisma is valid
```

- [ ] **Step 5: 生成 Prisma Client**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma generate --schema=src/prisma/schema.prisma
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 6: 提交**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations
git commit -m "feat: add system update center schema"
```

---

## Task 2: 后端 system-update 模块

**Files:**
- Create: `server/src/modules/system-update/system-update.module.ts`
- Create: `server/src/modules/system-update/system-update.controller.ts`
- Create: `server/src/modules/system-update/system-update.service.ts`
- Create: `server/src/modules/system-update/system-update-health.service.ts`
- Create: `server/src/modules/system-update/system-update-audit.service.ts`
- Create: `server/src/modules/system-update/dto/create-release.dto.ts`
- Create: `server/src/modules/system-update/dto/create-deployment.dto.ts`
- Create: `server/src/modules/system-update/dto/update-deployment-status.dto.ts`
- Create: `server/src/modules/system-update/dto/approve-production.dto.ts`
- Create: `server/src/modules/system-update/dto/confirm-restore.dto.ts`
- Create: `server/src/modules/system-update/system-update.service.spec.ts`
- Create: `server/src/modules/system-update/system-update.controller.spec.ts`
- Modify: `server/src/app.module.ts`

- [ ] **Step 1: 写 service 失败测试**

Create `server/src/modules/system-update/system-update.service.spec.ts`:

```ts
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemUpdateAuditService } from './system-update-audit.service';
import { SystemUpdateService } from './system-update.service';

const prismaMock = {
  updateRelease: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  updateEnvironment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  updateDeployment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  updateBackup: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('SystemUpdateService', () => {
  let service: SystemUpdateService;
  const audit = { record: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SystemUpdateService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SystemUpdateAuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(SystemUpdateService);
  });

  it('upserts release by commitHash and branchName', async () => {
    prismaMock.updateRelease.upsert.mockResolvedValue({ id: 'rel-1', commitHash: 'abc', branchName: 'master' });

    const result = await service.createReleaseFromGithub({
      commitHash: 'abc',
      branchName: 'master',
      title: 'main build',
      versionTag: '2026.04.28-1',
      changelog: '更新中心发布',
      githubRunId: '100',
      githubRunUrl: 'https://github.com/Jason347633888/noidear/actions/runs/100',
    });

    expect(result.id).toBe('rel-1');
    expect(prismaMock.updateRelease.upsert).toHaveBeenCalledWith({
      where: { commitHash_branchName: { commitHash: 'abc', branchName: 'master' } },
      update: expect.objectContaining({ title: 'main build', versionTag: '2026.04.28-1' }),
      create: expect.objectContaining({ commitHash: 'abc', branchName: 'master' }),
    });
  });

  it('rejects production approval when staging did not pass', async () => {
    prismaMock.updateRelease.findUnique.mockResolvedValue({
      id: 'rel-1',
      status: 'staging_failed',
      commitHash: 'abc',
      deployments: [],
    });

    await expect(service.approveProduction('rel-1', 'user-1', { reason: '上线' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates production deployment after staging passed', async () => {
    prismaMock.updateRelease.findUnique.mockResolvedValue({
      id: 'rel-1',
      status: 'staging_passed',
      commitHash: 'abc',
      deployments: [{ environment: { kind: 'staging' }, status: 'succeeded' }],
    });
    prismaMock.updateEnvironment.findUnique.mockResolvedValue({ id: 'env-prod', kind: 'production' });
    prismaMock.updateDeployment.create.mockResolvedValue({ id: 'dep-1', status: 'pending' });
    prismaMock.updateRelease.update.mockResolvedValue({ id: 'rel-1', status: 'production_ready' });

    const result = await service.approveProduction('rel-1', 'user-1', { reason: '上线' });

    expect(result.id).toBe('dep-1');
    expect(prismaMock.updateDeployment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        releaseId: 'rel-1',
        environmentId: 'env-prod',
        triggerType: 'admin_approval',
        actorId: 'user-1',
        targetCommit: 'abc',
      }),
    });
  });

  it('requires confirmation phrase before backup restore approval', async () => {
    prismaMock.updateBackup.findUnique.mockResolvedValue({ id: 'backup-1', type: 'database' });

    await expect(
      service.confirmRestore('backup-1', 'user-1', { confirmation: '错误确认', reason: '恢复数据库' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when backup is missing', async () => {
    prismaMock.updateBackup.findUnique.mockResolvedValue(null);

    await expect(
      service.confirmRestore('backup-missing', 'user-1', { confirmation: 'CONFIRM_RESTORE', reason: '恢复数据库' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- system-update.service.spec.ts
```

Expected:

```text
Cannot find module './system-update.service'
```

- [ ] **Step 3: 新增 DTO**

Create `server/src/modules/system-update/dto/create-release.dto.ts`:

```ts
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  commitHash!: string;

  @IsString()
  branchName!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  versionTag?: string;

  @IsOptional()
  @IsString()
  changelog?: string;

  @IsOptional()
  @IsString()
  githubRunId?: string;

  @IsOptional()
  @IsUrl()
  githubRunUrl?: string;
}
```

Create `server/src/modules/system-update/dto/create-deployment.dto.ts`:

```ts
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDeploymentDto {
  @IsString()
  releaseId!: string;

  @IsString()
  environmentName!: string;

  @IsIn(['github_push', 'workflow_dispatch', 'admin_approval', 'admin_retry', 'admin_rollback'])
  triggerType!: 'github_push' | 'workflow_dispatch' | 'admin_approval' | 'admin_retry' | 'admin_rollback';

  @IsString()
  targetCommit!: string;

  @IsOptional()
  @IsString()
  previousCommit?: string;
}
```

Create `server/src/modules/system-update/dto/update-deployment-status.dto.ts`:

```ts
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDeploymentStatusDto {
  @IsIn(['pending', 'running', 'succeeded', 'failed', 'rolled_back', 'rollback_failed'])
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'rolled_back' | 'rollback_failed';

  @IsOptional()
  @IsString()
  errorStage?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  logsPath?: string;

  @IsOptional()
  @IsObject()
  healthResult?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  smokeResult?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  schemaResult?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  dataResult?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  rollbackResult?: Record<string, unknown>;
}
```

Create `server/src/modules/system-update/dto/approve-production.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class ApproveProductionDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
```

Create `server/src/modules/system-update/dto/confirm-restore.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class ConfirmRestoreDto {
  @IsString()
  confirmation!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}
```

- [ ] **Step 4: 新增 audit service**

Create `server/src/modules/system-update/system-update-audit.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type AuditInput = {
  deploymentId?: string;
  actorId?: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  targetType: string;
  targetId?: string;
  reason?: string;
  result: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class SystemUpdateAuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: AuditInput) {
    return this.prisma.updateActionAudit.create({
      data: {
        deploymentId: input.deploymentId,
        actorId: input.actorId,
        action: input.action,
        riskLevel: input.riskLevel,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        result: input.result,
        metadata: input.metadata,
      },
    });
  }
}
```

- [ ] **Step 5: 新增 health service**

Create `server/src/modules/system-update/system-update-health.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

export type SystemUpdateHealthSummary = {
  api: 'ok';
  checkedAt: string;
  checks: Array<{ name: string; status: 'passed'; detail: string }>;
};

@Injectable()
export class SystemUpdateHealthService {
  getBackendSummary(): SystemUpdateHealthSummary {
    return {
      api: 'ok',
      checkedAt: new Date().toISOString(),
      checks: [
        { name: 'system-update-api', status: 'passed', detail: '系统更新中心 API 可访问' },
      ],
    };
  }
}
```

- [ ] **Step 6: 新增 service 实现**

Create `server/src/modules/system-update/system-update.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { ConfirmRestoreDto } from './dto/confirm-restore.dto';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateDeploymentStatusDto } from './dto/update-deployment-status.dto';
import { SystemUpdateAuditService } from './system-update-audit.service';

@Injectable()
export class SystemUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SystemUpdateAuditService,
  ) {}

  listEnvironments() {
    return this.prisma.updateEnvironment.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
  }

  listReleases() {
    return this.prisma.updateRelease.findMany({
      orderBy: { createdAt: 'desc' },
      include: { deployments: { include: { environment: true }, orderBy: { createdAt: 'desc' } } },
      take: 50,
    });
  }

  listDeployments() {
    return this.prisma.updateDeployment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { release: true, environment: true, actor: { select: { id: true, name: true, email: true } } },
      take: 100,
    });
  }

  listBackups() {
    return this.prisma.updateBackup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { environment: true },
      take: 100,
    });
  }

  createReleaseFromGithub(dto: CreateReleaseDto) {
    return this.prisma.updateRelease.upsert({
      where: { commitHash_branchName: { commitHash: dto.commitHash, branchName: dto.branchName } },
      update: {
        title: dto.title,
        versionTag: dto.versionTag,
        changelog: dto.changelog,
        githubRunId: dto.githubRunId,
        githubRunUrl: dto.githubRunUrl,
      },
      create: {
        commitHash: dto.commitHash,
        branchName: dto.branchName,
        title: dto.title,
        versionTag: dto.versionTag,
        changelog: dto.changelog,
        githubRunId: dto.githubRunId,
        githubRunUrl: dto.githubRunUrl,
      },
    });
  }

  async createDeploymentFromAgent(dto: CreateDeploymentDto) {
    const environment = await this.prisma.updateEnvironment.findUnique({ where: { name: dto.environmentName } });
    if (!environment) {
      throw new NotFoundException(`环境不存在: ${dto.environmentName}`);
    }

    return this.prisma.updateDeployment.create({
      data: {
        releaseId: dto.releaseId,
        environmentId: environment.id,
        triggerType: dto.triggerType,
        targetCommit: dto.targetCommit,
        previousCommit: dto.previousCommit,
        status: 'running',
        startedAt: new Date(),
      },
    });
  }

  async updateDeploymentStatus(id: string, dto: UpdateDeploymentStatusDto) {
    const deployment = await this.prisma.updateDeployment.findUnique({
      where: { id },
      include: { release: true, environment: true },
    });
    if (!deployment) {
      throw new NotFoundException('部署记录不存在');
    }

    const finished = ['succeeded', 'failed', 'rolled_back', 'rollback_failed'].includes(dto.status);
    const updated = await this.prisma.updateDeployment.update({
      where: { id },
      data: {
        status: dto.status,
        finishedAt: finished ? new Date() : undefined,
        errorStage: dto.errorStage,
        errorMessage: dto.errorMessage,
        logsPath: dto.logsPath,
        healthResult: dto.healthResult,
        smokeResult: dto.smokeResult,
        schemaResult: dto.schemaResult,
        dataResult: dto.dataResult,
        rollbackResult: dto.rollbackResult,
      },
    });

    if (dto.status === 'succeeded') {
      await this.prisma.updateEnvironment.update({
        where: { id: deployment.environmentId },
        data: {
          currentCommit: deployment.targetCommit,
          currentVersion: deployment.release.versionTag,
          currentStatus: 'healthy',
          lastDeploymentId: deployment.id,
        },
      });
      await this.prisma.updateRelease.update({
        where: { id: deployment.releaseId },
        data: {
          status: deployment.environment.kind === 'production' ? 'production_passed' : 'staging_passed',
        },
      });
    }

    if (dto.status === 'failed') {
      await this.prisma.updateRelease.update({
        where: { id: deployment.releaseId },
        data: {
          status: deployment.environment.kind === 'production' ? 'production_failed' : 'staging_failed',
        },
      });
    }

    return updated;
  }

  async approveProduction(releaseId: string, actorId: string, dto: ApproveProductionDto) {
    const release = await this.prisma.updateRelease.findUnique({
      where: { id: releaseId },
      include: { deployments: { include: { environment: true } } },
    });
    if (!release) {
      throw new NotFoundException('版本不存在');
    }

    const hasPassedStaging = release.deployments.some(
      deployment => deployment.environment.kind === 'staging' && deployment.status === 'succeeded',
    );
    if (!hasPassedStaging || release.status !== 'staging_passed') {
      throw new ForbiddenException('只有 staging 通过的版本才能批准 production 发布');
    }

    const production = await this.prisma.updateEnvironment.findUnique({ where: { name: 'production' } });
    if (!production) {
      throw new NotFoundException('production 环境不存在');
    }

    const deployment = await this.prisma.updateDeployment.create({
      data: {
        releaseId,
        environmentId: production.id,
        triggerType: 'admin_approval',
        actorId,
        targetCommit: release.commitHash,
        status: 'pending',
      },
    });

    await this.prisma.updateRelease.update({
      where: { id: releaseId },
      data: { status: 'production_ready' },
    });

    await this.audit.record({
      deploymentId: deployment.id,
      actorId,
      action: 'approve_production',
      riskLevel: 'high',
      targetType: 'release',
      targetId: releaseId,
      reason: dto.reason,
      result: 'approved',
    });

    return deployment;
  }

  async confirmRestore(backupId: string, actorId: string, dto: ConfirmRestoreDto) {
    if (dto.confirmation !== 'CONFIRM_RESTORE') {
      throw new ForbiddenException('恢复确认短语必须是 CONFIRM_RESTORE');
    }

    const backup = await this.prisma.updateBackup.findUnique({ where: { id: backupId } });
    if (!backup) {
      throw new NotFoundException('备份不存在');
    }

    const updated = await this.prisma.updateBackup.update({
      where: { id: backupId },
      data: {
        restoreApproved: true,
        restoreApprovedBy: actorId,
        restoreApprovedAt: new Date(),
      },
    });

    await this.audit.record({
      actorId,
      action: 'confirm_restore',
      riskLevel: 'critical',
      targetType: 'backup',
      targetId: backupId,
      reason: dto.reason,
      result: 'approved',
      metadata: { backupType: backup.type, filePath: backup.filePath },
    });

    return updated;
  }
}
```

- [ ] **Step 7: 新增 controller 测试**

Create `server/src/modules/system-update/system-update.controller.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SystemUpdateController } from './system-update.controller';
import { SystemUpdateHealthService } from './system-update-health.service';
import { SystemUpdateService } from './system-update.service';

describe('SystemUpdateController', () => {
  let controller: SystemUpdateController;
  const service = {
    listEnvironments: jest.fn(),
    listReleases: jest.fn(),
    listDeployments: jest.fn(),
    listBackups: jest.fn(),
    approveProduction: jest.fn(),
  };
  const health = { getBackendSummary: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [SystemUpdateController],
      providers: [
        { provide: SystemUpdateService, useValue: service },
        { provide: SystemUpdateHealthService, useValue: health },
      ],
    }).compile();

    controller = moduleRef.get(SystemUpdateController);
  });

  it('rejects non-admin production approval', async () => {
    await expect(
      controller.approveProduction('rel-1', { reason: '上线' }, { user: { id: 'u1', role: 'user' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin production approval', async () => {
    service.approveProduction.mockResolvedValue({ id: 'dep-1' });

    const result = await controller.approveProduction(
      'rel-1',
      { reason: '上线' },
      { user: { id: 'admin-1', role: 'admin' } },
    );

    expect(result).toEqual({ id: 'dep-1' });
    expect(service.approveProduction).toHaveBeenCalledWith('rel-1', 'admin-1', { reason: '上线' });
  });
});
```

- [ ] **Step 8: 新增 controller**

Create `server/src/modules/system-update/system-update.controller.ts`:

```ts
import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApproveProductionDto } from './dto/approve-production.dto';
import { ConfirmRestoreDto } from './dto/confirm-restore.dto';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateDeploymentStatusDto } from './dto/update-deployment-status.dto';
import { SystemUpdateHealthService } from './system-update-health.service';
import { SystemUpdateService } from './system-update.service';

type RequestWithUser = { user?: { id?: string; role?: string; roles?: string[] } };

function assertAdmin(req: RequestWithUser): string {
  const user = req.user;
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
  if (!user?.id || !isAdmin) {
    throw new ForbiddenException('只有系统管理员可以操作系统更新中心');
  }
  return user.id;
}

@Controller('system-update')
@UseGuards(JwtAuthGuard)
export class SystemUpdateController {
  constructor(
    private readonly service: SystemUpdateService,
    private readonly health: SystemUpdateHealthService,
  ) {}

  @Get('environments')
  listEnvironments(@Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.listEnvironments();
  }

  @Get('releases')
  listReleases(@Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.listReleases();
  }

  @Get('deployments')
  listDeployments(@Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.listDeployments();
  }

  @Get('backups')
  listBackups(@Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.listBackups();
  }

  @Get('health')
  getHealth(@Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.health.getBackendSummary();
  }

  @Post('releases/from-github')
  createReleaseFromGithub(@Body() dto: CreateReleaseDto, @Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.createReleaseFromGithub(dto);
  }

  @Post('deployments/from-agent')
  createDeploymentFromAgent(@Body() dto: CreateDeploymentDto, @Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.createDeploymentFromAgent(dto);
  }

  @Patch('deployments/:id/status')
  updateDeploymentStatus(@Param('id') id: string, @Body() dto: UpdateDeploymentStatusDto, @Req() req: RequestWithUser) {
    assertAdmin(req);
    return this.service.updateDeploymentStatus(id, dto);
  }

  @Post('releases/:id/approve-production')
  approveProduction(@Param('id') id: string, @Body() dto: ApproveProductionDto, @Req() req: RequestWithUser) {
    const actorId = assertAdmin(req);
    return this.service.approveProduction(id, actorId, dto);
  }

  @Post('backups/:id/confirm-restore')
  confirmRestore(@Param('id') id: string, @Body() dto: ConfirmRestoreDto, @Req() req: RequestWithUser) {
    const actorId = assertAdmin(req);
    return this.service.confirmRestore(id, actorId, dto);
  }
}
```

- [ ] **Step 9: 新增 module**

Create `server/src/modules/system-update/system-update.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SystemUpdateAuditService } from './system-update-audit.service';
import { SystemUpdateController } from './system-update.controller';
import { SystemUpdateHealthService } from './system-update-health.service';
import { SystemUpdateService } from './system-update.service';

@Module({
  imports: [PrismaModule],
  controllers: [SystemUpdateController],
  providers: [SystemUpdateService, SystemUpdateHealthService, SystemUpdateAuditService],
  exports: [SystemUpdateService],
})
export class SystemUpdateModule {}
```

- [ ] **Step 10: 注册 AppModule**

Modify `server/src/app.module.ts`:

```ts
import { SystemUpdateModule } from './modules/system-update/system-update.module';
```

在 `imports` 数组末尾加入：

```ts
    SystemUpdateModule,
```

- [ ] **Step 11: 运行后端测试**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- system-update.service.spec.ts system-update.controller.spec.ts
```

Expected:

```text
PASS src/modules/system-update/system-update.service.spec.ts
PASS src/modules/system-update/system-update.controller.spec.ts
```

- [ ] **Step 12: 运行后端构建**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm run build
```

Expected:

```text
Found 0 errors.
```

- [ ] **Step 13: 提交**

```bash
git add server/src/app.module.ts server/src/modules/system-update
git commit -m "feat: add system update backend api"
```

---

## Task 3: 服务器发布脚本

**Files:**
- Create: `scripts/deploy.sh`
- Create: `scripts/backup-db.sh`
- Create: `scripts/check-schema.sh`
- Create: `scripts/apply-schema.sh`
- Create: `scripts/run-data-scripts.sh`
- Create: `scripts/snapshot-minio.sh`
- Create: `scripts/health-check.sh`
- Create: `scripts/smoke-test.sh`
- Create: `scripts/rollback-app.sh`
- Create: `scripts/restore-db.sh`
- Create: `scripts/restore-minio.sh`

- [ ] **Step 1: 新增数据库备份脚本**

Create `scripts/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?environment is required}"
BACKUP_ROOT="${BACKUP_ROOT:-/app/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="${BACKUP_ROOT}/${ENVIRONMENT}/${TIMESTAMP}"
mkdir -p "${TARGET_DIR}"

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-noidear-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-noidear}"
OUT_FILE="${TARGET_DIR}/postgres-${POSTGRES_DB}.dump"

docker exec "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "${OUT_FILE}"
sha256sum "${OUT_FILE}" > "${OUT_FILE}.sha256"

cat > "${TARGET_DIR}/database-backup.json" <<JSON
{"type":"database","environment":"${ENVIRONMENT}","filePath":"${OUT_FILE}","checksumPath":"${OUT_FILE}.sha256","createdAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON

echo "${OUT_FILE}"
```

- [ ] **Step 2: 新增 MinIO 清单脚本**

Create `scripts/snapshot-minio.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?environment is required}"
BACKUP_ROOT="${BACKUP_ROOT:-/app/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="${BACKUP_ROOT}/${ENVIRONMENT}/${TIMESTAMP}"
mkdir -p "${TARGET_DIR}"

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_BUCKET="${MINIO_BUCKET:-noidear}"
MANIFEST="${TARGET_DIR}/minio-${MINIO_BUCKET}-manifest.json"

if command -v mc >/dev/null 2>&1; then
  mc find "${MINIO_ALIAS}/${MINIO_BUCKET}" --json > "${MANIFEST}"
else
  echo '{"warning":"mc command not found","objects":[]}' > "${MANIFEST}"
fi

sha256sum "${MANIFEST}" > "${MANIFEST}.sha256"
echo "${MANIFEST}"
```

- [ ] **Step 3: 新增 schema 检查脚本**

Create `scripts/check-schema.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "${APP_DIR:-/app}"

docker compose exec -T server npx prisma migrate status --schema=src/prisma/schema.prisma
```

- [ ] **Step 4: 新增 schema 应用脚本**

Create `scripts/apply-schema.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "${APP_DIR:-/app}"

docker compose exec -T server npx prisma migrate deploy --schema=src/prisma/schema.prisma
```

- [ ] **Step 5: 新增系统数据脚本执行器**

Create `scripts/run-data-scripts.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "${APP_DIR:-/app}"

if [ -d "server/src/prisma/data-scripts" ]; then
  docker compose exec -T server npm run data-scripts:deploy
else
  echo '{"status":"skipped","reason":"server/src/prisma/data-scripts not found"}'
fi
```

- [ ] **Step 6: 新增健康检查脚本**

Create `scripts/health-check.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://localhost}"
API_URL="${API_URL:-http://localhost:3000}"

curl -fsS "${APP_URL}" >/dev/null
curl -fsS "${API_URL}/api" >/dev/null

docker compose ps

cat <<JSON
{"status":"passed","appUrl":"${APP_URL}","apiUrl":"${API_URL}","checkedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
```

- [ ] **Step 7: 新增只读冒烟脚本**

Create `scripts/smoke-test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
SMOKE_TOKEN="${SMOKE_TOKEN:?SMOKE_TOKEN is required}"

curl -fsS -H "Authorization: Bearer ${SMOKE_TOKEN}" "${API_URL}/documents?limit=1" >/dev/null
curl -fsS -H "Authorization: Bearer ${SMOKE_TOKEN}" "${API_URL}/todos/my?limit=1" >/dev/null
curl -fsS -H "Authorization: Bearer ${SMOKE_TOKEN}" "${API_URL}/system-update/health" >/dev/null

cat <<JSON
{"status":"passed","checkedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
```

- [ ] **Step 8: 新增应用回滚脚本**

Create `scripts/rollback-app.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET_COMMIT="${1:?target commit is required}"
cd "${APP_DIR:-/app}"

git fetch origin master
git checkout "${TARGET_COMMIT}"
docker compose build server client
docker compose up -d server client

./scripts/health-check.sh
```

- [ ] **Step 9: 新增数据库恢复脚本**

Create `scripts/restore-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:?backup file is required}"
CONFIRMATION="${2:?confirmation is required}"

if [ "${CONFIRMATION}" != "CONFIRM_RESTORE" ]; then
  echo "database restore requires CONFIRM_RESTORE" >&2
  exit 2
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-noidear-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-noidear}"

cat "${BACKUP_FILE}" | docker exec -i "${POSTGRES_CONTAINER}" pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists
```

- [ ] **Step 10: 新增 MinIO 恢复脚本**

Create `scripts/restore-minio.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_DIR="${1:?snapshot dir is required}"
CONFIRMATION="${2:?confirmation is required}"

if [ "${CONFIRMATION}" != "CONFIRM_RESTORE" ]; then
  echo "minio restore requires CONFIRM_RESTORE" >&2
  exit 2
fi

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_BUCKET="${MINIO_BUCKET:-noidear}"

mc mirror --overwrite "${SNAPSHOT_DIR}" "${MINIO_ALIAS}/${MINIO_BUCKET}"
```

- [ ] **Step 11: 新增总发布脚本**

Create `scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:?environment is required}"
TARGET_COMMIT="${2:?target commit is required}"
APP_DIR="${APP_DIR:-/app}"
LOG_ROOT="${LOG_ROOT:-/app/deploy-logs}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="${LOG_ROOT}/${ENVIRONMENT}/${TIMESTAMP}"
mkdir -p "${LOG_DIR}"

cd "${APP_DIR}"
PREVIOUS_COMMIT="$(git rev-parse HEAD)"

run_stage() {
  local stage="$1"
  shift
  echo "== ${stage} =="
  "$@" 2>&1 | tee "${LOG_DIR}/${stage}.log"
}

on_failure() {
  local exit_code="$?"
  echo "deploy failed, rolling back application to ${PREVIOUS_COMMIT}" | tee "${LOG_DIR}/failure.log"
  ./scripts/rollback-app.sh "${PREVIOUS_COMMIT}" 2>&1 | tee "${LOG_DIR}/rollback.log" || true
  exit "${exit_code}"
}
trap on_failure ERR

run_stage "backup-db" ./scripts/backup-db.sh "${ENVIRONMENT}"
run_stage "snapshot-minio" ./scripts/snapshot-minio.sh "${ENVIRONMENT}"

run_stage "git-fetch" git fetch origin master
run_stage "git-checkout" git checkout "${TARGET_COMMIT}"

run_stage "compose-build" docker compose build server client
run_stage "schema-status" ./scripts/check-schema.sh
run_stage "schema-apply" ./scripts/apply-schema.sh
run_stage "data-scripts" ./scripts/run-data-scripts.sh
run_stage "compose-up" docker compose up -d server client
run_stage "health-check" ./scripts/health-check.sh
run_stage "smoke-test" ./scripts/smoke-test.sh

trap - ERR
cat > "${LOG_DIR}/result.json" <<JSON
{"status":"succeeded","environment":"${ENVIRONMENT}","previousCommit":"${PREVIOUS_COMMIT}","targetCommit":"${TARGET_COMMIT}","logsPath":"${LOG_DIR}","finishedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
cat "${LOG_DIR}/result.json"
```

- [ ] **Step 12: 赋予脚本执行权限并做语法检查**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
chmod +x scripts/deploy.sh scripts/backup-db.sh scripts/check-schema.sh scripts/apply-schema.sh scripts/run-data-scripts.sh scripts/snapshot-minio.sh scripts/health-check.sh scripts/smoke-test.sh scripts/rollback-app.sh scripts/restore-db.sh scripts/restore-minio.sh
bash -n scripts/deploy.sh scripts/backup-db.sh scripts/check-schema.sh scripts/apply-schema.sh scripts/run-data-scripts.sh scripts/snapshot-minio.sh scripts/health-check.sh scripts/smoke-test.sh scripts/rollback-app.sh scripts/restore-db.sh scripts/restore-minio.sh
```

Expected:

```text
```

命令无输出且退出码为 0。

- [ ] **Step 13: 提交**

```bash
git add scripts/deploy.sh scripts/backup-db.sh scripts/check-schema.sh scripts/apply-schema.sh scripts/run-data-scripts.sh scripts/snapshot-minio.sh scripts/health-check.sh scripts/smoke-test.sh scripts/rollback-app.sh scripts/restore-db.sh scripts/restore-minio.sh
git commit -m "feat: add controlled deployment scripts"
```

---

## Task 4: GitHub Actions 发布入口

**Files:**
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`

- [ ] **Step 1: 新增 staging 自动部署 workflow**

Create `.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy Staging

on:
  push:
    branches:
      - master
  workflow_dispatch:

concurrency:
  group: deploy-staging
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Register release
        run: |
          curl -fsS -X POST "${{ secrets.STAGING_API_URL }}/system-update/releases/from-github" \
            -H "Authorization: Bearer ${{ secrets.SYSTEM_UPDATE_AGENT_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"commitHash":"${{ github.sha }}","branchName":"${{ github.ref_name }}","title":"${{ github.event.head_commit.message }}","githubRunId":"${{ github.run_id }}","githubRunUrl":"${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}'

      - name: Prepare SSH
        run: |
          mkdir -p ~/.ssh
          printf '%s\n' "${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/noidear_staging
          chmod 600 ~/.ssh/noidear_staging
          ssh-keyscan -H "${{ secrets.STAGING_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy on staging server
        run: |
          ssh -i ~/.ssh/noidear_staging "${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }}" \
            'cd /app && APP_URL="${{ secrets.STAGING_APP_URL }}" API_URL="${{ secrets.STAGING_API_URL }}" SMOKE_TOKEN="${{ secrets.STAGING_SMOKE_TOKEN }}" ./scripts/deploy.sh staging "${{ github.sha }}"'
```

- [ ] **Step 2: 新增 production 手动批准 workflow**

Create `.github/workflows/deploy-production.yml`:

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      release_id:
        description: UpdateRelease id approved in admin center
        required: true
      commit_sha:
        description: Commit SHA to deploy
        required: true

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Prepare SSH
        run: |
          mkdir -p ~/.ssh
          printf '%s\n' "${{ secrets.PRODUCTION_SSH_KEY }}" > ~/.ssh/noidear_production
          chmod 600 ~/.ssh/noidear_production
          ssh-keyscan -H "${{ secrets.PRODUCTION_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy on production server
        run: |
          ssh -i ~/.ssh/noidear_production "${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }}" \
            'cd /app && APP_URL="${{ secrets.PRODUCTION_APP_URL }}" API_URL="${{ secrets.PRODUCTION_API_URL }}" SMOKE_TOKEN="${{ secrets.PRODUCTION_SMOKE_TOKEN }}" ./scripts/deploy.sh production "${{ inputs.commit_sha }}"'
```

- [ ] **Step 3: 校验 YAML 基础结构**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
ruby -e 'require "yaml"; ARGV.each { |f| YAML.load_file(f); puts "#{f} ok" }' .github/workflows/deploy-staging.yml .github/workflows/deploy-production.yml
```

Expected:

```text
.github/workflows/deploy-staging.yml ok
.github/workflows/deploy-production.yml ok
```

- [ ] **Step 4: 提交**

```bash
git add .github/workflows/deploy-staging.yml .github/workflows/deploy-production.yml
git commit -m "ci: add staging and production deploy workflows"
```

---

## Task 5: 前端系统更新中心

**Files:**
- Create: `client/src/api/system-update.ts`
- Create: `client/src/views/system-update/SystemUpdateCenter.vue`
- Create: `client/src/views/system-update/__tests__/SystemUpdateCenter.spec.ts`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue`

- [ ] **Step 1: 新增 API 适配器**

Create `client/src/api/system-update.ts`:

```ts
import request from './request';

export type UpdateDeploymentStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'rolled_back' | 'rollback_failed';

export interface UpdateEnvironment {
  id: string;
  name: string;
  kind: 'development' | 'staging' | 'production';
  serverHost?: string;
  appUrl?: string;
  currentVersion?: string;
  currentCommit?: string;
  currentStatus: string;
  lastDeploymentId?: string;
}

export interface UpdateRelease {
  id: string;
  versionTag?: string;
  commitHash: string;
  branchName: string;
  title: string;
  changelog?: string;
  status: string;
  githubRunUrl?: string;
  deployments?: UpdateDeployment[];
  createdAt: string;
}

export interface UpdateDeployment {
  id: string;
  releaseId: string;
  environmentId: string;
  status: UpdateDeploymentStatus;
  triggerType: string;
  targetCommit: string;
  previousCommit?: string;
  errorStage?: string;
  errorMessage?: string;
  logsPath?: string;
  createdAt: string;
  release?: UpdateRelease;
  environment?: UpdateEnvironment;
}

export interface UpdateBackup {
  id: string;
  environmentId: string;
  type: 'database' | 'minio_manifest' | 'minio_snapshot' | 'config';
  filePath: string;
  restoreApproved: boolean;
  createdAt: string;
  environment?: UpdateEnvironment;
}

export const systemUpdateApi = {
  listEnvironments: () => request.get<UpdateEnvironment[]>('/system-update/environments'),
  listReleases: () => request.get<UpdateRelease[]>('/system-update/releases'),
  listDeployments: () => request.get<UpdateDeployment[]>('/system-update/deployments'),
  listBackups: () => request.get<UpdateBackup[]>('/system-update/backups'),
  approveProduction: (releaseId: string, reason: string) =>
    request.post(`/system-update/releases/${releaseId}/approve-production`, { reason }),
  confirmRestore: (backupId: string, reason: string) =>
    request.post(`/system-update/backups/${backupId}/confirm-restore`, { confirmation: 'CONFIRM_RESTORE', reason }),
};
```

- [ ] **Step 2: 写页面测试**

Create `client/src/views/system-update/__tests__/SystemUpdateCenter.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { ElButton, ElCard, ElMessage, ElTable, ElTableColumn, ElTabPane, ElTabs, ElTag } from 'element-plus';
import { describe, expect, it, vi } from 'vitest';
import SystemUpdateCenter from '../SystemUpdateCenter.vue';
import { systemUpdateApi } from '@/api/system-update';

vi.mock('@/api/system-update', () => ({
  systemUpdateApi: {
    listEnvironments: vi.fn(),
    listReleases: vi.fn(),
    listDeployments: vi.fn(),
    listBackups: vi.fn(),
    approveProduction: vi.fn(),
    confirmRestore: vi.fn(),
  },
}));

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus');
  return { ...actual, ElMessage: { success: vi.fn(), error: vi.fn() } };
});

const global = {
  components: { ElButton, ElCard, ElTable, ElTableColumn, ElTabPane, ElTabs, ElTag },
};

describe('SystemUpdateCenter', () => {
  it('loads update center data on mount', async () => {
    vi.mocked(systemUpdateApi.listEnvironments).mockResolvedValue({ data: [] } as never);
    vi.mocked(systemUpdateApi.listReleases).mockResolvedValue({ data: [] } as never);
    vi.mocked(systemUpdateApi.listDeployments).mockResolvedValue({ data: [] } as never);
    vi.mocked(systemUpdateApi.listBackups).mockResolvedValue({ data: [] } as never);

    mount(SystemUpdateCenter, { global });

    await Promise.resolve();

    expect(systemUpdateApi.listEnvironments).toHaveBeenCalled();
    expect(systemUpdateApi.listReleases).toHaveBeenCalled();
    expect(systemUpdateApi.listDeployments).toHaveBeenCalled();
    expect(systemUpdateApi.listBackups).toHaveBeenCalled();
  });

  it('renders production approval action for staging passed release', async () => {
    vi.mocked(systemUpdateApi.listEnvironments).mockResolvedValue({ data: [] } as never);
    vi.mocked(systemUpdateApi.listReleases).mockResolvedValue({
      data: [{ id: 'rel-1', commitHash: 'abc', branchName: 'master', title: '版本', status: 'staging_passed', createdAt: '2026-04-28T00:00:00Z' }],
    } as never);
    vi.mocked(systemUpdateApi.listDeployments).mockResolvedValue({ data: [] } as never);
    vi.mocked(systemUpdateApi.listBackups).mockResolvedValue({ data: [] } as never);

    const wrapper = mount(SystemUpdateCenter, { global });
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain('批准生产发布');
  });
});
```

- [ ] **Step 3: 新增页面**

Create `client/src/views/system-update/SystemUpdateCenter.vue`:

```vue
<template>
  <div class="system-update-center">
    <div class="page-header">
      <div>
        <h1>系统更新中心</h1>
        <p>查看 staging 和 production 发布状态，处理生产批准、备份和恢复确认。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="环境" name="environments">
        <el-table :data="environments" border>
          <el-table-column prop="name" label="环境" width="140" />
          <el-table-column prop="kind" label="类型" width="140" />
          <el-table-column prop="currentStatus" label="状态" width="140" />
          <el-table-column prop="currentVersion" label="当前版本" min-width="180" />
          <el-table-column prop="currentCommit" label="当前 Commit" min-width="220" />
          <el-table-column prop="appUrl" label="访问地址" min-width="220" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="版本" name="releases">
        <el-table :data="releases" border>
          <el-table-column prop="title" label="版本说明" min-width="220" />
          <el-table-column prop="branchName" label="分支" width="120" />
          <el-table-column prop="commitHash" label="Commit" min-width="220" />
          <el-table-column prop="status" label="状态" width="180">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'staging_passed'"
                type="primary"
                size="small"
                @click="approveProduction(row.id)"
              >
                批准生产发布
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="部署" name="deployments">
        <el-table :data="deployments" border>
          <el-table-column prop="environment.name" label="环境" width="140" />
          <el-table-column prop="status" label="状态" width="160">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="targetCommit" label="目标 Commit" min-width="220" />
          <el-table-column prop="errorStage" label="失败阶段" width="160" />
          <el-table-column prop="errorMessage" label="错误信息" min-width="260" />
          <el-table-column prop="logsPath" label="日志路径" min-width="260" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="备份" name="backups">
        <el-table :data="backups" border>
          <el-table-column prop="environment.name" label="环境" width="140" />
          <el-table-column prop="type" label="类型" width="160" />
          <el-table-column prop="filePath" label="文件路径" min-width="320" />
          <el-table-column prop="restoreApproved" label="已批准恢复" width="140" />
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button
                :disabled="row.restoreApproved"
                type="danger"
                size="small"
                @click="confirmRestore(row.id)"
              >
                二次确认恢复
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { systemUpdateApi, type UpdateBackup, type UpdateDeployment, type UpdateEnvironment, type UpdateRelease } from '@/api/system-update';

const activeTab = ref('environments');
const loading = ref(false);
const environments = ref<UpdateEnvironment[]>([]);
const releases = ref<UpdateRelease[]>([]);
const deployments = ref<UpdateDeployment[]>([]);
const backups = ref<UpdateBackup[]>([]);

function statusTag(status: string) {
  if (status.includes('passed') || status === 'succeeded') return 'success';
  if (status.includes('failed')) return 'danger';
  if (status.includes('running')) return 'warning';
  return 'info';
}

async function loadAll() {
  loading.value = true;
  try {
    const [environmentRes, releaseRes, deploymentRes, backupRes] = await Promise.all([
      systemUpdateApi.listEnvironments(),
      systemUpdateApi.listReleases(),
      systemUpdateApi.listDeployments(),
      systemUpdateApi.listBackups(),
    ]);
    environments.value = environmentRes.data;
    releases.value = releaseRes.data;
    deployments.value = deploymentRes.data;
    backups.value = backupRes.data;
  } finally {
    loading.value = false;
  }
}

async function approveProduction(releaseId: string) {
  const reason = await ElMessageBox.prompt('请输入批准生产发布原因', '批准生产发布', {
    confirmButtonText: '批准',
    cancelButtonText: '取消',
    inputPattern: /^.{3,}$/,
    inputErrorMessage: '原因至少 3 个字符',
  });
  await systemUpdateApi.approveProduction(releaseId, reason.value);
  ElMessage.success('已批准生产发布');
  await loadAll();
}

async function confirmRestore(backupId: string) {
  const reason = await ElMessageBox.prompt('请输入恢复原因。系统会发送 CONFIRM_RESTORE 到后端完成二次确认。', '二次确认恢复', {
    confirmButtonText: '确认恢复',
    cancelButtonText: '取消',
    inputPattern: /^.{3,}$/,
    inputErrorMessage: '原因至少 3 个字符',
  });
  await systemUpdateApi.confirmRestore(backupId, reason.value);
  ElMessage.success('已批准恢复，实际恢复仍需服务器脚本执行');
  await loadAll();
}

onMounted(loadAll);
</script>

<style scoped>
.system-update-center {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
}

.page-header p {
  margin: 0;
  color: #667085;
}
</style>
```

- [ ] **Step 4: 注册路由**

Modify `client/src/router/index.ts`，在根布局 children 中加入：

```ts
      {
        path: 'system-update',
        name: 'SystemUpdateCenter',
        component: () => import('@/views/system-update/SystemUpdateCenter.vue'),
        meta: { title: '系统更新中心' },
      },
```

- [ ] **Step 5: 注册菜单**

Modify `client/src/views/Layout.vue`：

在 icon import 中保留已存在的 `Cloudy`，在 `menuItems` 中加入系统管理分组：

```ts
  {
    title: '系统管理',
    icon: Setting,
    children: [
      { path: '/system-update', title: '系统更新中心', icon: Cloudy },
    ],
  },
```

- [ ] **Step 6: 运行前端测试**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- SystemUpdateCenter.spec.ts
```

Expected:

```text
PASS src/views/system-update/__tests__/SystemUpdateCenter.spec.ts
```

- [ ] **Step 7: 运行前端构建**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm run build
```

Expected:

```text
built in
```

- [ ] **Step 8: 提交**

```bash
git add client/src/api/system-update.ts client/src/views/system-update client/src/router/index.ts client/src/views/Layout.vue
git commit -m "feat: add system update center UI"
```

---

## Task 6: 端到端联调和上线前验证

**Files:**
- Modify: `docs/superpowers/specs/2026-04-28-system-update-center-design.md`
- Modify: `docs/AGENT_GUIDE.md`

- [ ] **Step 1: 本地执行后端验证**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npx prisma validate --schema=src/prisma/schema.prisma
npm test -- system-update.service.spec.ts system-update.controller.spec.ts
npm run build
```

Expected:

```text
The schema at src/prisma/schema.prisma is valid
PASS src/modules/system-update/system-update.service.spec.ts
PASS src/modules/system-update/system-update.controller.spec.ts
Found 0 errors.
```

- [ ] **Step 2: 本地执行前端验证**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client
npm test -- SystemUpdateCenter.spec.ts
npm run build
```

Expected:

```text
PASS src/views/system-update/__tests__/SystemUpdateCenter.spec.ts
built in
```

- [ ] **Step 3: 本地执行脚本验证**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
bash -n scripts/deploy.sh scripts/backup-db.sh scripts/check-schema.sh scripts/apply-schema.sh scripts/run-data-scripts.sh scripts/snapshot-minio.sh scripts/health-check.sh scripts/smoke-test.sh scripts/rollback-app.sh scripts/restore-db.sh scripts/restore-minio.sh
```

Expected:

```text
```

命令无输出且退出码为 0。

- [ ] **Step 4: 更新设计文档的实施状态**

Modify `docs/superpowers/specs/2026-04-28-system-update-center-design.md`，在文末加入：

```markdown
## 实施状态

- 已实现 Prisma 更新中心模型。
- 已实现后端系统更新 API。
- 已实现服务器受控发布脚本。
- 已实现 staging 和 production GitHub Actions 入口。
- 已实现前端系统更新中心页面。
- 已通过本地 schema、后端测试、前端测试、构建和脚本语法验证。
```

- [ ] **Step 5: 更新 AGENT_GUIDE 运维入口**

Modify `docs/AGENT_GUIDE.md`，在 “常用操作最短路径” 后加入：

```markdown
### 发布系统新版本

1. staging 由 GitHub Actions `Deploy Staging` 自动部署。
2. staging 通过后，在后台进入“系统更新中心”查看版本、部署、备份和冒烟结果。
3. 只有 admin 可以批准 production 发布。
4. production 发布前会备份数据库并生成 MinIO 文件清单。
5. 应用发布失败会自动回滚代码。
6. 数据库恢复和 MinIO 恢复必须在后台对备份执行二次确认，再由服务器脚本执行恢复。
```

- [ ] **Step 6: 最终状态检查**

Run:

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
git status --short
git diff --check
```

Expected:

```text
```

`git status --short` 只显示本任务产生且即将提交的文件，`git diff --check` 无输出。

- [ ] **Step 7: 提交**

```bash
git add docs/superpowers/specs/2026-04-28-system-update-center-design.md docs/AGENT_GUIDE.md
git commit -m "docs: document system update operations"
```

---

## 验收标准

- admin 能在前端看到环境、版本、部署、备份四类信息。
- staging push 后可以由 GitHub Actions 触发服务器本地 Docker Compose 发布。
- production 发布必须有 admin 批准记录。
- 每次发布前都有数据库备份和 MinIO 清单。
- schema drift 会阻断自动发布，不会执行破坏性数据库操作。
- 应用健康检查或业务冒烟失败后，服务器自动回滚到上一 commit。
- 数据库和 MinIO 恢复必须先在后台确认 `CONFIRM_RESTORE`。
- 本地验证命令全部通过。

## 自检记录

- 规格覆盖：staging 自动部署、production 批准、Docker Compose build/up、发布前备份、受控 schema、数据脚本、发布后健康检查、业务冒烟、应用回滚、数据库和 MinIO 恢复二次确认均映射到 Task 1-6。
- 内容完整性扫描：本文已避免空白待补、泛化异常处理、跨任务省略和仅写方向不写内容的问题。
- 类型一致性：后端 DTO、Prisma enum、前端 union 类型、脚本参数和 workflow secrets 使用同一组环境名、状态名和确认短语。
