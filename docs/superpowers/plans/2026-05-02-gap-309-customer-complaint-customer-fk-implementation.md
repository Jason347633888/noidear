# GAP-309 CustomerComplaint Customer FK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use brainstorming, writing-plans, or redesign the complaint/recall model during execution. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Make every newly created `CustomerComplaint` reference tenant-scoped customer master data through the existing `ExternalParty` customer records.

**Architecture:** Reuse `ExternalParty(party_type='customer')` as the customer master source and first fix `ExternalPartyController/Service` to use JWT `companyId` instead of hardcoded `company_id='1'`. Add a nullable `CustomerComplaint.customer_id` FK for historical compatibility, enforce `customer_id` in DTO/service/UI for new complaints, and keep `customer_name` as a creation-time snapshot from `ExternalParty.name`. Preserve the already-implemented GAP-310 `production_batch_id` required FK behavior.

**Tech Stack:** Prisma schema/migration, NestJS service/DTO/controller, class-validator, Vue 3, Element Plus, Jest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-with-docs -> writing-plans` 为 GAP-309 生成 spec 和本 implementation plan。
- **grill-with-docs 校准结论：** 已确认客户主数据事实源复用 `ExternalParty(party_type='customer')`；不得新增 `Customer` 平行表，不得继续把手填 `customer_name` 当关联事实源。
- **review blocker 校准结论：** 投诉页客户选择器依赖 `/external-parties?party_type=customer`，而当前 ExternalParty 接口读写仍硬编码 `company_id='1'` 或只按 `id` 更新；执行本 plan 必须同时修复 ExternalPartyController/Service 的 JWT companyId 租户隔离。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、`AGENTS.md`、`docs/AGENT_GUIDE.md`、`docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 或 spec 冲突，必须停止并回报主 agent，不得猜测实现。
- **GAP-310 兼容条件：** 当前 `origin/master` 已要求 `CustomerComplaint.production_batch_id` 非空并校验生产批次租户归属；执行 GAP-309 时必须保留这些校验，不得把生产批次字段改回可选。
- **历史数据停止条件：** 本计划不回填历史 `CustomerComplaint.customer_id`。如果线上要求历史投诉全部有客户 FK，停止并回报主 agent，另开业务确认的数据清洗任务。
- **命令约束：** 本计划只使用当前仓库 npm/Jest/build 命令；不得新增 pnpm 命令。

## File Map

All commands below assume the execution agent is at the root of its isolated `noidear` worktree or Multica checkout.

- Modify: `server/src/prisma/schema.prisma`
- Add: `server/src/prisma/migrations/20260502103000_add_customer_complaint_customer_id/migration.sql`
- Modify: `server/src/modules/external-party/external-party.controller.ts`
- Modify: `server/src/modules/external-party/external-party.service.ts`
- Add: `server/src/modules/external-party/external-party.service.spec.ts`
- Modify: `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`
- Modify: `client/src/api/customer-complaint.ts`
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`
- Do not modify: `server/src/modules/traceability/`
- Do not modify: `server/src/modules/corrective-action/`
- Do not modify: `server/src/modules/non-conformance/`
- Do not modify: `server/src/modules/batch-trace/`
- Do not create: a new `Customer` Prisma model.

## Task 1: Scope ExternalParty API by JWT companyId

**Files:**
- Modify: `server/src/modules/external-party/external-party.controller.ts`
- Modify: `server/src/modules/external-party/external-party.service.ts`
- Add: `server/src/modules/external-party/external-party.service.spec.ts`

- [ ] **Step 1: Add focused ExternalParty service tests**

Create `server/src/modules/external-party/external-party.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { ExternalPartyService } from './external-party.service';

describe('ExternalPartyService', () => {
  const prisma = {
    externalParty: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const service = new ExternalPartyService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists only non-deleted parties for the current company and optional type', async () => {
    prisma.externalParty.findMany.mockResolvedValue([{ id: 'cust-1' }]);

    await expect(service.findAll('company-2', 'customer')).resolves.toEqual([{ id: 'cust-1' }]);

    expect(prisma.externalParty.findMany).toHaveBeenCalledWith({
      where: {
        company_id: 'company-2',
        deleted_at: null,
        party_type: 'customer',
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  });

  it('creates parties in the current company and defaults active status', async () => {
    prisma.externalParty.create.mockResolvedValue({ id: 'cust-1' });

    await service.create('company-2', {
      party_type: 'customer',
      name: '客户A',
    } as any);

    expect(prisma.externalParty.create).toHaveBeenCalledWith({
      data: {
        party_type: 'customer',
        name: '客户A',
        company_id: 'company-2',
        status: 'active',
      },
    });
  });

  it('rejects update when the party is outside the current company', async () => {
    prisma.externalParty.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.update('other-party', 'company-2', { name: '新名称' } as any)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.externalParty.updateMany).toHaveBeenCalledWith({
      where: { id: 'other-party', company_id: 'company-2', deleted_at: null },
      data: { name: '新名称' },
    });
    expect(prisma.externalParty.findFirst).not.toHaveBeenCalled();
  });

  it('soft deletes only parties in the current company', async () => {
    prisma.externalParty.updateMany.mockResolvedValue({ count: 1 });
    prisma.externalParty.findFirst.mockResolvedValue({ id: 'cust-1', deleted_at: expect.any(Date) });

    await service.remove('cust-1', 'company-2');

    expect(prisma.externalParty.updateMany).toHaveBeenCalledWith({
      where: { id: 'cust-1', company_id: 'company-2', deleted_at: null },
      data: { deleted_at: expect.any(Date) },
    });
    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: { id: 'cust-1', company_id: 'company-2' },
    });
  });
});
```

- [ ] **Step 2: Run the focused ExternalParty test and verify it fails before implementation**

```bash
(cd server && npm test -- external-party.service.spec.ts --runInBand)
```

Expected: FAIL because `ExternalPartyService` still accepts no `companyId`, hardcodes `company_id: '1'`, and uses `update()` by id.

- [ ] **Step 3: Pass companyId from the controller**

Replace `server/src/modules/external-party/external-party.controller.ts` with:

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExternalPartyService } from './external-party.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';

@Controller('external-parties')
@UseGuards(JwtAuthGuard)
export class ExternalPartyController {
  constructor(private service: ExternalPartyService) {}

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query('party_type') partyType?: string) {
    return this.service.findAll(req.user.companyId, partyType);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post()
  create(@Body() dto: CreateExternalPartyDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(req.user.companyId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExternalPartyDto, @Request() req: AuthenticatedRequest) {
    return this.service.update(id, req.user.companyId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.remove(id, req.user.companyId);
  }
}
```

- [ ] **Step 4: Scope ExternalPartyService by companyId**

Replace `server/src/modules/external-party/external-party.service.ts` with:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExternalPartyDto } from './dto/create-external-party.dto';
import { UpdateExternalPartyDto } from './dto/update-external-party.dto';

@Injectable()
export class ExternalPartyService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, partyType?: string) {
    return this.prisma.externalParty.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
        ...(partyType ? { party_type: partyType } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
  }

  async findOne(id: string, companyId: string) {
    const party = await this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });

    if (!party) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return party;
  }

  async create(companyId: string, dto: CreateExternalPartyDto) {
    return this.prisma.externalParty.create({
      data: {
        ...dto,
        company_id: companyId,
        status: dto.status ?? 'active',
      },
    });
  }

  async update(id: string, companyId: string, dto: UpdateExternalPartyDto) {
    const result = await this.prisma.externalParty.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: { ...dto },
    });

    if (result.count === 0) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });
  }

  async remove(id: string, companyId: string) {
    const result = await this.prisma.externalParty.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundException('外部方不存在或不属于当前公司');
    }

    return this.prisma.externalParty.findFirst({
      where: { id, company_id: companyId },
    });
  }
}
```

- [ ] **Step 5: Run the focused ExternalParty test**

```bash
(cd server && npm test -- external-party.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 6: Confirm the hardcoded tenant is gone**

```bash
rg -n "company_id: '1'|company_id: \"1\"" server/src/modules/external-party
```

Expected: no output.

## Task 2: Add focused CustomerComplaint service coverage

**Files:**
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`

- [ ] **Step 1: Extend the Prisma mock**

In `server/src/modules/customer-complaint/customer-complaint.service.spec.ts`, add `externalParty.findFirst` to the existing Prisma mock without removing `productionBatch` or `product`:

```ts
    externalParty: {
      findFirst: jest.fn(),
    },
```

Expected mock shape:

```ts
  const prisma = {
    customerComplaint: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productionBatch: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    externalParty: {
      findFirst: jest.fn(),
    },
  };
```

- [ ] **Step 2: Keep existing GAP-310 tests unchanged**

Do not remove or weaken the tests that assert:

```ts
rejects.toThrow('生产批次不能为空')
rejects.toThrow('生产批次不存在或不属于当前公司')
```

These tests are the regression guard for GAP-310.

- [ ] **Step 3: Update the successful create test**

In `it('scopes complaint numbering and writes by company', async () => { ... })`, keep the production batch and product mocks, add the customer mock, and pass `customer_id`:

```ts
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.externalParty.findFirst.mockResolvedValue({ id: 'cust-1', name: '客户A' });
    prisma.customerComplaint.count.mockResolvedValue(5);
    prisma.customerComplaint.create.mockResolvedValue({ id: 'cc1' });

    await service.create(
      {
        customer_id: 'cust-1',
        customer_name: '不应信任的手填名称',
        production_batch_id: 'batch-1',
        description: '投诉',
      } as any,
      '2',
    );

    expect(prisma.productionBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      select: { id: true, productId: true },
    });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'cust-1',
        company_id: '2',
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.customerComplaint.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.customerComplaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          complaint_no: expect.stringMatching(/-0006$/),
          customer_id: 'cust-1',
          customer_name: '客户A',
          production_batch_id: 'batch-1',
        }),
      }),
    );
```

- [ ] **Step 4: Add missing and invalid customer tests**

Add these tests before the resolve test. They include a valid production batch so they test only GAP-309 customer validation:

```ts
  it('rejects creation when customer_id is missing after batch validation passes', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });

    await expect(
      service.create(
        {
          customer_name: '客户',
          production_batch_id: 'batch-1',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('客户不能为空');

    expect(prisma.externalParty.findFirst).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the customer does not belong to the current company or is unavailable', async () => {
    prisma.productionBatch.findUnique.mockResolvedValue({ id: 'batch-1', productId: 'prod-1' });
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
    prisma.externalParty.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          customer_id: 'missing-customer',
          production_batch_id: 'batch-1',
          description: '投诉',
        } as any,
        '2',
      ),
    ).rejects.toThrow('客户不存在或不可用');

    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'missing-customer',
        company_id: '2',
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });
    expect(prisma.customerComplaint.create).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Run the focused test and verify it fails before implementation**

```bash
(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)
```

Expected: FAIL because `CustomerComplaintService.create()` has not yet required `customer_id`, queried `externalParty`, or replaced request `customer_name` with the master-data snapshot.

## Task 3: Add the Prisma customer relation

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: Add the reverse relation to `ExternalParty`**

In `model ExternalParty`, directly below:

```prisma
  deleted_at      DateTime?
```

add:

```prisma
  customer_complaints CustomerComplaint[]
```

- [ ] **Step 2: Add `customer_id` and relation to `CustomerComplaint`**

In `model CustomerComplaint`, replace:

```prisma
  customer_name       String
```

with:

```prisma
  customer_id         String?
  customer            ExternalParty? @relation(fields: [customer_id], references: [id], onDelete: SetNull)
  customer_name       String
```

Do not modify the existing required `production_batch_id` and `production_batch` relation.

- [ ] **Step 3: Add the customer index**

In `model CustomerComplaint`, keep the existing `@@index([production_batch_id])` and add:

```prisma
  @@index([customer_id])
```

Expected ending:

```prisma
  @@unique([company_id, complaint_no])
  @@index([production_batch_id])
  @@index([customer_id])
}
```

## Task 4: Add guarded migration

**Files:**
- Add: `server/src/prisma/migrations/20260502103000_add_customer_complaint_customer_id/migration.sql`

- [ ] **Step 1: Create the migration SQL**

```sql
-- Link customer complaints to ExternalParty customers while preserving legacy customer_name snapshots.
-- Historical complaints may keep NULL customer_id until a business-confirmed data cleanup maps them.

ALTER TABLE "CustomerComplaint"
  ADD COLUMN IF NOT EXISTS "customer_id" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "CustomerComplaint" cc
    LEFT JOIN "ExternalParty" ep ON ep."id" = cc."customer_id"
    WHERE cc."customer_id" IS NOT NULL
      AND ep."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot add CustomerComplaint.customer_id FK: orphan customer_id rows exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CustomerComplaint" cc
    JOIN "ExternalParty" ep ON ep."id" = cc."customer_id"
    WHERE cc."customer_id" IS NOT NULL
      AND ep."party_type" <> 'customer'
  ) THEN
    RAISE EXCEPTION 'Cannot add CustomerComplaint.customer_id FK: non-customer ExternalParty rows are referenced';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomerComplaint_customer_id_idx"
  ON "CustomerComplaint"("customer_id");

ALTER TABLE "CustomerComplaint" DROP CONSTRAINT IF EXISTS "CustomerComplaint_customer_id_fkey";
ALTER TABLE "CustomerComplaint"
  ADD CONSTRAINT "CustomerComplaint_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "ExternalParty"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 2: Do not add data backfill**

Do not write `UPDATE "CustomerComplaint" SET "customer_id" = ...`. Historical mapping from `customer_name` to `ExternalParty` requires business confirmation.

## Task 5: Require customer ID in DTO and service

**Files:**
- Modify: `server/src/modules/customer-complaint/dto/create-complaint.dto.ts`
- Modify: `server/src/modules/customer-complaint/customer-complaint.service.ts`

- [ ] **Step 1: Update DTO while preserving required batch**

Replace `CreateComplaintDto` with:

```ts
export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @IsOptional()
  @IsString()
  customer_name?: string;

  @IsString()
  @IsNotEmpty()
  production_batch_id: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  complaint_type?: string;
}
```

Keep the import as:

```ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
```

- [ ] **Step 2: Keep the existing BadRequestException import**

`server/src/modules/customer-complaint/customer-complaint.service.ts` should already import:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

Do not remove `BadRequestException`.

- [ ] **Step 3: Insert customer validation after production batch validation**

In `CustomerComplaintService.create()`, keep the existing `production_batch_id`, `productionBatch`, and `product` checks. Directly after the `if (!product) { ... }` block, add:

```ts
    if (!dto.customer_id) {
      throw new BadRequestException('客户不能为空');
    }

    const customer = await this.prisma.externalParty.findFirst({
      where: {
        id: dto.customer_id,
        company_id: companyId,
        party_type: 'customer',
        status: 'active',
        deleted_at: null,
      },
      select: { id: true, name: true },
    });

    if (!customer) {
      throw new BadRequestException('客户不存在或不可用');
    }
```

- [ ] **Step 4: Replace the create payload**

Replace:

```ts
    return this.prisma.customerComplaint.create({
      data: { ...dto, company_id: companyId, complaint_no, received_at: new Date() },
    });
```

with:

```ts
    return this.prisma.customerComplaint.create({
      data: {
        company_id: companyId,
        complaint_no,
        customer_id: customer.id,
        customer_name: customer.name,
        production_batch_id: dto.production_batch_id,
        complaint_type: dto.complaint_type,
        description: dto.description,
        received_at: new Date(),
      },
    });
```

- [ ] **Step 5: Run the CustomerComplaint focused test**

```bash
(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)
```

Expected: PASS.

## Task 6: Update client API contract

**Files:**
- Modify: `client/src/api/customer-complaint.ts`

- [ ] **Step 1: Add `customer_id` to response type**

Replace:

```ts
  customer_name: string;
  production_batch_id: string;
```

with:

```ts
  customer_id: string | null;
  customer_name: string;
  production_batch_id: string;
```

- [ ] **Step 2: Require customer_id in create payload**

Replace:

```ts
export interface CreateComplaintPayload {
  customer_name: string;
  production_batch_id: string;
  description: string;
  complaint_type?: string;
}
```

with:

```ts
export interface CreateComplaintPayload {
  customer_id: string;
  production_batch_id: string;
  description: string;
  complaint_type?: string;
}
```

## Task 7: Replace free-text customer input with a customer selector

**Files:**
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`

- [ ] **Step 1: Replace the customer form item**

Replace:

```vue
        <el-form-item label="顾客名称" prop="customer_name">
          <el-input v-model="createForm.customer_name" placeholder="请输入顾客名称" />
        </el-form-item>
```

with:

```vue
        <el-form-item label="顾客名称" prop="customer_id">
          <el-select
            v-model="createForm.customer_id"
            filterable
            placeholder="请选择顾客主数据"
            style="width: 100%"
            :loading="customerLoading"
          >
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="customer.name"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 2: Import ExternalParty API and type**

Below the existing customer-complaint API import, add:

```ts
import externalPartyApi, { type ExternalParty } from '@/api/external-party';
```

- [ ] **Step 3: Add customer selector state**

Below:

```ts
const filterStatus = ref<string>('');
```

add:

```ts
const customers = ref<ExternalParty[]>([]);
const customerLoading = ref(false);
```

- [ ] **Step 4: Replace create form state**

Replace:

```ts
const createForm = reactive({
  customer_name: '',
  complaint_type: '',
  production_batch_id: '',
  description: '',
});
```

with:

```ts
const createForm = reactive({
  customer_id: '',
  complaint_type: '',
  production_batch_id: '',
  description: '',
});
```

- [ ] **Step 5: Replace form rules while keeping batch required**

Replace:

```ts
const createRules: FormRules = {
  customer_name: [{ required: true, message: '请输入顾客名称', trigger: 'blur' }],
  production_batch_id: [{ required: true, message: '请选择相关批次', trigger: 'change' }],
  description: [{ required: true, message: '请填写投诉描述', trigger: 'blur' }],
};
```

with:

```ts
const createRules: FormRules = {
  customer_id: [{ required: true, message: '请选择顾客主数据', trigger: 'change' }],
  production_batch_id: [{ required: true, message: '请选择相关批次', trigger: 'change' }],
  description: [{ required: true, message: '请填写投诉描述', trigger: 'blur' }],
};
```

- [ ] **Step 6: Add customer loading helper**

Below `loadList()`, add:

```ts
async function loadCustomers() {
  customerLoading.value = true;
  try {
    const res = await externalPartyApi.getList('customer');
    customers.value = (res as unknown as ExternalParty[]).filter(
      (customer) => customer.status === 'active' && !customer.deleted_at,
    );
  } catch {
    ElMessage.error('加载顾客主数据失败');
  } finally {
    customerLoading.value = false;
  }
}
```

- [ ] **Step 7: Reset customer_id and load options when opening the dialog**

Replace:

```ts
function openCreateDialog() {
  createForm.customer_name = '';
  createForm.complaint_type = '';
  createForm.production_batch_id = '';
  createForm.description = '';
  createDialogVisible.value = true;
}
```

with:

```ts
async function openCreateDialog() {
  createForm.customer_id = '';
  createForm.complaint_type = '';
  createForm.production_batch_id = '';
  createForm.description = '';
  createDialogVisible.value = true;
  await loadCustomers();
}
```

- [ ] **Step 8: Submit customer_id instead of customer_name**

Replace:

```ts
      customer_name: createForm.customer_name,
```

with:

```ts
      customer_id: createForm.customer_id,
```

Do not send `customer_name` from the page.

## Task 8: Validate schema and builds

**Files:**
- No file changes.

- [ ] **Step 1: Validate Prisma schema**

```bash
(cd server && npx prisma validate --schema src/prisma/schema.prisma)
```

Expected: Prisma schema validates successfully.

- [ ] **Step 2: Run ExternalParty focused Jest**

```bash
(cd server && npm test -- external-party.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 3: Run CustomerComplaint focused Jest**

```bash
(cd server && npm test -- customer-complaint.service.spec.ts --runInBand)
```

Expected: PASS.

- [ ] **Step 4: Build the server**

```bash
npm run build:server
```

Expected: server workspace build completes with exit code 0.

- [ ] **Step 5: Build the client**

```bash
npm run build:client
```

Expected: client workspace build completes with exit code 0.

- [ ] **Step 6: Check the diff**

```bash
git diff --check
```

Expected: no whitespace errors.

## Task 9: Commit implementation

**Files:**
- All files modified in Tasks 1-7.

- [ ] **Step 1: Review the scoped diff**

```bash
git status --short
git diff -- server/src/prisma/schema.prisma server/src/modules/external-party server/src/modules/customer-complaint client/src/api/customer-complaint.ts client/src/views/customer-complaint/CustomerComplaintList.vue
```

Expected: diff only contains GAP-309 ExternalParty tenant scope and customer FK work with no unrelated refactors.

- [ ] **Step 2: Commit**

```bash
git add server/src/prisma/schema.prisma \
  server/src/prisma/migrations/20260502103000_add_customer_complaint_customer_id/migration.sql \
  server/src/modules/external-party/external-party.controller.ts \
  server/src/modules/external-party/external-party.service.ts \
  server/src/modules/external-party/external-party.service.spec.ts \
  server/src/modules/customer-complaint/dto/create-complaint.dto.ts \
  server/src/modules/customer-complaint/customer-complaint.service.ts \
  server/src/modules/customer-complaint/customer-complaint.service.spec.ts \
  client/src/api/customer-complaint.ts \
  client/src/views/customer-complaint/CustomerComplaintList.vue
git commit -m "fix: scope customer complaint customer master data"
```

Expected: commit succeeds and contains only implementation files listed above.
