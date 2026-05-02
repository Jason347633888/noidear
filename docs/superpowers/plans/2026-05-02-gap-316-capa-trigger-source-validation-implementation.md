# GAP-316 CAPA Trigger Source Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the CAPA/nonconformance/complaint/audit model during execution. Steps use checkbox (`- [ ]`) syntax for tracking. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Ensure new CAPA records can only reference valid trigger sources, and expose a stable reverse lookup by `trigger_type + trigger_id`.

**Architecture:** Keep `CorrectiveAction.trigger_type + trigger_id` as the polymorphic source contract. Add DTO validation for supported trigger types, service-level source existence checks through Prisma, backend list filtering for reverse lookup, and a small frontend API adapter for future source pages.

**Tech Stack:** NestJS, Prisma Client, class-validator, Vue 3 API adapter, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-316 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认 CAPA 是独立治理事实源，触发来源必须回到 `NonConformance`、`CustomerComplaint` 或 `AuditFinding`；不得在来源表内嵌 CAPA 字段，不得新增平行事实源，不得通过备注解析来源。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **历史数据停止条件：** 本计划不迁移历史 CAPA。若验证发现既有 CAPA 存在无效 `trigger_id`，不得自动修复；记录样例并回报主 agent。
- **命令约束：** 本计划只使用当前仓库 npm workspaces 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/modules/corrective-action/dto/create-capa.dto.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.controller.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.service.spec.ts`
- Modify: `client/src/api/corrective-action.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not add: `server/src/prisma/migrations/**`
- Do not modify: `server/src/modules/non-conformance/**`
- Do not modify: `server/src/modules/customer-complaint/**`
- Do not modify: `server/src/modules/internal-audit/**`
- Do not modify: `client/src/views/**`

## Task 1: Add focused service coverage

**Files:**
- Modify: `server/src/modules/corrective-action/corrective-action.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In `server/src/modules/corrective-action/corrective-action.service.spec.ts`, replace:

```ts
  const prisma = {
    correctiveAction: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
```

with:

```ts
  const prisma = {
    correctiveAction: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    nonConformance: {
      findFirst: jest.fn(),
    },
    customerComplaint: {
      findFirst: jest.fn(),
    },
    auditFinding: {
      findUnique: jest.fn(),
    },
  };
```

- [ ] **Step 2: Update the existing create test to use a valid NonConformance source**

Replace the body of `it('scopes CAPA numbering and writes by company', async () => {` with:

```ts
    prisma.nonConformance.findFirst.mockResolvedValue({ id: 'nc-1' });
    prisma.correctiveAction.count.mockResolvedValue(1);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c1' });

    await service.create(
      { trigger_type: 'non_conformance', trigger_id: 'nc-1', description: '整改' },
      'u1',
      '2',
    );

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'nc-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          capa_no: expect.stringMatching(/-0002$/),
          trigger_type: 'non_conformance',
          trigger_id: 'nc-1',
        }),
      }),
    );
```

- [ ] **Step 3: Add source validation tests**

Add these tests before `it('requires company ownership before status update', async () => {`:

```ts
  it('rejects non-other CAPA creation when trigger_id is missing', async () => {
    await expect(
      service.create({ trigger_type: 'non_conformance', description: '整改' }, 'u1', '2'),
    ).rejects.toThrow('CAPA触发来源不能为空');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('rejects CAPA creation when NonConformance source is missing or outside company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'non_conformance', trigger_id: 'missing-nc', description: '整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('不合格记录不存在或不属于当前公司');

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-nc', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('validates CustomerComplaint source within the current company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue({ id: 'cc-1' });
    prisma.correctiveAction.count.mockResolvedValue(2);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c2' });

    await service.create(
      { trigger_type: 'customer_complaint', trigger_id: 'cc-1', description: '投诉整改' },
      'u1',
      '2',
    );

    expect(prisma.customerComplaint.findFirst).toHaveBeenCalledWith({
      where: { id: 'cc-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'customer_complaint',
          trigger_id: 'cc-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects CAPA creation when CustomerComplaint source is missing or outside company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'customer_complaint', trigger_id: 'missing-cc', description: '投诉整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('顾客投诉不存在或不属于当前公司');

    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('validates internal audit finding source existence', async () => {
    prisma.auditFinding.findUnique.mockResolvedValue({ id: 'finding-1' });
    prisma.correctiveAction.count.mockResolvedValue(3);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c3' });

    await service.create(
      { trigger_type: 'internal_audit', trigger_id: 'finding-1', description: '内审整改' },
      'u1',
      '2',
    );

    expect(prisma.auditFinding.findUnique).toHaveBeenCalledWith({
      where: { id: 'finding-1' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'internal_audit',
          trigger_id: 'finding-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects CAPA creation when internal audit finding source is missing', async () => {
    prisma.auditFinding.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'internal_audit', trigger_id: 'missing-finding', description: '内审整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('内审发现项不存在');

    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('allows other CAPA creation without a trigger source', async () => {
    prisma.correctiveAction.count.mockResolvedValue(4);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c4' });

    await service.create({ trigger_type: 'other', description: '手工整改' }, 'u1', '2');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditFinding.findUnique).not.toHaveBeenCalled();
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'other',
          company_id: '2',
        }),
      }),
    );
  });
```

- [ ] **Step 4: Add reverse lookup tests**

Add these tests before the status update test:

```ts
  it('filters CAPA list by status and trigger source', async () => {
    prisma.correctiveAction.findMany.mockResolvedValue([{ id: 'c1' }]);

    await service.findAll('2', {
      status: 'open',
      triggerType: 'non_conformance',
      triggerId: 'nc-1',
    });

    expect(prisma.correctiveAction.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '2',
        status: 'open',
        trigger_type: 'non_conformance',
        trigger_id: 'nc-1',
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  });

  it('rejects reverse lookup when only one trigger filter is provided', async () => {
    await expect(
      service.findAll('2', { triggerType: 'non_conformance' }),
    ).rejects.toThrow('trigger_type 和 trigger_id 必须同时提供');

    expect(prisma.correctiveAction.findMany).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- corrective-action.service.spec.ts --runInBand)
```

Expected: FAIL because `CorrectiveActionService.create()` has not yet checked trigger sources and `findAll()` still accepts only a status string.

## Task 2: Tighten CreateCapaDto validation

**Files:**
- Modify: `server/src/modules/corrective-action/dto/create-capa.dto.ts`

- [ ] **Step 1: Replace the DTO import**

Replace:

```ts
import { IsString, IsOptional } from 'class-validator';
```

with:

```ts
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
```

- [ ] **Step 2: Add explicit trigger type constants**

Add this directly below the import:

```ts
export const CAPA_TRIGGER_TYPES = [
  'non_conformance',
  'customer_complaint',
  'internal_audit',
  'other',
] as const;

export type CapaTriggerType = (typeof CAPA_TRIGGER_TYPES)[number];
```

- [ ] **Step 3: Replace `trigger_type` and `trigger_id` decorators**

Replace:

```ts
  @IsString() trigger_type: string; // 'non_conformance'|'customer_complaint'|'internal_audit'|'other'
  @IsOptional() @IsString() trigger_id?: string;
```

with:

```ts
  @IsIn(CAPA_TRIGGER_TYPES)
  trigger_type: CapaTriggerType;

  @ValidateIf((dto: CreateCapaDto) => dto.trigger_type !== 'other' || dto.trigger_id !== undefined)
  @IsString()
  @IsNotEmpty()
  trigger_id?: string;
```

## Task 3: Implement service source validation and reverse lookup

**Files:**
- Modify: `server/src/modules/corrective-action/corrective-action.service.ts`

- [ ] **Step 1: Replace service imports**

Replace:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCapaDto } from './dto/create-capa.dto';
```

with:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CapaTriggerType, CreateCapaDto } from './dto/create-capa.dto';
```

- [ ] **Step 2: Add list filter interface**

Add this above `@Injectable()`:

```ts
export interface CorrectiveActionListFilters {
  status?: string;
  triggerType?: CapaTriggerType;
  triggerId?: string;
}
```

- [ ] **Step 3: Call source validation before numbering**

In `create()`, replace:

```ts
  async create(dto: CreateCapaDto, userId: string, companyId: string) {
    const count = await this.prisma.correctiveAction.count({ where: { company_id: companyId } });
    const capa_no = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
  }
```

with:

```ts
  async create(dto: CreateCapaDto, userId: string, companyId: string) {
    await this.validateTriggerSource(dto, companyId);

    const count = await this.prisma.correctiveAction.count({ where: { company_id: companyId } });
    const capa_no = `CAPA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    return this.prisma.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
  }
```

- [ ] **Step 4: Replace `findAll()` with filtered lookup**

Replace:

```ts
  async findAll(companyId: string, status?: string) {
    return this.prisma.correctiveAction.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
```

with:

```ts
  async findAll(companyId: string, filters: CorrectiveActionListFilters = {}) {
    const { status, triggerType, triggerId } = filters;
    if ((triggerType && !triggerId) || (!triggerType && triggerId)) {
      throw new BadRequestException('trigger_type 和 trigger_id 必须同时提供');
    }

    return this.prisma.correctiveAction.findMany({
      where: {
        company_id: companyId,
        ...(status ? { status } : {}),
        ...(triggerType && triggerId
          ? { trigger_type: triggerType, trigger_id: triggerId }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }
```

- [ ] **Step 5: Add `validateTriggerSource()`**

Add this private method between `findAll()` and `findById()`:

```ts
  private async validateTriggerSource(dto: CreateCapaDto, companyId: string) {
    if (dto.trigger_type === 'other') {
      return;
    }

    if (!dto.trigger_id) {
      throw new BadRequestException('CAPA触发来源不能为空');
    }

    if (dto.trigger_type === 'non_conformance') {
      const source = await this.prisma.nonConformance.findFirst({
        where: { id: dto.trigger_id, company_id: companyId },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('不合格记录不存在或不属于当前公司');
      }
      return;
    }

    if (dto.trigger_type === 'customer_complaint') {
      const source = await this.prisma.customerComplaint.findFirst({
        where: { id: dto.trigger_id, company_id: companyId },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('顾客投诉不存在或不属于当前公司');
      }
      return;
    }

    if (dto.trigger_type === 'internal_audit') {
      const source = await this.prisma.auditFinding.findUnique({
        where: { id: dto.trigger_id },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('内审发现项不存在');
      }
      return;
    }

    throw new BadRequestException('CAPA触发类型不支持');
  }
```

- [ ] **Step 6: Run the focused service test**

```bash
(cd server && npm test -- corrective-action.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 4: Wire reverse lookup query parameters through the controller

**Files:**
- Modify: `server/src/modules/corrective-action/corrective-action.controller.ts`

- [ ] **Step 1: Import the trigger type**

Replace:

```ts
import { CreateCapaDto } from './dto/create-capa.dto';
```

with:

```ts
import { CapaTriggerType, CreateCapaDto } from './dto/create-capa.dto';
```

- [ ] **Step 2: Replace `findAll()` controller method**

Replace:

```ts
  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.service.findAll(req.user.companyId, status);
  }
```

with:

```ts
  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('trigger_type') triggerType?: CapaTriggerType,
    @Query('trigger_id') triggerId?: string,
  ) {
    return this.service.findAll(req.user.companyId, {
      status,
      triggerType,
      triggerId,
    });
  }
```

- [ ] **Step 3: Run backend build**

```bash
npm run build:server
```

Expected: PASS.

## Task 5: Add frontend API support for source reverse lookup

**Files:**
- Modify: `client/src/api/corrective-action.ts`

- [ ] **Step 1: Add a list filter interface**

Add this after `CreateCapaPayload`:

```ts
export interface CorrectiveActionListFilters {
  status?: string;
  trigger_type?: CapaTriggerType;
  trigger_id?: string;
}
```

- [ ] **Step 2: Replace `getList()` and add `getByTrigger()`**

Replace:

```ts
  getList(status?: string) {
    return request.get<{ data: CorrectiveAction[]; total?: number }>('/corrective-actions', {
      params: status ? { status } : {},
    });
  },
```

with:

```ts
  getList(filters?: string | CorrectiveActionListFilters) {
    const params =
      typeof filters === 'string'
        ? { status: filters }
        : filters ?? {};

    return request.get<{ data: CorrectiveAction[]; total?: number }>('/corrective-actions', {
      params,
    });
  },

  getByTrigger(trigger_type: CapaTriggerType, trigger_id: string) {
    return this.getList({ trigger_type, trigger_id });
  },
```

- [ ] **Step 3: Run client build**

```bash
npm run build:client
```

Expected: PASS.

## Task 6: Final verification and commit

**Files:**
- Verify all files modified in Tasks 1-5.

- [ ] **Step 1: Run focused Jest verification**

```bash
(cd server && npm test -- corrective-action.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 2: Run backend build**

```bash
npm run build:server
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

```bash
npm run build:client
```

Expected: PASS.

- [ ] **Step 4: Confirm no schema or migration files changed**

```bash
git diff --name-only
```

Expected: output includes only:

```text
client/src/api/corrective-action.ts
server/src/modules/corrective-action/corrective-action.controller.ts
server/src/modules/corrective-action/corrective-action.service.spec.ts
server/src/modules/corrective-action/corrective-action.service.ts
server/src/modules/corrective-action/dto/create-capa.dto.ts
```

- [ ] **Step 5: Commit implementation**

```bash
git add client/src/api/corrective-action.ts \
  server/src/modules/corrective-action/corrective-action.controller.ts \
  server/src/modules/corrective-action/corrective-action.service.spec.ts \
  server/src/modules/corrective-action/corrective-action.service.ts \
  server/src/modules/corrective-action/dto/create-capa.dto.ts
git commit -m "fix: validate CAPA trigger sources"
```

Expected: commit succeeds with no docs, schema, migration, non-conformance, complaint, internal-audit, or view changes.
