---
title: 首发闭环切片 Implementation Plan
tags:
  - SaaS
  - noidear
  - implementation-plan
  - 首发闭环
---

# 首发闭环切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable noidear food-safety SaaS closed loop: supplier/material -> inbound -> inspection -> material batch -> inventory -> production plan -> mixing usage -> product batch -> inspection/nonconformance -> trace snapshot/evidence export.

**Architecture:** This plan implements the vertical first-release slice from [[08-noidear-v1全量开发规格说明|08-noidear SaaS全量规格基线]] while preserving the full SaaS object boundary from [[07-实现差距清单]]. It extends existing noidear modules where possible, deletes conflicting old dependencies instead of keeping compatibility paths, and requires every task to prove schema, service/API, UI entry, old-dependency cleanup, and tests.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Vue 3, Vite, Vitest, Jest, Element Plus, noidear existing modules under `/Users/jiashenglin/Desktop/project/noidear`.

---

## 0. Scope And Non-Scope

This plan covers the first-release closed-loop slice only.

**In scope:**

- Plan A: `CompanyTenant`, `CompanyProfile`, company isolation, `WorkshopArea` as `AreaPoint` landing.
- Plan B: `MaterialInbound`, `MaterialInboundItem`, `IncomingInspection`, `MaterialBatch`, `InventoryMovement`.
- Plan C: `ProductionPlan`, `ProductionPlanItem`, `ProductionTask`, `ProductionBatch.planItemId`.
- Plan C.5: reuse `WarehouseModule`, `StagingAreaStock`, and `StagingAreaStocktake` for staging-area start/end shift stocktake; no separate handover-stocktake module.
- Plan D: `MixingExecutionLine -> BatchMaterialUsage.executionLineId` trace bridge.
- Plan E minimum: `InspectionRecord`, `InspectionRecordItem`, `NonConformance.source_item_id`.
- Plan H minimum: `TraceabilitySnapshot`, `EvidenceFile`, `EvidenceExport` for the main-chain evidence package, not full source-form layout restoration.

**Out of scope for this plan:**

- Full cleaning/disinfection suite, equipment maintenance suite, retained sample, shelf-life study, laundry, visitor, training, food safety culture.
- Reintroducing `RecordTemplate / Record / ModelLanding`.
- Any page that maps one source form directly to one hard-coded model.
- Historical business-data migration. Current premise is no protected historical business data; count checks still run before destructive cleanup.

## 1. File Structure

All implementation work happens in `/Users/jiashenglin/Desktop/project/noidear`.

### Backend Files

| Area | Files |
| --- | --- |
| Prisma | `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`; new migration folder under `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/migrations/` |
| App module | `/Users/jiashenglin/Desktop/project/noidear/server/src/app.module.ts` |
| Company | create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.module.ts`; create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.service.ts`; create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.controller.ts`; create DTO/spec files in the same module |
| Warehouse | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/services/inventory-movement-ledger.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/batch.service.ts`; modify DTOs under `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/dto/` |
| Staging area stocktake | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.controller.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/dto/staging-area.dto.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/client/src/views/warehouse/StagingArea.vue`; modify `/Users/jiashenglin/Desktop/project/noidear/client/src/api/warehouse.ts` |
| Incoming inspection | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.controller.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/dto/create-inspection.dto.ts`; update related specs |
| Production plan | create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.module.ts`; create service/controller/dto/spec files under that module |
| Batch trace | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/production-batch.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/batch-material-usage.service.ts`; modify DTOs under `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/dto/` |
| Mixing | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/mixing/mixing.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/mixing/dto/mixing.dto.ts` |
| General inspection | create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/inspection-record/inspection-record.module.ts`; create service/controller/dto/spec files under that module |
| Nonconformance | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/non-conformance/non-conformance.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/non-conformance/dto/create-nc.dto.ts`; update specs |
| Trace/evidence | modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability.service.ts`; modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability-export.service.ts`; create evidence DTO/spec files if not present |

### Frontend Files

| Area | Files |
| --- | --- |
| Router | `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts` |
| API wrappers | create or modify `/Users/jiashenglin/Desktop/project/noidear/client/src/api/company.ts`; `/Users/jiashenglin/Desktop/project/noidear/client/src/api/production-plan.ts`; `/Users/jiashenglin/Desktop/project/noidear/client/src/api/inspection-record.ts`; modify existing `/Users/jiashenglin/Desktop/project/noidear/client/src/api/incoming-inspection.ts`, `/Users/jiashenglin/Desktop/project/noidear/client/src/api/batch.ts`, `/Users/jiashenglin/Desktop/project/noidear/client/src/api/mixing.ts`, `/Users/jiashenglin/Desktop/project/noidear/client/src/api/non-conformance.ts`, `/Users/jiashenglin/Desktop/project/noidear/client/src/api/traceability.ts` |
| Views | create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/company/CompanySettings.vue`; create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/production-plan/ProductionPlanWorkbench.vue`; create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/inspection-record/InspectionRecordWorkbench.vue`; modify existing incoming inspection, mixing, traceability views |
| Tests | create Vitest specs beside the changed views and API files |

## 2. Global Rules For Every Task

Every task below must include the same five completion checks:

```text
schema complete
service/API complete
page/entry complete
old dependencies cleared
tests and verification passed
```

Every task that replaces an old field, route, service, page, or module must include an old-code scan. Example:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "supplier_lot_no|material_batch_id|RecordTemplate|ModelLanding" server client
```

Allowed residual matches:

- `schema.prisma` while the task is editing that model.
- migration SQL for the task.
- tests that assert old fields no longer appear.
- documentation comments inside this plan or the vault docs.

Disallowed residual matches:

- service/runtime reads from old fields.
- controller DTOs accepting old-only payloads.
- client API types exposing old fields as active input.
- menu/router paths to old pages.
- tests proving old paths still work.

## Task 1: Baseline Audit And Destructive-Change Gate

**Files:**

- Read: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Read: `/Users/jiashenglin/Desktop/project/noidear/package.json`
- Create: `/Users/jiashenglin/Desktop/project/noidear/docs/superpowers/plans/evidence/first-release-baseline.md`

- [ ] **Step 1: Record git and schema baseline**

Run:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
git status --short
git rev-parse HEAD
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
```

Expected:

```text
prisma generate succeeds
schema validate succeeds
```

- [ ] **Step 2: Count tables touched by destructive cleanup**

Run against the active development database:

```bash
cd /Users/jiashenglin/Desktop/project/noidear/server
npx prisma db execute --schema src/prisma/schema.prisma --stdin <<'SQL'
SELECT 'material_batches' AS table_name, COUNT(*)::text AS row_count FROM material_batches
UNION ALL SELECT 'incoming_inspections', COUNT(*)::text FROM incoming_inspections
UNION ALL SELECT 'material_inbounds', COUNT(*)::text FROM material_inbounds
UNION ALL SELECT 'material_inbound_items', COUNT(*)::text FROM material_inbound_items
UNION ALL SELECT 'inventory_movements', COUNT(*)::text FROM inventory_movements
UNION ALL SELECT 'production_batches', COUNT(*)::text FROM production_batches
UNION ALL SELECT 'batch_material_usages', COUNT(*)::text FROM batch_material_usages
UNION ALL SELECT 'traceability_snapshots', COUNT(*)::text FROM traceability_snapshots;
SQL
```

Expected:

```text
The command prints a row_count per table. Non-zero demo/seed data is allowed only if the implementation run explicitly resets the dev database before applying destructive schema changes.
```

- [ ] **Step 3: Write baseline evidence note**

Create `/Users/jiashenglin/Desktop/project/noidear/docs/superpowers/plans/evidence/first-release-baseline.md` with this structure:

```markdown
# First Release Baseline Evidence

## Git

- HEAD:
- Dirty files:

## Prisma

- `npm run prisma:generate -w server`:
- `npx prisma validate --schema server/src/prisma/schema.prisma`:

## Table Counts

| table | row_count | action |
| --- | ---: | --- |
| material_batches |  | clear dev data before destructive cleanup |
| incoming_inspections |  | clear dev data before destructive cleanup |
| material_inbounds |  | clear dev data before destructive cleanup |
| material_inbound_items |  | clear dev data before destructive cleanup |
| inventory_movements |  | clear dev data before destructive cleanup |
| production_batches |  | clear dev data before destructive cleanup |
| batch_material_usages |  | clear dev data before destructive cleanup |
| traceability_snapshots |  | clear dev data before destructive cleanup |
```

- [ ] **Step 4: Old-code scan**

Run:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "RecordTemplate|ModelLanding|supplier_lot_no|material_batch_id|production_batch_id String\\s*//|@@unique\\(\\[productionBatchId, materialBatchId\\]\\)" server client
```

Expected:

```text
All matches are recorded in the baseline evidence note and assigned to a later task in this plan.
```

- [ ] **Step 5: Commit baseline evidence**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
git add docs/superpowers/plans/evidence/first-release-baseline.md
git commit -m "docs: record first-release baseline evidence"
```

## Task 2: CompanyTenant, CompanyProfile, And Company Isolation Foundation

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.module.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.service.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.controller.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.service.spec.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/dto/company.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/app.module.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/company.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/company/CompanySettings.vue`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts`

- [ ] **Step 1: Write failing service tests**

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.service.spec.ts`:

```ts
import { CompanyService } from './company.service';

describe('CompanyService', () => {
  const prisma = {
    companyTenant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    companyProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('creates a tenant with string id and default retention policy', async () => {
    prisma.companyTenant.create.mockResolvedValue({
      id: 'tenant-1',
      name: '揭阳市港荣时尚食品有限公司',
      timezone: 'Asia/Shanghai',
      retentionPolicy: 'default_food_safety',
      status: 'active',
    });
    const service = new CompanyService(prisma as any);

    const result = await service.createTenant({
      name: '揭阳市港荣时尚食品有限公司',
      timezone: 'Asia/Shanghai',
    });

    expect(prisma.companyTenant.create).toHaveBeenCalledWith({
      data: {
        name: '揭阳市港荣时尚食品有限公司',
        timezone: 'Asia/Shanghai',
        retentionPolicy: 'default_food_safety',
        status: 'active',
      },
    });
    expect(result.id).toBe('tenant-1');
  });

  it('upserts company profile separately from tenant config', async () => {
    prisma.companyProfile.upsert.mockResolvedValue({
      id: 'profile-1',
      company_id: 'tenant-1',
      manufacturerName: '港荣',
      manufacturerAddress: '揭阳市',
      manufacturerPhone: '0663-0000000',
      originPlace: '广东揭阳',
    });
    const service = new CompanyService(prisma as any);

    await service.upsertProfile('tenant-1', {
      manufacturerName: '港荣',
      manufacturerAddress: '揭阳市',
      manufacturerPhone: '0663-0000000',
      originPlace: '广东揭阳',
    });

    expect(prisma.companyProfile.upsert).toHaveBeenCalledWith({
      where: { company_id: 'tenant-1' },
      create: {
        company_id: 'tenant-1',
        manufacturerName: '港荣',
        manufacturerAddress: '揭阳市',
        manufacturerPhone: '0663-0000000',
        originPlace: '广东揭阳',
      },
      update: {
        manufacturerName: '港荣',
        manufacturerAddress: '揭阳市',
        manufacturerPhone: '0663-0000000',
        originPlace: '广东揭阳',
      },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- company.service.spec.ts --runInBand
```

Expected:

```text
FAIL because CompanyService does not exist.
```

- [ ] **Step 3: Add Prisma models**

Modify `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`:

```prisma
model CompanyTenant {
  id              String   @id @default(cuid())
  name            String
  timezone        String   @default("Asia/Shanghai")
  retentionPolicy String   @default("default_food_safety")
  status          String   @default("active")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  profile CompanyProfile?

  @@map("company_tenants")
}

model CompanyProfile {
  id                    String        @id @default(cuid())
  company_id            String        @unique
  company               CompanyTenant @relation(fields: [company_id], references: [id], onDelete: Cascade)
  legalName             String?
  unifiedSocialCreditCode String?
  manufacturerName      String?
  manufacturerAddress   String?
  manufacturerPhone     String?
  originPlace           String?
  foodProductionLicense String?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@map("company_profiles")
}
```

- [ ] **Step 4: Add DTO and service**

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/dto/company.dto.ts`:

```ts
import { IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpsertCompanyProfileDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  unifiedSocialCreditCode?: string;

  @IsOptional()
  @IsString()
  manufacturerName?: string;

  @IsOptional()
  @IsString()
  manufacturerAddress?: string;

  @IsOptional()
  @IsString()
  manufacturerPhone?: string;

  @IsOptional()
  @IsString()
  originPlace?: string;

  @IsOptional()
  @IsString()
  foodProductionLicense?: string;
}
```

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto, UpsertCompanyProfileDto } from './dto/company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  createTenant(dto: CreateTenantDto) {
    return this.prisma.companyTenant.create({
      data: {
        name: dto.name,
        timezone: dto.timezone ?? 'Asia/Shanghai',
        retentionPolicy: 'default_food_safety',
        status: 'active',
      },
    });
  }

  async getTenant(companyId: string) {
    const tenant = await this.prisma.companyTenant.findUnique({
      where: { id: companyId },
      include: { profile: true },
    });
    if (!tenant) throw new NotFoundException(`Company tenant ${companyId} not found`);
    return tenant;
  }

  upsertProfile(companyId: string, dto: UpsertCompanyProfileDto) {
    return this.prisma.companyProfile.upsert({
      where: { company_id: companyId },
      create: { company_id: companyId, ...dto },
      update: { ...dto },
    });
  }
}
```

- [ ] **Step 5: Add module and controller**

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateTenantDto, UpsertCompanyProfileDto } from './dto/company.dto';

@Controller('companies')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.service.createTenant(dto);
  }

  @Get(':companyId')
  getTenant(@Param('companyId') companyId: string) {
    return this.service.getTenant(companyId);
  }

  @Put(':companyId/profile')
  upsertProfile(@Param('companyId') companyId: string, @Body() dto: UpsertCompanyProfileDto) {
    return this.service.upsertProfile(companyId, dto);
  }
}
```

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/company/company.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
```

Modify `/Users/jiashenglin/Desktop/project/noidear/server/src/app.module.ts`:

```ts
import { CompanyModule } from './modules/company/company.module';
```

Add `CompanyModule` to the `imports` array near existing master-data modules.

- [ ] **Step 6: Run tests and schema validation**

Run:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- company.service.spec.ts --runInBand
```

Expected:

```text
schema validates
company.service.spec.ts passes
```

- [ ] **Step 7: Add frontend API and route**

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/api/company.ts`:

```ts
import request from '@/utils/request';

export interface CompanyTenant {
  id: string;
  name: string;
  timezone: string;
  retentionPolicy: string;
  status: string;
  profile?: CompanyProfile | null;
}

export interface CompanyProfile {
  id: string;
  company_id: string;
  legalName?: string | null;
  unifiedSocialCreditCode?: string | null;
  manufacturerName?: string | null;
  manufacturerAddress?: string | null;
  manufacturerPhone?: string | null;
  originPlace?: string | null;
  foodProductionLicense?: string | null;
}

export function getCompany(companyId: string) {
  return request.get<CompanyTenant>(`/companies/${companyId}`);
}

export function saveCompanyProfile(companyId: string, data: Partial<CompanyProfile>) {
  return request.put<CompanyProfile>(`/companies/${companyId}/profile`, data);
}
```

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/company/CompanySettings.vue`:

```vue
<template>
  <section class="company-settings">
    <h1>公司配置</h1>
    <el-alert title="公司租户配置是多公司隔离的基础。" type="info" :closable="false" />
  </section>
</template>
```

Modify `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts` by adding under the authenticated layout children:

```ts
{
  path: 'companies/:companyId/settings',
  name: 'CompanySettings',
  component: () => import('@/views/company/CompanySettings.vue'),
  meta: { title: '公司配置', requireRole: 'admin' },
},
```

- [ ] **Step 8: Old-code scan and commit**

Run:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "CompanyTenant|CompanyProfile|company_id\\s+Int|companyId\\s+number" server client
npm run test -w server -- company.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/company server/src/app.module.ts client/src/api/company.ts client/src/views/company/CompanySettings.vue client/src/router/index.ts
git commit -m "feat: add company tenant foundation"
```

Expected:

```text
The new CompanyTenant and CompanyProfile paths exist, tests pass, and every first-release touched table that previously used Int company_id is converted in the same task that touches it. No first-release runtime path may depend on Int/String company-id compatibility.
```

## Task 3: WorkshopArea As AreaPoint Landing

Boundary: `AreaPoint` is the SaaS/business standard name for area, storage location, staging area, cleaning point, temperature point, sampling point, pest-control point, and equipment installation point. In noidear v1 this must land by extending `WorkshopArea`; do not create a parallel `AreaPoint`, `CleaningPoint`, `TemperaturePoint`, or `PestPoint` physical-location table. Specialty objects may store rules or records, but they must reference this same point identity.

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/workshop-area/workshop-area.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/workshop-area/workshop-area.controller.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/workshop-area/workshop-area.service.spec.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/workshop-area.ts`

- [ ] **Step 1: Write failing test for point semantics**

Update `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/workshop-area/workshop-area.service.spec.ts` with:

```ts
it('creates an area point without introducing a separate AreaPoint model', async () => {
  const prisma = {
    workshopArea: {
      create: jest.fn().mockResolvedValue({
        id: 'area-1',
        company_id: 'tenant-1',
        code: 'FRIDGE-01',
        name: '一号冰柜',
        type: 'temperature_point',
        parentId: 'room-1',
      }),
    },
  };
  const service = new WorkshopAreaService(prisma as any);

  const result = await service.create({
    company_id: 'tenant-1',
    code: 'FRIDGE-01',
    name: '一号冰柜',
    type: 'temperature_point',
    parentId: 'room-1',
  } as any);

  expect(prisma.workshopArea.create).toHaveBeenCalledWith({
    data: {
      company_id: 'tenant-1',
      code: 'FRIDGE-01',
      name: '一号冰柜',
      type: 'temperature_point',
      parentId: 'room-1',
    },
  });
  expect(result.type).toBe('temperature_point');
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- workshop-area.service.spec.ts --runInBand
```

Expected:

```text
FAIL if WorkshopArea lacks code/type/parentId/company_id support or create signature differs.
```

- [ ] **Step 3: Extend WorkshopArea**

Modify `WorkshopArea` in `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma` so it supports:

```prisma
model WorkshopArea {
  id         String   @id @default(cuid())
  company_id String
  code       String
  name       String
  type       String
  parentId   String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([company_id, code])
  @@index([company_id, type])
}
```

If existing `WorkshopArea` already has some of these fields, add only missing fields and preserve current relations.

Use `type` to distinguish examples such as `workshop`, `room`, `warehouse_location`, `staging_area`, `cleaning_point`, `temperature_point`, `sampling_point`, `pest_point`, and `equipment_point`. These are point types, not separate physical-location tables.

- [ ] **Step 4: Update service/controller/API**

Ensure `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/workshop-area/workshop-area.service.ts` exposes create/list methods using `company_id`, `code`, `name`, `type`, and `parentId`.

The create payload must match:

```ts
export interface CreateWorkshopAreaInput {
  company_id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
}
```

- [ ] **Step 5: Old-code scan and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "AreaPoint|CleaningPoint|TemperaturePoint|PestPoint|locationId|storageLocation|installLocation" server client
npm run test -w server -- workshop-area.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/workshop-area client/src/api/workshop-area.ts
git commit -m "feat: extend workshop area as area point"
```

Expected:

```text
No new AreaPoint/CleaningPoint/TemperaturePoint/PestPoint physical-location table exists. WorkshopArea is the canonical area/point landing.
```

## Task 4: Incoming Inspection Gate And Material Batch Creation

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/dto/create-inspection.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.controller.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.service.spec.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/services/inventory-movement-ledger.service.ts`
- Modify touched warehouse services that still write `StockRecord` for receive flow

- [ ] **Step 1: Write failing tests for gate behavior**

Append to `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.service.spec.ts`:

```ts
describe('IncomingInspectionService final gate', () => {
  it('creates inspection against inbound item without requiring material_batch_id', async () => {
    const prisma = {
      incomingInspection: {
        create: jest.fn().mockResolvedValue({
          id: 'insp-1',
          material_inbound_item_id: 'inbound-item-1',
          material_batch_id: null,
          overall_result: 'pass',
          is_final: false,
          results: [],
        }),
      },
    };
    const service = new IncomingInspectionService(prisma as any, { emit: jest.fn() } as any, {} as any, {} as any);

    const result = await service.create(
      {
        material_inbound_item_id: 'inbound-item-1',
        overall_result: 'pass',
        results: [],
      } as any,
      'tenant-1',
      'user-1',
    );

    expect(prisma.incomingInspection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        company_id: 'tenant-1',
        material_inbound_item_id: 'inbound-item-1',
        material_batch_id: null,
        is_final: false,
      }),
    }));
    expect(result.material_batch_id).toBeNull();
  });

  it('rejects batch creation when final result is fail', async () => {
    const prisma = {
      incomingInspection: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'insp-1',
          material_inbound_item_id: 'inbound-item-1',
          overall_result: 'fail',
          is_final: true,
        }),
      },
    };
    const service = new IncomingInspectionService(prisma as any, { emit: jest.fn() } as any, {} as any, {} as any);

    await expect(service.releaseFinalInspection('inbound-item-1', 'tenant-1', 'user-1')).rejects.toThrow(
      'Failed incoming inspection cannot create material batch',
    );
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- incoming-inspection.service.spec.ts --runInBand
```

Expected:

```text
FAIL because material_inbound_item_id/is_final/releaseFinalInspection are not implemented.
```

- [ ] **Step 3: Update Prisma schema**

Modify `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`:

```prisma
model IncomingInspection {
  id                       String                     @id @default(cuid())
  company_id               String
  material_inbound_item_id String?
  material_inbound_item    MaterialInboundItem?       @relation(fields: [material_inbound_item_id], references: [id])
  material_batch_id        String?
  material_batch           MaterialBatch?             @relation(fields: [material_batch_id], references: [id])
  inspected_at             DateTime
  inspector_id             String?
  sample_qty               Decimal?                   @db.Decimal(14, 4)
  sample_unit              String?
  overall_result           String
  is_final                 Boolean                    @default(false)
  disposition              String?
  disposition_by           String?
  notes                    String?
  results                  IncomingInspectionResult[]
  created_at               DateTime                   @default(now())
  updated_at               DateTime                   @updatedAt

  @@index([company_id, material_inbound_item_id])
  @@index([company_id, material_batch_id])
  @@map("incoming_inspections")
}
```

Modify `MaterialInboundItem`:

```prisma
model MaterialInboundItem {
  // keep existing fields
  disposition String?
  inspections IncomingInspection[]
}
```

- [ ] **Step 4: Update DTO**

Modify `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/dto/create-inspection.dto.ts`:

```ts
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class InspectionResultDto {
  @IsString()
  item_name: string;

  @IsOptional()
  @IsString()
  actual_value?: string;

  @IsBoolean()
  is_pass: boolean;
}

export class CreateInspectionDto {
  @IsString()
  material_inbound_item_id: string;

  @IsString()
  overall_result: 'pass' | 'fail' | 'conditional_pass';

  @IsOptional()
  @IsBoolean()
  is_final?: boolean;

  @IsOptional()
  @IsNumber()
  sample_qty?: number;

  @IsOptional()
  @IsString()
  sample_unit?: string;

  @IsOptional()
  @IsString()
  disposition?: 'accept' | 'concession' | 'reject' | 'return';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionResultDto)
  results: InspectionResultDto[];
}
```

- [ ] **Step 5: Update service**

Modify `create()` in `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/incoming-inspection/incoming-inspection.service.ts` so it writes `material_inbound_item_id`, always sets `material_batch_id` to `null` on creation, rejects any create payload that tries to provide `material_batch_id`, and uses string company IDs.

Add method:

```ts
async releaseFinalInspection(materialInboundItemId: string, companyId: string, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const inspection = await tx.incomingInspection.findFirst({
      where: {
        company_id: companyId,
        material_inbound_item_id: materialInboundItemId,
        is_final: true,
      },
      include: {
        material_inbound_item: {
          include: { inbound: true },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException('Final incoming inspection not found');
    }

    if (inspection.overall_result === 'fail') {
      throw new Error('Failed incoming inspection cannot create material batch');
    }

    if (inspection.overall_result === 'conditional_pass' && inspection.disposition !== 'concession') {
      throw new Error('Conditional pass requires concession disposition before release');
    }

    const item = inspection.material_inbound_item;
    if (!item) {
      throw new Error('Incoming inspection is not linked to an inbound item');
    }

    const batch = await tx.materialBatch.create({
      data: {
        materialId: item.materialId,
        supplierId: inspection.material_inbound_item.inbound.supplierId,
        supplierBatchNo: item.supplierBatchNo,
        quantity: item.quantity,
        unit: 'kg',
        productionDate: item.productionDate,
        expiryDate: item.expiryDate,
        status: 'normal',
      } as any,
    });

    await tx.incomingInspection.update({
      where: { id: inspection.id },
      data: { material_batch_id: batch.id },
    });

    await tx.materialInboundItem.update({
      where: { id: materialInboundItemId },
      data: {
        createdBatchId: batch.id,
        disposition: inspection.overall_result === 'conditional_pass' ? 'concession' : 'accept',
      },
    });

    await tx.inventoryMovement.create({
      data: {
        company_id: companyId,
        movement_type: 'receive',
        object_type: 'material_batch',
        object_id: batch.id,
        qty: item.quantity,
        unit: 'kg',
        ref_type: 'incoming_inspection',
        ref_id: inspection.id,
        operator_id: userId,
        moved_at: new Date(),
      } as any,
    });

    // Do not create a second authoritative receive flow in StockRecord.
    // If a current-balance projection is required, update the balance object separately
    // and keep InventoryMovement as the single movement ledger.

    return batch;
  });
}
```

If `MaterialBatch` currently requires additional fields, map them explicitly from `MaterialInboundItem` and existing batch service requirements rather than adding dummy values.
If touched inbound/warehouse code still creates `StockRecord` for the same receive action, remove that write or convert it to a non-authoritative balance projection. One release action must not write both `StockRecord(in)` and `InventoryMovement(receive)` as two independent movement facts.

- [ ] **Step 6: Old-code scan**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "material_batch_id|StockRecord|stockRecord|inventoryMovement" server/src/modules/incoming-inspection server/src/modules/warehouse client/src/api/incoming-inspection.ts client/src/views/incoming-inspection
```

Expected:

```text
material_batch_id remains only in schema, release/finalization update code, response payloads, and tests that assert it is not accepted as a creation input. The receive action writes one authoritative inventory movement through InventoryMovement, not a second StockRecord movement fact.
```

- [ ] **Step 7: Run validation and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- incoming-inspection.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/incoming-inspection server/src/modules/warehouse
git commit -m "feat: gate material batches behind final incoming inspection"
```

## Task 5: MaterialBatch Supplier Batch Canonical Cleanup

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/batch.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/dto/batch.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/material-batch.service.ts`
- Modify: related frontend API/view files that expose supplier batch fields

- [ ] **Step 1: Write failing test for canonical field**

Append to `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/batch.service.spec.ts`:

```ts
it('uses supplierBatchNo as the only runtime supplier lot field', async () => {
  const prisma = {
    materialBatch: {
      findMany: jest.fn().mockResolvedValue([{ id: 'batch-1', supplierBatchNo: 'SUP-LOT-1' }]),
    },
  };
  const service = new BatchService(prisma as any);

  const batches = await service.findBySupplierBatchNo('SUP-LOT-1', 'tenant-1');

  expect(prisma.materialBatch.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      supplierBatchNo: 'SUP-LOT-1',
    }),
  }));
  expect(JSON.stringify(prisma.materialBatch.findMany.mock.calls)).not.toContain('supplier_lot_no');
  expect(batches[0].supplierBatchNo).toBe('SUP-LOT-1');
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- batch.service.spec.ts --runInBand
```

Expected:

```text
FAIL if findBySupplierBatchNo is missing or supplier_lot_no is still queried.
```

- [ ] **Step 3: Delete old field from schema**

In `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`, remove:

```prisma
supplier_lot_no String?
```

Keep:

```prisma
supplierBatchNo String?
```

- [ ] **Step 4: Update services and DTOs**

Ensure every create/update/query path uses:

```ts
supplierBatchNo: dto.supplierBatchNo
```

Do not accept or return `supplier_lot_no` in DTOs or client API types.

- [ ] **Step 5: Old-code scan**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "supplier_lot_no|supplierLotNo" server client
```

Expected:

```text
No runtime matches. Migration SQL or documentation-only matches must be listed in commit notes.
```

- [ ] **Step 6: Validate and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- batch.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/warehouse server/src/modules/batch-trace client/src
git commit -m "refactor: make supplierBatchNo the only supplier batch field"
```

## Task 6: Production Plan, Plan Items, Production Tasks, And Product Batch Backlink

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.module.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.service.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.controller.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/dto/production-plan.dto.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.service.spec.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/app.module.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/production-plan.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/production-plan/ProductionPlanWorkbench.vue`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts`

- [ ] **Step 1: Write failing production plan service test**

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/production-plan.service.spec.ts`:

```ts
import { ProductionPlanService } from './production-plan.service';

describe('ProductionPlanService', () => {
  it('releases a plan and derives production tasks per plan item', async () => {
    const prisma = {
      productionPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'plan-1',
          company_id: 'tenant-1',
          status: 'draft',
          items: [{ id: 'item-1', productId: 'product-1', recipeId: 'recipe-1' }],
        }),
        update: jest.fn().mockResolvedValue({ id: 'plan-1', status: 'released' }),
      },
      productionTask: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      productionBatch: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    const service = new ProductionPlanService(prisma as any);

    await service.releasePlan('plan-1', 'tenant-1', 'user-1');

    expect(prisma.productionTask.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ planItemId: 'item-1', taskType: 'mixing' }),
        expect.objectContaining({ planItemId: 'item-1', taskType: 'inspection' }),
        expect.objectContaining({ planItemId: 'item-1', taskType: 'packaging' }),
      ],
      skipDuplicates: true,
    });
    expect(prisma.productionPlan.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'plan-1' },
      data: expect.objectContaining({ status: 'released' }),
    }));
    expect(prisma.productionBatch.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- production-plan.service.spec.ts --runInBand
```

Expected:

```text
FAIL because production-plan module does not exist.
```

- [ ] **Step 3: Add Prisma models**

Add to `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`:

```prisma
model ProductionPlan {
  id           String   @id @default(cuid())
  company_id   String
  planNo       String
  planDate     DateTime
  lineId       String?
  status       String   @default("draft")
  createdById  String?
  releasedAt   DateTime?
  releasedById String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  items ProductionPlanItem[]

  @@unique([company_id, planNo])
  @@index([company_id, status])
  @@map("production_plans")
}

model ProductionPlanItem {
  id           String   @id @default(cuid())
  planId       String
  plan         ProductionPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  productId    String
  recipeId     String?
  plannedQty   Decimal  @db.Decimal(14, 4)
  unit         String
  lineId       String?
  shiftId      String?
  status       String   @default("planned")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tasks ProductionTask[]
  productionBatches ProductionBatch[] @relation("PlanItemProductionBatches")

  @@index([planId])
  @@index([productId])
  @@map("production_plan_items")
}

model ProductionTask {
  id             String   @id @default(cuid())
  planItemId     String
  planItem       ProductionPlanItem @relation(fields: [planItemId], references: [id], onDelete: Cascade)
  taskType       String
  resourceType   String?
  resourceId     String?
  assigneeRole   String?
  assigneeUserId String?
  dueAt          DateTime?
  status         String   @default("pending")
  completedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([planItemId, taskType, resourceType, resourceId])
  @@index([status, dueAt])
  @@map("production_tasks")
}
```

Modify `ProductionBatch`:

```prisma
planItemId String?
planItem   ProductionPlanItem? @relation("PlanItemProductionBatches", fields: [planItemId], references: [id])
```

Add:

```prisma
@@index([planItemId])
```

- [ ] **Step 4: Add DTO/service/controller/module**

Create DTO in `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/production-plan/dto/production-plan.dto.ts`:

```ts
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionPlanItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  recipeId?: string;

  @IsNumber()
  plannedQty: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}

export class CreateProductionPlanDto {
  @IsString()
  planNo: string;

  @IsDateString()
  planDate: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionPlanItemDto)
  items: CreateProductionPlanItemDto[];
}
```

Create service with release behavior:

```ts
const DEFAULT_TASK_TYPES = ['mixing', 'inspection', 'packaging'] as const;
```

`releasePlan(planId, companyId, userId)` must run in a Prisma transaction, lock the plan by id/company, create tasks for each item, and set status `released`. It must not create `ProductionBatch`; product batches are created or confirmed later by packaging code confirmation, packaging confirmation, or finished-goods intake, then linked back with `planItemId`. Refactor the current `confirmProductBatch()` semantics: it may create or confirm a `ProductionBatch` to mean "this batch number has started", but it must leave the batch `in_progress`, must not write finished-goods `InventoryMovement(production_in)`, and must not set `completed`. Packaging confirmation is submitted by the packaging role; it records packaging, code-printing, and quantity facts and may create or confirm `ProductionBatch`, but it must not write finished-goods `InventoryMovement(production_in)`. Do not add `PackagingConfirmation` or `PackagingOutputRecord` in this slice. Finished-goods `InventoryMovement(object_type = "production_batch", movement_type = "production_in")` is written only by finished-goods intake confirmation, after a warehouse or finished-goods staging receiver accepts the batch. Implement finished-goods intake inside the existing warehouse boundary: reuse `WarehouseModule`, `InventoryMovement`, and `InventoryMovementLedgerService`; extend the ledger with a product-batch movement path instead of creating a parallel finished-goods warehouse module, packaging-intake module, or second inventory ledger. The action may be exposed from both a warehouse task/intake entry and the production-batch detail page, but both UI paths must call the same warehouse API/service. Finished-goods intake confirmation must select an existing `ProductionBatch` and must not update `batchNumber`. Do not add a finished-goods balance table in this slice; quantity, readiness, and close checks must query or aggregate `InventoryMovement` rows for `object_type = "production_batch"`. This slice does not add physical batch-number input, scanning, or automatic comparison. Before batch close, the same `ProductionBatch` may have multiple finished-goods intake confirmations and therefore multiple `production_in` movements.

`ProductionBatch.status = completed` must be set only by a lightweight batch-close confirmation action. In continuous production, switching to the next batch number triggers close confirmation for the previous batch. In non-continuous production, the current batch is closed when production stops, the shift ends, or there is no next batch number. Batch close is only allowed when at least one finished-goods `InventoryMovement(object_type = "production_batch", movement_type = "production_in", object_id = ProductionBatch.id)` exists for the `ProductionBatch`; this is an at-least-one gate, not a uniqueness rule. Without any finished-goods intake movement, keep the batch open or preview-only. Batch close and readiness depend on the selected `ProductionBatch`; never mutate `batchNumber` during finished-goods intake. This plan does not validate physical/system batch-number mismatch. Do not validate finished-goods intake quantity against cumulative packaging quantity, because this slice has no reliable independent packaging-output fact source. Mixing completion, ProductionRun completion, quality inspection completion, one packaging confirmation, or one finished-goods intake must not independently mark the product batch completed while the same batch number may still create more packaging or intake facts. Before completion, multiple ordinary finished-goods intake confirmations may write multiple `production_in` movements for the same `ProductionBatch`. After a batch is completed, ordinary finished-goods intake must not continue writing new `production_in` movements for that batch; missed intake, backfill, or correction must use `InventoryMovement.movement_type = "adjustment"` pointing to the same `ProductionBatch`. Do not add `closedAt`, `closedById`, `closeReason`, actual quantity snapshot, warehoused quantity snapshot, or loss/waste/sample snapshot fields for batch close. Warehoused quantity must be proven by finished-goods `InventoryMovement` records.

- [ ] **Step 5: Add frontend route**

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/api/production-plan.ts`:

```ts
import request from '@/utils/request';

export interface ProductionPlanItemInput {
  productId: string;
  recipeId?: string;
  plannedQty: number;
  unit: string;
  lineId?: string;
  shiftId?: string;
}

export interface ProductionPlanInput {
  planNo: string;
  planDate: string;
  lineId?: string;
  items: ProductionPlanItemInput[];
}

export function createProductionPlan(data: ProductionPlanInput) {
  return request.post('/production-plans', data);
}

export function releaseProductionPlan(id: string) {
  return request.post(`/production-plans/${id}/release`);
}
```

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/production-plan/ProductionPlanWorkbench.vue`:

```vue
<template>
  <section class="production-plan-workbench">
    <h1>生产计划工作台</h1>
    <el-alert title="发布计划后系统派生投料、检验、包装等现场任务。" type="info" :closable="false" />
  </section>
</template>
```

Add route:

```ts
{
  path: 'production-plans',
  name: 'ProductionPlanWorkbench',
  component: () => import('@/views/production-plan/ProductionPlanWorkbench.vue'),
  meta: { title: '生产计划' },
},
```

- [ ] **Step 6: Validate and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "ApprovalTask|RecordTask|ScheduledTask|ProductionTask" server client
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- production-plan.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/production-plan server/src/app.module.ts server/src/modules/batch-trace client/src/api/production-plan.ts client/src/views/production-plan/ProductionPlanWorkbench.vue client/src/router/index.ts
git commit -m "feat: add production plan and execution tasks"
```

## Task 6A: Staging-Area Batch Stocktake And Shift Handover

This task does not add a new module. It tightens the existing warehouse staging-area feature so operators can use one simple workbench for shift-start stocktake and shift-end handover. The business rule is:

```text
班后盘点 = 上一班交出
班前盘点 = 下一班接手确认
下一班的班前盘点承接上一班的班后盘点
不单独做“接班盘点”
```

This is an operational stocktake workflow, not a production-start approval flow. Do not add a separate `HandoverStocktake`, `ShiftHandoverApproval`, production-start approval module, or CAPA workflow for every ordinary quantity difference.

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.controller.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/dto/staging-area.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.service.spec.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/warehouse.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/warehouse/StagingArea.vue`
- Read: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/mixing/mixing.service.ts`

- [ ] **Step 1: Confirm existing model and route facts**

Verify the current code before changing it:

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "model StagingAreaStock|model StagingAreaStocktake|shift_start|shift_end|handover|warehouse/staging-area/stocktakes" server/src/prisma/schema.prisma server/src/modules/warehouse client/src/api client/src/views/warehouse server/src/modules/mixing
```

Expected:

```text
StagingAreaStock and StagingAreaStocktake already exist.
The existing route /warehouse/staging-area/stocktakes already exists.
The existing UI already has shift_start and shift_end/handover language.
Mixing code may already check shift_start stocktake; keep this as an operational stocktake check, not a new approval workflow.
```

- [ ] **Step 2: Write failing tests for shift handover comparison**

Extend `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/warehouse/staging-area.service.spec.ts` so it proves:

```text
1. Creating a shift_start stocktake for area + shift + material batch can read the previous shift_end stocktake as the comparison baseline.
2. A difference stores expectedQuantity, actualQuantity, differenceQuantity, and note/reason when provided.
3. Ordinary difference does not auto-create NonConformance, CorrectiveAction, or ApprovalTask.
4. The service does not require a separate handover stocktake after shift_start.
```

The test should use the existing `StagingAreaStocktake` model and existing staging-area service. Do not introduce a new model for handover.

- [ ] **Step 3: Keep one stocktake model, but make the semantics explicit**

Use existing `StagingAreaStocktake.kind` values:

| kind | Business meaning | UI label |
| --- | --- | --- |
| `shift_end` | 上一班交出数量 | 班后盘点 |
| `shift_start` | 下一班接手确认数量 | 班前盘点 |
| `handover` | Legacy/current-code value only if already required by existing records or tests; do not make it the normal business path | 不作为默认入口 |

If the current DTO or UI exposes `handover` as a first-class normal choice, demote it in the first-release UI. The normal operator path should show two actions only:

```text
班后盘点（交出）
班前盘点（接手确认）
```

- [ ] **Step 4: Optimize UI from single-batch form to area-level batch stocktake**

Modify `/Users/jiashenglin/Desktop/project/noidear/client/src/views/warehouse/StagingArea.vue` so the operator flow is:

```text
选择暂存区
-> 选择班次和日期
-> 系统列出该暂存区当前所有物料批次
-> 操作员逐行填写实际数量
-> 一次提交为多条 StagingAreaStocktake
```

The UI must not force the operator to repeat area/date/shift for each material batch. This is still stored as row-level `StagingAreaStocktake` records so traceability can point to the exact material batch and area.

- [ ] **Step 5: Add previous shift-end baseline for shift-start**

For `kind = shift_start`, service should look up the latest confirmed `shift_end` stocktake for the same:

```text
area_id
batchId/materialBatchId
previous shift or nearest previous confirmed shift_end before the selected work date/shift
```

Store or return the previous `shift_end` quantity as comparison data. If schema already has fields for expected/book/actual/difference, use them. If it does not, add only the minimum fields needed:

```prisma
expectedQuantity Decimal? @db.Decimal(14, 4)
differenceQuantity Decimal? @db.Decimal(14, 4)
note String?
```

Do not add `handoverApprovedBy`, `handoverApprovedAt`, or separate close fields. The confirmation identity can use the existing stocktake creator/confirmer fields if they already exist; otherwise keep the first-release scope to the stocktake row and note.

- [ ] **Step 6: Difference handling**

Difference handling stays simple:

```text
actualQuantity = expectedQuantity -> confirmed
actualQuantity != expectedQuantity -> confirmed with differenceQuantity + note
```

Do not automatically create CAPA for every difference. Only later workflows may create NonConformance/CorrectiveAction when a difference affects material usage, traceability, release, or a responsible person explicitly escalates it. This plan does not implement that escalation.

- [ ] **Step 7: Keep production/mixing boundary simple**

Do not add a strict production-start approval gate. If existing `MixingService` already requires `shift_start` stocktake when `shiftTypeId` is submitted, keep or adjust that check as a practical stocktake guard:

```text
Mixing execution can require a confirmed shift_start stocktake for the used material batch and staging area.
ProductionPlan release must not require stocktake.
ProductionTask creation must not require stocktake.
ProductionBatch confirmation must not require stocktake.
```

If the existing check blocks too early or requires per-batch manual repetition, fix the warehouse batch-stocktake UI/service first rather than deleting stocktake discipline from mixing.

- [ ] **Step 8: Validate and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- staging-area.service.spec.ts --runInBand
npm run test -w server -- mixing.service.spec.ts --runInBand
rg "HandoverStocktake|ShiftHandoverApproval|接班盘点|handoverApproved|production-start approval|生产启动审批" server client
git add server/src/modules/warehouse client/src/api/warehouse.ts client/src/views/warehouse/StagingArea.vue server/src/modules/mixing
git commit -m "feat: refine staging area shift stocktake"
```

Expected:

```text
Warehouse staging area supports area-level batch stocktake.
Shift-end stocktake is the previous shift handoff.
Shift-start stocktake is the next shift acceptance and can compare against previous shift-end quantity.
There is no separate handover-stocktake module and no production-start approval gate.
Ordinary differences are recorded, not automatically escalated to CAPA.
```

## Task 7: Mixing Execution Line To Auto-Generated BatchMaterialUsage Trace Bridge

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/mixing/mixing.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/mixing/dto/mixing.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/batch-material-usage.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/dto/material-usage.dto.ts`
- Modify specs under both modules

`BatchMaterialUsage` is an internal trace bridge generated by mixing confirmation. Do not add a user-facing create page, client create API, or manual补录入口 for it.

- [ ] **Step 1: Write failing test for duplicate material batch usage through internal trace service**

Append to `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/batch-trace/services/batch-material-usage.service.spec.ts`:

```ts
it('allows the same material batch to be used twice when executionLineId differs', async () => {
  const prisma = {
    batchMaterialUsage: {
      create: jest
        .fn()
        .mockResolvedValueOnce({ id: 'usage-1', executionLineId: 'line-1' })
        .mockResolvedValueOnce({ id: 'usage-2', executionLineId: 'line-2' }),
    },
  };
  const service = new BatchMaterialUsageService(prisma as any);

  await service.createFromMixingLine({
    productionBatchId: 'pb-1',
    materialBatchId: 'mb-1',
    quantity: 10,
    executionLineId: 'line-1',
  } as any);
  await service.createFromMixingLine({
    productionBatchId: 'pb-1',
    materialBatchId: 'mb-1',
    quantity: 5,
    executionLineId: 'line-2',
  } as any);

  expect(prisma.batchMaterialUsage.create).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- batch-material-usage.service.spec.ts --runInBand
```

Expected:

```text
FAIL if service method or executionLineId is missing.
```

- [ ] **Step 3: Update Prisma schema**

Modify `BatchMaterialUsage`:

```prisma
executionLineId String?
executionLine   MixingExecutionLine? @relation(fields: [executionLineId], references: [id], onDelete: SetNull)

@@index([productionBatchId, materialBatchId, executionLineId])
```

Delete:

```prisma
@@unique([productionBatchId, materialBatchId])
```

Modify `MixingExecutionLine`:

```prisma
batchMaterialUsages BatchMaterialUsage[]
```

- [ ] **Step 4: Update DTO/service**

Every new `BatchMaterialUsage` write from mixing confirmation must include:

```ts
executionLineId: line.id
```

Reject new writes without `executionLineId`:

```ts
if (!dto.executionLineId) {
  throw new BadRequestException('executionLineId is required for new batch material usage');
}
```

Do not expose a public create/update route for manual `BatchMaterialUsage` entry. If the existing batch-trace controller keeps query endpoints, create/update must either be removed from the public route surface or restricted to internal service calls used by `MixingExecutionService.confirm()`.

- [ ] **Step 5: Old-code scan and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "@@unique\\(\\[productionBatchId, materialBatchId\\]\\)|executionLineId|createUsage|createFromMixingLine|batch-material-usage" server/src/prisma server/src/modules/mixing server/src/modules/batch-trace client/src
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- batch-material-usage.service.spec.ts mixing.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/mixing server/src/modules/batch-trace
git commit -m "feat: link material usage to mixing execution lines"
```

## Task 8: General Inspection Record And NonConformance Source Item

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Create: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/inspection-record/inspection-record.module.ts`
- Create service/controller/dto/spec files under `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/inspection-record/`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/non-conformance/dto/create-nc.dto.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/non-conformance/non-conformance.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/app.module.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/inspection-record.ts`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/inspection-record/InspectionRecordWorkbench.vue`

- [ ] **Step 1: Write failing inspection service test**

Create `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/inspection-record/inspection-record.service.spec.ts`:

```ts
import { InspectionRecordService } from './inspection-record.service';

describe('InspectionRecordService', () => {
  it('creates nonconformance for failed inspection item with source_item_id', async () => {
    const prisma = {
      inspectionRecord: {
        create: jest.fn().mockResolvedValue({
          id: 'record-1',
          items: [{ id: 'item-1', judgment: 'fail' }],
        }),
      },
      nonConformance: {
        create: jest.fn().mockResolvedValue({ id: 'nc-1', source_item_id: 'item-1' }),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    const service = new InspectionRecordService(prisma as any);

    await service.create({
      company_id: 'tenant-1',
      inspectionStandardId: 'standard-1',
      objectType: 'material_batch',
      objectId: 'batch-1',
      inspectedAt: new Date().toISOString(),
      items: [{ inspectionItemId: 'standard-item-1', itemName: '水分', actualValue: '12', judgment: 'fail' }],
    } as any);

    expect(prisma.nonConformance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 'tenant-1',
        source_type: 'inspection_record',
        source_id: 'record-1',
        source_item_id: 'item-1',
      }),
    });
  });
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- inspection-record.service.spec.ts --runInBand
```

Expected:

```text
FAIL because inspection-record module does not exist.
```

- [ ] **Step 3: Add Prisma models and NonConformance field**

Add:

```prisma
// Modify InspectionStandard:
// inspection_records InspectionRecord[]

// Modify InspectionItem:
// inspection_record_items InspectionRecordItem[]

model InspectionRecord {
  id             String   @id @default(cuid())
  company_id     String
  standard_id    String?
  standard       InspectionStandard? @relation(fields: [standard_id], references: [id], onDelete: SetNull)
  object_type    String
  object_id      String
  inspected_at   DateTime
  inspector_id   String?
  overall_result String
  status         String   @default("submitted")
  source_task_id String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  items InspectionRecordItem[]

  @@index([company_id, object_type, object_id])
  @@index([standard_id])
  @@map("inspection_records")
}

model InspectionRecordItem {
  id                  String   @id @default(cuid())
  record_id           String
  record              InspectionRecord @relation(fields: [record_id], references: [id], onDelete: Cascade)
  inspection_item_id  String?
  inspection_item     InspectionItem? @relation(fields: [inspection_item_id], references: [id], onDelete: SetNull)
  item_name           String
  actual_value        String?
  unit                String?
  text_result         String?
  judgment            String
  standard_snapshot   Json?
  remark              String?
  evidence_file_id    String?
  created_at          DateTime @default(now())

  @@index([record_id])
  @@index([inspection_item_id])
  @@map("inspection_record_items")
}
```

`InspectionStandard` / `InspectionItem` 是配置层，只保存标准、项目、范围、单位和判定规则。`InspectionRecord` / `InspectionRecordItem` 是执行层，只保存一次实际检验的对象、结果、判定和证据。不得新建平行 `InspectionTemplate` 表，也不得把实际值写回 `InspectionItem`。

Boundary with quality workbench/task:

- `QualityInspectionWorkbench` is only an entry and task board grouped by date, shift, production batch, area, owner, and task status.
- `QualityInspectionTask` is only a to-do item that says what to inspect, who owns it, when it is due, which object/standard it targets, and which `InspectionRecord` completed it.
- Measurements, text results, judgment, evidence, and nonconformance source links must be written to `InspectionRecord` / `InspectionRecordItem`, not to the workbench or task.
- Do not implement a `QualityDailyForm`, `QualityInspectionBigForm`, or `-质检` wide table as the result fact source.

Boundary with environment/process records:

- `EnvironmentRecord` is only for simple area-point observations such as temperature, humidity, pressure differential, freezer temperature, or cold-room temperature. It may reference `AreaPoint(WorkshopArea)` and may have nullable production-batch context.
- `ProcessMonitorRecord` is only for production-batch/process-step parameters such as slurry density, material temperature, oven parameters, CCP monitoring, or production-process patrol values.
- Water quality, pest-control, hygiene inspection, environmental microbiology, vehicle sanitation, allergen tests, and product QC checks must use `InspectionRecord` / `InspectionRecordItem` when they require inspection items, standards, judgment, evidence, or nonconformance source links.
- Do not create `PointMonitorRecord`; do not fake a `ProductionBatch` just to record a non-batch area-point observation.

Modify `NonConformance`:

```prisma
source_item_id String?
```

Add index:

```prisma
@@index([company_id, source_type, source_id, source_item_id])
```

`NonConformance` remains the problem event body only. Do not add root-cause, corrective-action, preventive-action, due-date, owner, verification-result, or close-evidence fields to `NonConformance`; those stay in `CorrectiveAction` and `VerificationRecord`.

- [ ] **Step 4: Add DTO/service/controller/module**

DTO shape:

```ts
export interface CreateInspectionRecordDto {
  company_id: string;
  inspectionStandardId?: string;
  objectType: string;
  objectId: string;
  inspectedAt: string;
  inspectorId?: string;
  items: Array<{
    inspectionItemId?: string;
    itemName: string;
    actualValue?: string;
    unit?: string;
    textResult?: string;
    judgment: 'pass' | 'fail' | 'conditional';
    standardSnapshot?: Record<string, unknown>;
    remark?: string;
  }>;
}
```

Service maps API camelCase to Prisma snake_case: `inspectionStandardId -> standard_id`, `objectType -> object_type`, `objectId -> object_id`, `inspectedAt -> inspected_at`, `inspectorId -> inspector_id`, `inspectionItemId -> inspection_item_id`, `actualValue -> actual_value`, `textResult -> text_result`, `standardSnapshot -> standard_snapshot`. Do not add camelCase columns to Prisma for these fields.

Service rule:

```ts
const overallResult = dto.items.some((item) => item.judgment === 'fail') ? 'fail' : 'pass';
```

For each failed item, create `NonConformance` with `source_type='inspection_record'`, `source_id=record.id`, `source_item_id=item.id`.

Do not close `NonConformance` by directly updating `status`. Closing must go through `CorrectiveAction` and `VerificationRecord`, so the source chain is:

```text
InspectionRecordItem -> NonConformance -> CorrectiveAction -> VerificationRecord
```

- [ ] **Step 5: Frontend entry**

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/api/inspection-record.ts`:

```ts
import request from '@/utils/request';

export interface CreateInspectionRecordItemInput {
  inspectionItemId?: string;
  itemName: string;
  actualValue?: string;
  unit?: string;
  textResult?: string;
  judgment: 'pass' | 'fail' | 'conditional';
  remark?: string;
}

export interface CreateInspectionRecordInput {
  inspectionStandardId?: string;
  objectType: string;
  objectId: string;
  inspectedAt: string;
  items: CreateInspectionRecordItemInput[];
}

export function createInspectionRecord(data: CreateInspectionRecordInput) {
  return request.post('/inspection-records', data);
}
```

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/inspection-record/InspectionRecordWorkbench.vue`:

```vue
<template>
  <section class="inspection-record-workbench">
    <h1>通用检验工作台</h1>
    <el-alert title="不合格明细会精确生成异常来源。" type="info" :closable="false" />
  </section>
</template>
```

- [ ] **Step 6: Old-code scan and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "InspectionRecord|InspectionRecordItem|source_item_id|sourceItemId|source_type|closeWithVerification|CorrectiveAction|VerificationRecord" server client
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- inspection-record.service.spec.ts non-conformance.service.spec.ts --runInBand
git add server/src/prisma/schema.prisma server/src/modules/inspection-record server/src/modules/non-conformance server/src/app.module.ts client/src/api/inspection-record.ts client/src/views/inspection-record/InspectionRecordWorkbench.vue client/src/router/index.ts
git commit -m "feat: add general inspection records and item-level nc sources"
```

## Task 9: Trace Snapshot, EvidenceFile, And EvidenceExport Minimum

Boundary for this task:

- `Document` / `DocumentVersion` stays the controlled-document/version mechanism.
- `ExportTemplate` is the layout + field binding + approval-info-area version for generated evidence.
- `EvidenceExport` is one export event with export scope, data snapshot, optional template version, exported file, exporter, and time.
- `EvidenceFile` is the file binding for a business object or object item, including uploaded evidence files and generated export files.
- `ProductRecallEvidence` remains recall-event-local evidence; do not replace it with a parallel recall evidence model.
- `TraceabilitySnapshot` is an immutable trace query result. It is not an annual traceability drill and it is not a product recall event.
- `TraceabilityDrill` is the drill activity. It must reference one or more `TraceabilitySnapshot` records.
- `ProductRecall` is the real recall event. It must reference a frozen `TraceabilitySnapshot` for scope and must not recompute impact scope every time the page opens.

First-release export scope is deliberately narrow: implement a main-chain evidence package that proves supplier/material, inbound, inspection, batch creation, inventory movement, recipe, production plan, mixing/material usage, production batch, nonconformance/CAPA, approval/review snapshots, trace snapshot, and linked evidence files. The first-release evidence export has exactly one root type: `production_batch` / `ProductionBatch`. Other objects can appear in `dataSnapshot` as related nodes, but this task must not implement arbitrary-root export for supplier, material batch, inbound item, inspection record, or nonconformance. Downstream shipment/customer impact is an optional section: include it only when reliable `DeliveryNote`, customer, recall, or shipment links already exist; an empty downstream section must not fail first-release acceptance. Business-page one-click export must automatically create a fresh `TraceabilitySnapshot` and then create `EvidenceExport`; every "generate new evidence package" action creates a new snapshot/export pair even for the same product batch. Re-download/view of an old evidence package must use the existing `EvidenceExport` and file without recomputing or overwriting it. Do not create a formal `EvidenceExport` unless `ProductionBatch.status = completed`, the chain has no unclosed nonconformances/CAPA, and all required main-chain facts exist; return an `incomplete` current snapshot preview instead. `confirmProductBatch()` or its replacement only marks that a batch number has started; it must not create intake movement or set `completed`. `ProductionBatch.status = completed` must only come from batch-close confirmation: continuous production closes the previous batch when the next batch number starts, and non-continuous production closes the current batch manually. Batch close requires at least one finished-goods `InventoryMovement(object_type = "production_batch", movement_type = "production_in", object_id = ProductionBatch.id)` for the batch; this `production_in` movement is generated only by warehouse or finished-goods staging receiver confirmation, not by packaging confirmation. Finished-goods intake belongs to the existing warehouse module and must reuse the existing inventory movement table/service boundary; do not add a parallel finished-goods warehouse module or a second inventory ledger. Warehouse intake and production-batch detail may both expose the action, but they must share one warehouse API/service. Finished-goods intake must select an existing `ProductionBatch`; intake-side batch number mutation is forbidden. Do not add a finished-goods balance table in this slice; warehoused quantity and evidence readiness come from `InventoryMovement` aggregation. This slice does not add physical batch-number input, scanning, or automatic comparison, and physical/system batch-number mismatch is not a first-release readiness gate. Do not add `PackagingConfirmation` or `PackagingOutputRecord`, and do not gate intake quantity against packaging cumulative quantity. Before completion, one product batch may have multiple `production_in` movements from multiple finished-goods intake confirmations. After completion, missed intake, backfill, or correction must use `movement_type = "adjustment"` and must not add more ordinary `production_in` movements. Batch close must not create separate close-person/time/reason or quantity snapshot fields. Warehoused quantity comes from finished-goods `InventoryMovement`. `released_at / released_by` should be frozen into `dataSnapshot` when present, but they are not first-release hard gates. Advanced traceability pages may export again from an existing complete snapshot. The authoritative machine-readable payload is the JSON `dataSnapshot`; it must store both object IDs and frozen human-readable facts, not ID-only links. The user-facing download is a simple PDF or HTML-rendered PDF summary. Do not implement paper-layout restoration for all 282 source forms in this task.

Approval/review snapshot means submitted by, reviewed/approved by, approval time, approval decision, and approval opinion at that moment. Do not implement handwritten signature images, CA/e-signature certificates, or complex signature-area rendering.

Attachment handling for this task is index-only: list file name, link/path, hash, uploaded by, and uploaded at. Do not zip all original attachments into the first-release evidence package. Excel is not the primary first-release evidence format.

Do not store ordinary business attachments or generated PDFs in `Document` just because they are files. Do not overwrite an old `EvidenceExport` when the business object changes or the export template changes.

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/prisma/schema.prisma`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability-export.service.ts`
- Modify: `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability-query.service.ts`
- Modify: traceability DTO/spec files
- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/api/traceability.ts`
- Modify traceability views under `/Users/jiashenglin/Desktop/project/noidear/client/src/views/traceability/`

- [ ] **Step 1: Write failing trace context test**

Append to `/Users/jiashenglin/Desktop/project/noidear/server/src/modules/traceability/traceability.service.spec.ts`:

```ts
it('returns bounded trace context with root object and evidence links', async () => {
  const prisma = {
    traceabilitySnapshot: {
      create: jest.fn().mockResolvedValue({
        id: 'snapshot-1',
        rootObjectType: 'production_batch',
        rootObjectId: 'pb-1',
        snapshotData: {
          root: {
            type: 'production_batch',
            id: 'pb-1',
            display: { batchNumber: 'PB-20260528-001', status: 'completed' },
          },
          upstream: [],
          downstream: [],
        },
      }),
    },
    evidenceExport: {
      create: jest.fn().mockResolvedValue({ id: 'export-1', snapshotId: 'snapshot-1' }),
    },
  };
  const service = new TraceabilityService(prisma as any);

  const snapshot = await service.createTraceContextSnapshot({
    company_id: 'tenant-1',
    rootObjectType: 'production_batch',
    rootObjectId: 'pb-1',
    maxDepth: 3,
  } as any);

  expect(prisma.traceabilitySnapshot.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      company_id: 'tenant-1',
      rootObjectType: 'production_batch',
      rootObjectId: 'pb-1',
    }),
  }));
  expect(snapshot.id).toBe('snapshot-1');
});
```

- [ ] **Step 2: Run failing test**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w server -- traceability.service.spec.ts --runInBand
```

Expected:

```text
FAIL because createTraceContextSnapshot/rootObject fields are missing.
```

- [ ] **Step 3: Add/extend Prisma models**

Modify `TraceabilitySnapshot` to include:

```prisma
rootObjectType String?
rootObjectId   String?
snapshotData   Json?
fileId         String?
snapshotPurpose String @default("evidence_export") // evidence_export | preview
readinessStatus String @default("complete") // complete | incomplete
readinessReasons Json?
```

Add:

```prisma
model EvidenceFile {
  id            String   @id @default(cuid())
  company_id    String
  resourceType  String
  resourceId    String
  resourceItemId String?
  fileName      String
  filePath      String
  fileHash      String?
  mimeType      String?
  createdById   String?
  createdAt     DateTime @default(now())

  @@index([company_id, resourceType, resourceId])
  @@map("evidence_files")
}

model EvidenceExport {
  id              String   @id @default(cuid())
  company_id       String
  resourceType     String   // first release: "production_batch"
  resourceId       String   // first release: ProductionBatch.id
  snapshotId       String
  templateVersion  String?
  exportScope      String   @default("main_chain_evidence")
  dataSnapshot     Json     // object IDs + frozen readable facts; never ID-only
  approvalSnapshot Json?
  attachmentIndex  Json?
  summaryFormat    String   @default("pdf")
  fileId           String?
  exportedById     String?
  exportedAt       DateTime @default(now())

  @@index([company_id, resourceType, resourceId])
  // Do not add a unique constraint on company_id/resourceType/resourceId.
  // The same ProductionBatch may have many historical evidence exports.
  @@map("evidence_exports")
}
```

`EvidenceFile` is not a controlled document. It links a file to a business resource. If the file is the output of an export, it should be referenced by `EvidenceExport.fileId`; if it is an uploaded photo/report for a record item, it should be linked directly by `resourceType/resourceId/resourceItemId`.

`EvidenceExport` is not a file table. It stores the export event, template version and data snapshot; the physical output file is the linked `EvidenceFile`.

For first release, reject any `EvidenceExport.resourceType` or trace snapshot `rootObjectType` other than `production_batch`. Do not generalize this endpoint to arbitrary resources until a later implementation plan explicitly adds those roots.

`dataSnapshot.downstream` may be an empty array in first release. Do not build or block on a full sales/shipping/customer impact module in this task; only include downstream nodes that are already linked and trustworthy.

Every `EvidenceExport` must bind a frozen `TraceabilitySnapshot`. Do not regenerate trace context when opening, downloading, or reprinting an old export. The product-batch business page should expose a one-click export API that creates the snapshot and export in one operation; the traceability advanced page may expose a separate "export this existing snapshot" action.

Before creating a formal `EvidenceExport`, run a readiness check:

- Production batch has `status = completed`, and `completed` was set by batch-close confirmation. Product batch confirmation only means the batch number has started; it must leave the batch `in_progress` and must not create finished-goods intake movement. Batch-close confirmation requires at least one finished-goods `InventoryMovement(object_type = "production_batch", movement_type = "production_in", object_id = ProductionBatch.id)` for the batch, and that `production_in` movement must come from warehouse or finished-goods staging receiver confirmation rather than packaging confirmation. Finished-goods intake must select an existing `ProductionBatch`, and the intake API/service must reject any DTO or service path that attempts to update `batchNumber`; this slice does not add physical batch-number input, scanning, or automatic comparison. The readiness check must accept multiple pre-close `production_in` movements for the same `ProductionBatch`, and must not compare their total quantity to packaging cumulative quantity. Continuous production closes the previous batch when the next batch number starts; non-continuous production closes the current batch manually. Do not require or add close-person/time/reason or quantity snapshot fields. Warehoused quantity is read from finished-goods `InventoryMovement`. After completion, ordinary finished-goods intake must not keep adding `production_in` movements for the same batch; missed intake, backfill, or correction uses `movement_type = "adjustment"`. `pending` and `in_progress` can only create preview snapshots, and `cancelled` can never create a formal evidence export.
- Required main-chain nodes exist: material/inbound, final inspection, material batch, inventory movement, recipe/version, production plan item, mixing usage bridge, and production batch.
- No open `NonConformance`, open `CorrectiveAction`, or missing `VerificationRecord` remains on the included chain.
- If `released_at / released_by` are present, include them in `dataSnapshot`; do not fail the first-release export solely because they are absent.

If readiness fails, create or return a preview `TraceabilitySnapshot` with `snapshotPurpose = "preview"`, `readinessStatus = "incomplete"` and `readinessReasons` listing missing or open items. Do not create `EvidenceExport` for incomplete snapshots.

Separate the actions clearly:

- `Generate new evidence package`: create new `TraceabilitySnapshot`, create new `EvidenceExport`, generate a new output file.
- `Re-download evidence package`: read an existing `EvidenceExport.fileId` and return the old file; do not create a snapshot, do not update `dataSnapshot`, do not overwrite `fileId`.

`dataSnapshot` must be audit-readable without live joins. For each included key node, store at least:

- `type`, `id`, and current business code/number.
- Current display name/title for supplier, material, product, area, inspection standard, user or external party.
- Batch numbers, supplier batch numbers, quantities, units, status and key timestamps.
- Inspection conclusions, disposition, approval/review decision and opinion, nonconformance status, corrective-action status.
- Evidence file IDs plus frozen file name, hash/path, uploader and upload time.

Keep object IDs so the user can navigate back to current records, but do not rely on current records to render historical evidence facts.

- [ ] **Step 4: Implement bounded trace context**

`getTraceContext` and snapshot creation must follow:

```ts
const DEFAULT_DEPTH = 3;
const MAX_DEPTH = 6;

function normalizeTraceDepth(depth?: number) {
  if (!depth) return DEFAULT_DEPTH;
  return Math.min(Math.max(depth, 1), MAX_DEPTH);
}
```

Batch-load side objects by ID arrays. Do not loop one query per node for approvals, nonconformances, inspection items, or evidence.

Do not use `TraceabilitySnapshot` as a substitute for `TraceabilityDrill`. This task can add snapshot and export foundations, but drill records still need a dedicated `TraceabilityDrill` model/API when the drill workflow is implemented.

- [ ] **Step 5: Add frontend export action**

Expose in `/Users/jiashenglin/Desktop/project/noidear/client/src/api/traceability.ts`:

```ts
export function createTraceSnapshot(data: {
  rootObjectType: 'production_batch';
  rootObjectId: string;
  maxDepth?: number;
}) {
  return request.post('/traceability/snapshots', data);
}

export function exportProductionBatchEvidence(productionBatchId: string) {
  return request.post(`/traceability/production-batches/${productionBatchId}/evidence-export`);
}

export function previewProductionBatchTrace(productionBatchId: string) {
  return request.post(`/traceability/production-batches/${productionBatchId}/trace-preview`);
}

export function exportTraceEvidence(snapshotId: string) {
  return request.post(`/traceability/snapshots/${snapshotId}/export`);
}

export function downloadEvidenceExport(exportId: string) {
  return request.get(`/evidence-exports/${exportId}/download`, { responseType: 'blob' });
}
```

- [ ] **Step 6: Old-code scan and commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "TraceabilitySnapshot|ProductRecallEvidence|EvidenceExport|EvidenceFile|rootObjectType|snapshotData|getTraceContext" server client
npm run traceability:test -w server
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
git add server/src/prisma/schema.prisma server/src/modules/traceability client/src/api/traceability.ts client/src/views/traceability
git commit -m "feat: add trace snapshots and evidence export foundation"
```

## Task 10: First-Release UI Navigation And End-To-End Smoke Path

**Files:**

- Modify: `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts`
- Modify/create views listed in previous tasks
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/first-release/FirstReleaseSmoke.vue`
- Create: `/Users/jiashenglin/Desktop/project/noidear/client/src/views/first-release/__tests__/FirstReleaseSmoke.spec.ts`

- [ ] **Step 1: Create smoke page**

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/first-release/FirstReleaseSmoke.vue`:

```vue
<template>
  <section class="first-release-smoke">
    <h1>首发闭环检查</h1>
    <ol>
      <li>公司配置</li>
      <li>来料登记与检验</li>
      <li>物料批次与库存流水</li>
      <li>生产计划与现场任务</li>
      <li>投料追溯桥</li>
      <li>检验异常</li>
      <li>追溯快照与证据导出</li>
    </ol>
  </section>
</template>
```

- [ ] **Step 2: Add route**

Add to `/Users/jiashenglin/Desktop/project/noidear/client/src/router/index.ts`:

```ts
{
  path: 'first-release-smoke',
  name: 'FirstReleaseSmoke',
  component: () => import('@/views/first-release/FirstReleaseSmoke.vue'),
  meta: { title: '首发闭环检查', requiresAuth: true },
},
```

- [ ] **Step 3: Add Vitest route visibility test**

Create `/Users/jiashenglin/Desktop/project/noidear/client/src/views/first-release/__tests__/FirstReleaseSmoke.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import FirstReleaseSmoke from '../FirstReleaseSmoke.vue';

describe('FirstReleaseSmoke', () => {
  it('lists the first-release closed-loop steps', () => {
    const wrapper = mount(FirstReleaseSmoke);

    expect(wrapper.text()).toContain('公司配置');
    expect(wrapper.text()).toContain('来料登记与检验');
    expect(wrapper.text()).toContain('生产计划与现场任务');
    expect(wrapper.text()).toContain('追溯快照与证据导出');
  });
});
```

- [ ] **Step 4: Run frontend tests**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w client -- FirstReleaseSmoke.spec.ts
```

Expected:

```text
FirstReleaseSmoke.spec.ts passes.
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
git add client/src/router/index.ts client/src/views/first-release
git commit -m "feat: add first release smoke navigation"
```

## Task 11: Full Verification And Freeze Gate

**Files:**

- Read all changed files from Tasks 1-10.
- Create: `/Users/jiashenglin/Desktop/project/noidear/docs/superpowers/plans/evidence/first-release-verification.md`

- [ ] **Step 1: Run full old-dependency scan**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
rg "supplier_lot_no|RecordTemplate|ModelLanding|EggRoomBigForm|DailyWorkshopForm|QualityDailyForm|PointMonitorRecord" server client
rg "material_batch_id" server/src/modules/incoming-inspection client/src/api/incoming-inspection.ts client/src/views/incoming-inspection
rg "@@unique\\(\\[productionBatchId, materialBatchId\\]\\)" server/src/prisma/schema.prisma
```

Expected:

```text
No runtime old dependency remains. Any residual match is migration SQL, schema diff evidence, or a test proving old paths are gone.
```

- [ ] **Step 2: Run backend verification**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run prisma:generate -w server
npx prisma validate --schema server/src/prisma/schema.prisma
npm run test -w server -- --runInBand
```

Expected:

```text
Prisma validates and server Jest suite passes, or baseline failures are documented with file/test names and not caused by this plan.
```

- [ ] **Step 3: Run frontend verification**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run test -w client
npm run build:client
```

Expected:

```text
Vitest passes and Vite build completes.
```

- [ ] **Step 4: Run full build verification**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
npm run verify:full
```

Expected:

```text
Full verification passes, or existing baseline failures are documented and this plan's changed files are proven clean.
```

- [ ] **Step 5: Write verification evidence**

Create `/Users/jiashenglin/Desktop/project/noidear/docs/superpowers/plans/evidence/first-release-verification.md`:

```markdown
# First Release Verification Evidence

## Old Dependency Scan

| command | result | allowed residuals |
| --- | --- | --- |
| `rg "supplier_lot_no|RecordTemplate|ModelLanding|EggRoomBigForm|DailyWorkshopForm|QualityDailyForm|PointMonitorRecord" server client` |  |  |
| `rg "material_batch_id" server/src/modules/incoming-inspection client/src/api/incoming-inspection.ts client/src/views/incoming-inspection` |  |  |
| `rg "@@unique\\(\\[productionBatchId, materialBatchId\\]\\)" server/src/prisma/schema.prisma` |  |  |

## Verification Commands

| command | result |
| --- | --- |
| `npm run prisma:generate -w server` |  |
| `npx prisma validate --schema server/src/prisma/schema.prisma` |  |
| `npm run test -w server -- --runInBand` |  |
| `npm run test -w client` |  |
| `npm run build:client` |  |
| `npm run verify:full` |  |

## Closed Loop Proof

- supplier/material -> inbound:
- inbound -> final inspection:
- final inspection -> material batch:
- material batch -> inventory movement:
- production plan -> tasks:
- mixing execution -> material usage:
- material usage -> production batch:
- inspection item -> nonconformance:
- production batch -> trace snapshot:
- trace snapshot -> evidence export:
```

- [ ] **Step 6: Commit verification evidence**

```bash
cd /Users/jiashenglin/Desktop/project/noidear
git add docs/superpowers/plans/evidence/first-release-verification.md
git commit -m "docs: record first release verification evidence"
```

## Self-Review

### Spec Coverage

| 08 requirement | Covered by |
| --- | --- |
| 全量基线不等于首发一次性交付 | Scope section and Task 11 freeze gate |
| 源表不是模型边界 | Tasks 4, 6, 7, 8 do not create source-form models |
| 旧口径直接清 | Tasks 1, 5, 7, 11 old-code scans |
| 工作台会话不是整表模型 | Task 10 only creates smoke/navigation; no business facts stored in session page |
| 来料检验先绑入库明细，通过后建批次 | Task 4 |
| company isolation foundation | Task 2 |
| main data relation graph | Tasks 4, 6, 7, 8, 9 |
| 产品批次创建口径 | Task 6 links plan item to product batch but does not pre-create product batch on plan release |
| `BatchMaterialUsage.executionLineId` | Task 7 |
| `InspectionRecord/Item` and `NonConformance.source_item_id` | Task 8 |
| `TraceabilitySnapshot/EvidenceExport/EvidenceFile` | Task 9 |

### Placeholder Scan

The plan intentionally avoids placeholder markers and option-style branches. Every task has concrete paths, commands, and expected results.

### Type Consistency

Canonical fields used throughout:

- `company_id String` for new backend schema objects.
- First-release touched legacy tables must also use `company_id String`; do not keep Int/String compatibility fields.
- `supplierBatchNo` as the only supplier batch number field.
- `material_inbound_item_id` as the creation-side incoming inspection FK.
- `material_batch_id` only as post-release back-link for incoming inspection.
- `planItemId` for product batch to production plan item.
- `executionLineId` for batch material usage to mixing execution line.
- `source_item_id` for item-level nonconformance source.
