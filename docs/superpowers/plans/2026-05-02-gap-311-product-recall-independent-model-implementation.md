# GAP-311 ProductRecall Independent Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout. Do not use `brainstorming`, `writing-plans`, or `grill-with-docs` while executing this implementation plan.

**Goal:** Build an independent `ProductRecall` model with state machine, affected production batches, customer notifications, traceability linkage, dynamic-form evidence migration, and a basic recall workbench.

**Architecture:** Add Prisma recall tables that reference existing `ProductionBatch`, `ExternalParty`, `Record`, `TraceabilitySnapshot`, and `CorrectiveAction` boundaries. Add a NestJS `ProductRecallModule` and wire traceability `recallAssessment` actions to create recall drafts. Add a Vue list/detail workbench and API adapter without changing the existing dynamic form engine.

**Tech Stack:** Prisma, NestJS, Jest, Vue 3, Element Plus, Vitest, npm workspaces.

---

## Superpower 与 grill-me 校准记录

- 已按 `brainstorming` 形成 spec：`docs/superpowers/specs/2026-05-02-gap-311-product-recall-independent-model-design.md`。
- 已按 `grill-with-docs` 对齐 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：召回是治理层对象，但追溯范围必须回到 `ProductionBatch -> BatchMaterialUsage -> MaterialBatch` 主链。
- 已按 `grill-me` 等价清单核对：不重复造 Product、Material、Customer、ProductionBatch、MaterialBatch、BatchMaterialUsage、InventoryMovement 事实源；不引入平行批次链路；历史动态表单只迁移为证据或草稿，不删除原 Record。
- 执行 agent 只允许使用 `superpowers:executing-plans`。
- 执行前必须运行：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

Expected: `pwd` is not `/Users/jiashenglin/Desktop/好玩的项目/noidear`; status contains only the execution branch state. If code differs from this plan in a way that changes model names, route names, or migration feasibility, stop and report before editing.

## Files

- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/<timestamp>_product_recall_independent_model/migration.sql`
- Create: `server/src/modules/product-recall/product-recall.module.ts`
- Create: `server/src/modules/product-recall/product-recall.controller.ts`
- Create: `server/src/modules/product-recall/product-recall.service.ts`
- Create: `server/src/modules/product-recall/product-recall.service.spec.ts`
- Create: `server/src/modules/product-recall/dto/create-product-recall.dto.ts`
- Create: `server/src/modules/product-recall/dto/query-product-recall.dto.ts`
- Create: `server/src/modules/product-recall/dto/transition-product-recall.dto.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/modules/traceability/traceability-linkage.service.ts`
- Modify: `server/src/modules/traceability/traceability.service.ts`
- Modify: `server/src/modules/traceability/traceability.module.ts`
- Modify: `server/src/modules/corrective-action/dto/create-capa.dto.ts`
- Modify: `client/src/router/index.ts`
- Create: `client/src/api/product-recall.ts`
- Create: `client/src/views/product-recall/ProductRecallList.vue`
- Create: `client/src/views/product-recall/ProductRecallDetail.vue`
- Create: `client/src/api/__tests__/product-recall.spec.ts`

## Task 1: Add Prisma recall schema

- [ ] **Step 1: Add recall models to `server/src/prisma/schema.prisma`**

Add these relation fields to existing models:

```prisma
model ProductionBatch {
  // existing fields remain unchanged
  product_recall_batches ProductRecallBatch[]
}

model ExternalParty {
  // existing fields remain unchanged
  product_recall_notifications ProductRecallNotification[]
}

model Record {
  // existing fields remain unchanged
  product_recall_evidence ProductRecallEvidence[]
}

model TraceabilitySnapshot {
  // existing fields remain unchanged
  productRecalls ProductRecall[] @relation("ProductRecallTraceabilitySnapshot")
}
```

Add these new models near `CustomerComplaint` and `TraceabilitySnapshot`:

```prisma
model ProductRecall {
  id                              String    @id @default(cuid())
  company_id                      String
  recall_no                       String
  title                           String
  reason                          String
  risk_level                      String    @default("medium")
  status                          String    @default("draft")
  source_complaint_id             String?
  source_query_ref                String?
  source_traceability_snapshot_id String?
  source_traceability_snapshot    TraceabilitySnapshot? @relation("ProductRecallTraceabilitySnapshot", fields: [source_traceability_snapshot_id], references: [id], onDelete: SetNull)
  requested_by                    String?
  requested_at                    DateTime  @default(now())
  reviewed_by                     String?
  reviewed_at                     DateTime?
  review_note                     String?
  completed_by                    String?
  completed_at                    DateTime?
  completion_summary              String?
  cancelled_at                    DateTime?
  cancel_reason                   String?
  created_at                      DateTime  @default(now())
  updated_at                      DateTime  @updatedAt

  batches       ProductRecallBatch[]
  notifications ProductRecallNotification[]
  evidence      ProductRecallEvidence[]

  @@unique([company_id, recall_no])
  @@index([company_id, status])
  @@index([company_id, source_complaint_id])
  @@index([source_traceability_snapshot_id])
  @@map("product_recalls")
}

model ProductRecallBatch {
  id                  String          @id @default(cuid())
  company_id          String
  recall_id           String
  recall              ProductRecall   @relation(fields: [recall_id], references: [id], onDelete: Cascade)
  production_batch_id String
  production_batch    ProductionBatch @relation(fields: [production_batch_id], references: [id], onDelete: Restrict)
  batch_number_snapshot String
  product_name_snapshot String
  affected_qty        Decimal?        @db.Decimal(14, 4)
  unit                String?
  disposition         String?         // quarantine, return, destroy, release
  status              String          @default("identified")
  created_at          DateTime        @default(now())
  updated_at          DateTime        @updatedAt

  @@unique([recall_id, production_batch_id])
  @@index([company_id, production_batch_id])
  @@map("product_recall_batches")
}

model ProductRecallNotification {
  id                   String         @id @default(cuid())
  company_id           String
  recall_id            String
  recall               ProductRecall  @relation(fields: [recall_id], references: [id], onDelete: Cascade)
  external_party_id    String?
  external_party       ExternalParty? @relation(fields: [external_party_id], references: [id], onDelete: SetNull)
  customer_name        String
  contact_name         String?
  contact_phone        String?
  notification_method  String         @default("phone")
  status               String         @default("pending")
  notified_at          DateTime?
  response_summary     String?
  created_at           DateTime       @default(now())
  updated_at           DateTime       @updatedAt

  @@index([company_id, recall_id])
  @@index([external_party_id])
  @@map("product_recall_notifications")
}

model ProductRecallEvidence {
  id                 String        @id @default(cuid())
  company_id         String
  recall_id          String
  recall             ProductRecall @relation(fields: [recall_id], references: [id], onDelete: Cascade)
  evidence_type      String
  record_id          String?
  record             Record?       @relation(fields: [record_id], references: [id], onDelete: SetNull)
  traceability_snapshot_id String?
  external_ref       String?
  title              String
  notes              String?
  created_at         DateTime      @default(now())

  @@index([company_id, recall_id])
  @@index([record_id])
  @@map("product_recall_evidence")
}
```

- [ ] **Step 2: Generate migration**

```bash
npm run prisma:migrate --workspace server -- --name product_recall_independent_model
```

Expected: Prisma creates one migration under `server/src/prisma/migrations/*_product_recall_independent_model/`.

- [ ] **Step 3: Validate schema**

```bash
npm run prisma:generate --workspace server
```

Expected: PASS and Prisma Client generation completes.

## Task 2: Add ProductRecall DTOs and service tests

- [ ] **Step 1: Create DTOs**

Create `server/src/modules/product-recall/dto/create-product-recall.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CreateProductRecallBatchDto {
  @IsString()
  @IsNotEmpty()
  production_batch_id!: string;

  @IsOptional()
  affected_qty?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateProductRecallNotificationDto {
  @IsOptional()
  @IsString()
  external_party_id?: string;

  @IsString()
  @IsNotEmpty()
  customer_name!: string;

  @IsOptional()
  @IsString()
  contact_name?: string;

  @IsOptional()
  @IsString()
  contact_phone?: string;

  @IsOptional()
  @IsEnum(['phone', 'email', 'letter', 'onsite'])
  notification_method?: 'phone' | 'email' | 'letter' | 'onsite';
}

export class CreateProductRecallDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  risk_level?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsString()
  source_complaint_id?: string;

  @IsOptional()
  @IsString()
  source_query_ref?: string;

  @IsOptional()
  @IsString()
  source_traceability_snapshot_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRecallBatchDto)
  batches?: CreateProductRecallBatchDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductRecallNotificationDto)
  notifications?: CreateProductRecallNotificationDto[];
}
```

Create `server/src/modules/product-recall/dto/query-product-recall.dto.ts`:

```ts
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryProductRecallDto {
  @IsOptional()
  @IsEnum(['draft', 'pending_review', 'approved', 'notified', 'in_progress', 'completed', 'rejected', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  risk_level?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsString()
  source_complaint_id?: string;
}
```

Create `server/src/modules/product-recall/dto/transition-product-recall.dto.ts`:

```ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RecallReviewDto {
  @IsOptional()
  @IsString()
  review_note?: string;
}

export class RecallCompleteDto {
  @IsString()
  @IsNotEmpty()
  completion_summary!: string;
}

export class RecallCancelDto {
  @IsString()
  @IsNotEmpty()
  cancel_reason!: string;
}

export class MarkNotificationSentDto {
  @IsOptional()
  @IsString()
  response_summary?: string;
}
```

- [ ] **Step 2: Create failing service tests**

Create `server/src/modules/product-recall/product-recall.service.spec.ts`:

```ts
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductRecallService } from './product-recall.service';

describe('ProductRecallService', () => {
  const prisma: any = {
    productRecall: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    productRecallBatch: { create: jest.fn() },
    productRecallNotification: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    productionBatch: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new ProductRecallService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('creates recall draft with production batch snapshots', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.productionBatch.findFirst.mockResolvedValue({
      id: 'batch-1',
      batchNumber: 'PB-001',
      productName: '蛋糕',
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });

    await service.create(
      {
        title: '批次召回',
        reason: '客户投诉',
        batches: [{ production_batch_id: 'batch-1', affected_qty: 10, unit: '箱' }],
      },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.productRecall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        company_id: 'company-1',
        recall_no: 'RC-2026-0001',
        status: 'draft',
      }),
    }));
    expect(prisma.productRecallBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batch_number_snapshot: 'PB-001',
        product_name_snapshot: '蛋糕',
      }),
    }));
  });

  it('rejects invalid state transition', async () => {
    prisma.productRecall.findFirst.mockResolvedValue({ id: 'recall-1', status: 'completed' });

    await expect(service.submit('recall-1', { id: 'user-1', companyId: 'company-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks notification sent and advances approved recall to notified', async () => {
    prisma.productRecallNotification.findFirst.mockResolvedValue({ id: 'n1', recall_id: 'recall-1', status: 'pending' });
    prisma.productRecall.findFirst.mockResolvedValue({ id: 'recall-1', status: 'approved' });
    prisma.productRecallNotification.update.mockResolvedValue({ id: 'n1', status: 'sent' });
    prisma.productRecall.update.mockResolvedValue({ id: 'recall-1', status: 'notified' });

    await service.markNotificationSent('recall-1', 'n1', { response_summary: '已通知' }, { id: 'user-1', companyId: 'company-1' });

    expect(prisma.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'notified' }),
    }));
  });

  it('throws when recall is missing', async () => {
    prisma.productRecall.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 3: Run failing test**

```bash
npm run test --workspace server -- product-recall.service --runInBand
```

Expected: FAIL because `ProductRecallService` does not exist yet.

## Task 3: Implement ProductRecall service, controller, and module

- [ ] **Step 1: Create service**

Create `server/src/modules/product-recall/product-recall.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductRecallDto, CreateProductRecallNotificationDto } from './dto/create-product-recall.dto';
import { QueryProductRecallDto } from './dto/query-product-recall.dto';
import { MarkNotificationSentDto, RecallCancelDto, RecallCompleteDto, RecallReviewDto } from './dto/transition-product-recall.dto';

type CurrentUser = { id: string; companyId: string };

const allowedTransitions: Record<string, string[]> = {
  draft: ['pending_review', 'cancelled'],
  pending_review: ['approved', 'rejected'],
  approved: ['notified', 'cancelled'],
  notified: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

@Injectable()
export class ProductRecallService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductRecallDto, currentUser: CurrentUser) {
    const companyId = currentUser.companyId;
    const count = await this.prisma.productRecall.count({ where: { company_id: companyId } });
    const recall_no = `RC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const recall = await tx.productRecall.create({
        data: {
          company_id: companyId,
          recall_no,
          title: dto.title,
          reason: dto.reason,
          risk_level: dto.risk_level ?? 'medium',
          status: 'draft',
          source_complaint_id: dto.source_complaint_id,
          source_query_ref: dto.source_query_ref,
          source_traceability_snapshot_id: dto.source_traceability_snapshot_id,
          requested_by: currentUser.id,
        },
      });

      for (const batch of dto.batches ?? []) {
        const productionBatch = await tx.productionBatch.findFirst({
          where: { id: batch.production_batch_id },
          select: { id: true, batchNumber: true, productName: true },
        });
        if (!productionBatch) throw new BadRequestException(`生产批次不存在: ${batch.production_batch_id}`);

        await tx.productRecallBatch.create({
          data: {
            company_id: companyId,
            recall_id: recall.id,
            production_batch_id: productionBatch.id,
            batch_number_snapshot: productionBatch.batchNumber,
            product_name_snapshot: productionBatch.productName,
            affected_qty: batch.affected_qty,
            unit: batch.unit,
          },
        });
      }

      for (const notification of dto.notifications ?? []) {
        await this.createNotificationRow(tx, recall.id, notification, companyId);
      }

      return recall;
    });
  }

  async findAll(companyId: string, query: QueryProductRecallDto) {
    return this.prisma.productRecall.findMany({
      where: {
        company_id: companyId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.risk_level ? { risk_level: query.risk_level } : {}),
        ...(query.source_complaint_id ? { source_complaint_id: query.source_complaint_id } : {}),
        ...(query.production_batch_id
          ? { batches: { some: { production_batch_id: query.production_batch_id } } }
          : {}),
      },
      include: { batches: true, notifications: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string, companyId: string) {
    const recall = await this.prisma.productRecall.findFirst({
      where: { id, company_id: companyId },
      include: {
        batches: true,
        notifications: true,
        evidence: true,
      },
    });
    if (!recall) throw new NotFoundException('召回记录不存在');
    return recall;
  }

  async submit(id: string, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'pending_review', {});
  }

  async approve(id: string, dto: RecallReviewDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'approved', {
      reviewed_by: currentUser.id,
      reviewed_at: new Date(),
      review_note: dto.review_note,
    });
  }

  async reject(id: string, dto: RecallReviewDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'rejected', {
      reviewed_by: currentUser.id,
      reviewed_at: new Date(),
      review_note: dto.review_note,
    });
  }

  async complete(id: string, dto: RecallCompleteDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'completed', {
      completed_by: currentUser.id,
      completed_at: new Date(),
      completion_summary: dto.completion_summary,
    });
  }

  async cancel(id: string, dto: RecallCancelDto, currentUser: CurrentUser) {
    return this.transition(id, currentUser, 'cancelled', {
      cancelled_at: new Date(),
      cancel_reason: dto.cancel_reason,
    });
  }

  async createNotification(id: string, dto: CreateProductRecallNotificationDto, currentUser: CurrentUser) {
    await this.findOne(id, currentUser.companyId);
    return this.createNotificationRow(this.prisma, id, dto, currentUser.companyId);
  }

  async markNotificationSent(id: string, notificationId: string, dto: MarkNotificationSentDto, currentUser: CurrentUser) {
    const notification = await this.prisma.productRecallNotification.findFirst({
      where: { id: notificationId, recall_id: id, company_id: currentUser.companyId },
    });
    if (!notification) throw new NotFoundException('召回通知不存在');

    const recall = await this.findOne(id, currentUser.companyId);
    await this.prisma.productRecallNotification.update({
      where: { id: notificationId },
      data: {
        status: 'sent',
        notified_at: new Date(),
        response_summary: dto.response_summary,
      },
    });

    if (recall.status === 'approved') {
      return this.prisma.productRecall.update({
        where: { id },
        data: { status: 'notified' },
      });
    }
    return this.findOne(id, currentUser.companyId);
  }

  private async transition(id: string, currentUser: CurrentUser, nextStatus: string, data: Record<string, unknown>) {
    const recall = await this.findOne(id, currentUser.companyId);
    if (!allowedTransitions[recall.status]?.includes(nextStatus)) {
      throw new BadRequestException(`召回状态不允许从 ${recall.status} 流转到 ${nextStatus}`);
    }
    return this.prisma.productRecall.update({
      where: { id },
      data: { ...data, status: nextStatus },
    });
  }

  private createNotificationRow(tx: any, recallId: string, dto: CreateProductRecallNotificationDto, companyId: string) {
    return tx.productRecallNotification.create({
      data: {
        company_id: companyId,
        recall_id: recallId,
        external_party_id: dto.external_party_id,
        customer_name: dto.customer_name,
        contact_name: dto.contact_name,
        contact_phone: dto.contact_phone,
        notification_method: dto.notification_method ?? 'phone',
      },
    });
  }
}
```

- [ ] **Step 2: Create controller**

Create `server/src/modules/product-recall/product-recall.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ProductRecallService } from './product-recall.service';
import { CreateProductRecallDto, CreateProductRecallNotificationDto } from './dto/create-product-recall.dto';
import { QueryProductRecallDto } from './dto/query-product-recall.dto';
import { MarkNotificationSentDto, RecallCancelDto, RecallCompleteDto, RecallReviewDto } from './dto/transition-product-recall.dto';

@Controller('product-recalls')
@UseGuards(JwtAuthGuard)
export class ProductRecallController {
  constructor(private readonly service: ProductRecallService) {}

  @Post()
  create(@Body() dto: CreateProductRecallDto, @Request() req: AuthenticatedRequest) {
    return this.service.create(dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Get()
  findAll(@Query() query: QueryProductRecallDto, @Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.service.submit(id, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: RecallReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.approve(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RecallReviewDto, @Request() req: AuthenticatedRequest) {
    return this.service.reject(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Body() dto: RecallCompleteDto, @Request() req: AuthenticatedRequest) {
    return this.service.complete(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: RecallCancelDto, @Request() req: AuthenticatedRequest) {
    return this.service.cancel(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/notifications')
  createNotification(@Param('id') id: string, @Body() dto: CreateProductRecallNotificationDto, @Request() req: AuthenticatedRequest) {
    return this.service.createNotification(id, dto, { id: req.user.id, companyId: req.user.companyId });
  }

  @Post(':id/notifications/:notificationId/mark-sent')
  markNotificationSent(
    @Param('id') id: string,
    @Param('notificationId') notificationId: string,
    @Body() dto: MarkNotificationSentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.markNotificationSent(id, notificationId, dto, { id: req.user.id, companyId: req.user.companyId });
  }
}
```

- [ ] **Step 3: Create module and register in app**

Create `server/src/modules/product-recall/product-recall.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductRecallController } from './product-recall.controller';
import { ProductRecallService } from './product-recall.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductRecallController],
  providers: [ProductRecallService],
  exports: [ProductRecallService],
})
export class ProductRecallModule {}
```

In `server/src/app.module.ts`, add:

```ts
import { ProductRecallModule } from './modules/product-recall/product-recall.module';
```

and include `ProductRecallModule` in the `imports` array next to `CustomerComplaintModule`.

- [ ] **Step 4: Run targeted service test**

```bash
npm run test --workspace server -- product-recall.service --runInBand
```

Expected: PASS.

## Task 4: Wire traceability recallAssessment to ProductRecall

- [ ] **Step 1: Add failing linkage test**

In `server/src/modules/traceability/traceability-linkage.service.spec.ts`, add a test that constructs `TraceabilityLinkageService` with a mocked `ProductRecallService` and expects `recallAssessment` to create a recall draft:

```ts
it('creates ProductRecall draft for recallAssessment actions', async () => {
  const productRecallService = {
    create: jest.fn().mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' }),
  };
  const service = new TraceabilityLinkageService(productRecallService as any);

  const result = await service.create(
    { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz', note: '高风险批次' },
    { id: 'user-1', companyId: 'company-1' },
  );

  expect(productRecallService.create).toHaveBeenCalledWith(expect.objectContaining({
    title: '追溯召回评估',
    reason: '高风险批次',
    source_query_ref: 'hash-xyz',
  }), { id: 'user-1', companyId: 'company-1' });
  expect(result.productRecall).toEqual({ id: 'recall-1', recall_no: 'RC-2026-0001' });
});
```

- [ ] **Step 2: Run failing linkage test**

```bash
npm run test --workspace server -- traceability-linkage.service --runInBand
```

Expected: FAIL because `TraceabilityLinkageService` does not inject `ProductRecallService`.

- [ ] **Step 3: Modify `TraceabilityLinkageService`**

Update `server/src/modules/traceability/traceability-linkage.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ProductRecallService } from '../product-recall/product-recall.service';
import { CreateTraceabilityActionDto as CreateTraceabilityLinkageDto } from './dto/create-traceability-linkage.dto';

@Injectable()
export class TraceabilityLinkageService {
  constructor(private readonly productRecallService: ProductRecallService) {}

  async create(dto: CreateTraceabilityLinkageDto, currentUser: any) {
    const status = dto.actionType === 'recallAssessment' ? 'pendingReview' : 'created';
    let productRecall: { id: string; recall_no: string } | null = null;

    if (dto.actionType === 'recallAssessment') {
      productRecall = await this.productRecallService.create(
        {
          title: '追溯召回评估',
          reason: dto.note ?? '追溯查询触发召回评估',
          source_query_ref: dto.sourceQueryRef,
          risk_level: 'high',
        },
        { id: currentUser?.id ?? 'system', companyId: currentUser?.companyId ?? '1' },
      );
    }

    return {
      actionType: dto.actionType,
      sourceQueryRef: dto.sourceQueryRef,
      requestedBy: currentUser?.id ?? 'system',
      note: dto.note ?? null,
      status,
      productRecall,
      writeback: {
        sourceQueryRef: dto.sourceQueryRef,
        linkedAt: new Date().toISOString(),
      },
    };
  }
}
```

- [ ] **Step 4: Add failing TraceabilityService delegation test**

In the existing traceability service test file, add a focused assertion for the public `/traceability/actions` path. If the project branch has no `traceability.service.spec.ts`, create `server/src/modules/traceability/traceability.service.spec.ts` with this test:

```ts
import { TraceabilityService } from './traceability.service';

describe('TraceabilityService recall actions', () => {
  it('delegates recallAssessment actions to TraceabilityLinkageService', async () => {
    const linkageService = {
      create: jest.fn().mockResolvedValue({
        actionType: 'recallAssessment',
        status: 'pendingReview',
        productRecall: { id: 'recall-1', recall_no: 'RC-2026-0001' },
      }),
    };
    const service = new TraceabilityService({} as any, linkageService as any);

    const result = await service.createAction(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' } as any,
    );

    expect(linkageService.create).toHaveBeenCalledWith(
      { actionType: 'recallAssessment', sourceQueryRef: 'hash-xyz' },
      { id: 'user-1', companyId: 'company-1' },
    );
    expect(result.productRecall).toEqual({ id: 'recall-1', recall_no: 'RC-2026-0001' });
  });
});
```

- [ ] **Step 5: Run failing TraceabilityService test**

```bash
npm run test --workspace server -- traceability.service --runInBand
```

Expected: FAIL because `TraceabilityService.createAction` still returns an in-memory action and does not delegate to `TraceabilityLinkageService`.

- [ ] **Step 6: Modify `TraceabilityService`**

In `server/src/modules/traceability/traceability.service.ts`, import `TraceabilityLinkageService`:

```ts
import { TraceabilityLinkageService } from './traceability-linkage.service';
```

Update `TraceCurrentUser` to include `companyId`:

```ts
interface TraceCurrentUser {
  id?: string;
  companyId?: string;
  department?: string;
  scenarioPermissions?: string[];
}
```

Update the constructor:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly linkageService: TraceabilityLinkageService,
) {}
```

Replace `createAction` with:

```ts
async createAction(dto: TraceActionDto, currentUser: TraceCurrentUser) {
  if (dto.actionType === 'recallAssessment') {
    return this.linkageService.create(dto as any, currentUser);
  }

  return {
    actionId: `action:${Date.now()}`,
    actionType: dto.actionType,
    status: 'created' as const,
    sourceQueryRef: dto.sourceQueryRef,
    createdAt: new Date().toISOString(),
    requestedBy: currentUser?.id ?? 'system',
    writeback: {
      sourceNodeIds: dto.sourceNodeIds ?? [],
      sourceRiskIds: dto.sourceRiskIds ?? [],
    },
  };
}
```

- [ ] **Step 7: Register module dependency**

In `server/src/modules/traceability/traceability.module.ts`, import `ProductRecallModule` and add it to `imports`.

- [ ] **Step 8: Run traceability tests**

```bash
npm run test --workspace server -- traceability-linkage.service traceability.service --runInBand
npm run traceability:test --workspace server
```

Expected: PASS. If GAP-306 provider registration is not present on the execution branch, stop and report that GAP-311 depends on GAP-306.

## Task 5: Allow CAPA trigger type for recalls

- [ ] **Step 1: Update CAPA DTO enum**

In `server/src/modules/corrective-action/dto/create-capa.dto.ts`, add `product_recall` to the allowed `trigger_type` enum or validation list.

If the file uses `@IsIn`, the final list must include:

```ts
['non_conformance', 'customer_complaint', 'internal_audit', 'product_recall', 'other']
```

- [ ] **Step 2: Add focused DTO or service test**

If `corrective-action.service.spec.ts` already validates trigger types, extend it for `product_recall`. If it does not, add a minimal DTO validation test in `server/src/modules/corrective-action/corrective-action.service.spec.ts` that creates a CAPA payload with:

```ts
trigger_type: 'product_recall',
trigger_id: 'recall-1',
description: '召回后纠正措施'
```

- [ ] **Step 3: Run CAPA focused tests**

```bash
npm run test --workspace server -- corrective-action --runInBand
```

Expected: PASS.

## Task 6: Add client API adapter and contract tests

- [ ] **Step 1: Create `client/src/api/product-recall.ts`**

```ts
import request from './request';

export type ProductRecallStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'notified'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ProductRecallBatch {
  id: string;
  production_batch_id: string;
  batch_number_snapshot: string;
  product_name_snapshot: string;
  affected_qty: string | null;
  unit: string | null;
  status: string;
}

export interface ProductRecallNotification {
  id: string;
  customer_name: string;
  notification_method: string;
  status: 'pending' | 'sent' | 'failed';
  notified_at: string | null;
  response_summary: string | null;
}

export interface ProductRecall {
  id: string;
  company_id: string;
  recall_no: string;
  title: string;
  reason: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: ProductRecallStatus;
  source_complaint_id: string | null;
  source_query_ref: string | null;
  requested_at: string;
  completed_at: string | null;
  batches?: ProductRecallBatch[];
  notifications?: ProductRecallNotification[];
}

export interface CreateProductRecallPayload {
  title: string;
  reason: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  source_complaint_id?: string;
  source_query_ref?: string;
  batches?: Array<{ production_batch_id: string; affected_qty?: number; unit?: string }>;
  notifications?: Array<{
    external_party_id?: string;
    customer_name: string;
    contact_name?: string;
    contact_phone?: string;
    notification_method?: 'phone' | 'email' | 'letter' | 'onsite';
  }>;
}

const productRecallApi = {
  getList(params?: { status?: ProductRecallStatus; risk_level?: string; production_batch_id?: string; source_complaint_id?: string }) {
    return request.get<ProductRecall[]>('/product-recalls', { params });
  },
  getDetail(id: string) {
    return request.get<ProductRecall>(`/product-recalls/${id}`);
  },
  create(payload: CreateProductRecallPayload) {
    return request.post<ProductRecall>('/product-recalls', payload);
  },
  submit(id: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/submit`);
  },
  approve(id: string, review_note?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/approve`, { review_note });
  },
  reject(id: string, review_note?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/reject`, { review_note });
  },
  complete(id: string, completion_summary: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/complete`, { completion_summary });
  },
  cancel(id: string, cancel_reason: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/cancel`, { cancel_reason });
  },
  markNotificationSent(id: string, notificationId: string, response_summary?: string) {
    return request.post<ProductRecall>(`/product-recalls/${id}/notifications/${notificationId}/mark-sent`, { response_summary });
  },
};

export default productRecallApi;
```

- [ ] **Step 2: Add client API test**

Create `client/src/api/__tests__/product-recall.spec.ts` following the existing API test style. Assert the adapter calls:

```ts
'/product-recalls'
`/product-recalls/${id}`
`/product-recalls/${id}/submit`
`/product-recalls/${id}/notifications/${notificationId}/mark-sent`
```

- [ ] **Step 3: Run client API test**

```bash
npm run test --workspace client -- product-recall
```

Expected: PASS.

## Task 7: Add recall list and detail pages

- [ ] **Step 1: Create `ProductRecallList.vue`**

Create `client/src/views/product-recall/ProductRecallList.vue` with an Element Plus table that loads `productRecallApi.getList()`, displays `recall_no`, `title`, `status`, `risk_level`, batch count, notification progress, and routes to detail on row action.

Use this status map:

```ts
const statusMap: Record<string, string> = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已批准',
  notified: '已通知',
  in_progress: '执行中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
};
```

- [ ] **Step 2: Create `ProductRecallDetail.vue`**

Create `client/src/views/product-recall/ProductRecallDetail.vue` with:

- header showing `recall_no`, `title`, status tag, risk tag
- action buttons for submit, approve, reject, complete, cancel based on current status
- table for `batches`
- table for `notifications`, with `mark sent` button for pending notifications
- evidence section showing evidence rows if returned by backend

Keep the UI operational and compact; do not add marketing or explanatory hero sections.

- [ ] **Step 3: Register routes**

In `client/src/router/index.ts`, add routes near customer complaints:

```ts
{
  path: 'product-recalls',
  name: 'ProductRecallList',
  component: () => import('@/views/product-recall/ProductRecallList.vue'),
  meta: { title: '产品召回' },
},
{
  path: 'product-recalls/:id',
  name: 'ProductRecallDetail',
  component: () => import('@/views/product-recall/ProductRecallDetail.vue'),
  meta: { title: '召回详情' },
},
```

- [ ] **Step 4: Run client build**

```bash
npm run build --workspace client
```

Expected: PASS.

## Task 8: Preserve dynamic form history as recall evidence

- [ ] **Step 1: Create migration script**

Create `server/scripts/migrate-product-recall-records.ts`. It must:

1. Query `Record` rows whose template code is one of `GRSS-YX-JL-02`, `GRSS-YX-JL-03`, `GRSS-YX-JL-04`, `GRSS-YX-JL-05`.
2. For each row, find or create a `ProductRecall` draft using `record.number` as part of the title.
3. Create `ProductRecallEvidence` with `evidence_type = 'record'`, `record_id = record.id`, and title from template name.
4. If `record.productionBatchId` exists, create `ProductRecallBatch` after reading `ProductionBatch.batchNumber` and `productName`.
5. Never delete or mutate the original `Record`.

- [ ] **Step 2: Add script command**

In `server/package.json`, add:

```json
"recall:migrate-records": "ts-node scripts/migrate-product-recall-records.ts"
```

- [ ] **Step 3: Run script in dry database only if local DB is available**

```bash
npm run recall:migrate-records --workspace server
```

Expected: Creates recall drafts/evidence for historical recall records. If local DB is unavailable, do not fake success; report that migration script was added but not executed locally.

## Task 9: Run verification

- [ ] **Step 1: Run server focused tests**

```bash
npm run test --workspace server -- product-recall traceability-linkage corrective-action --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run traceability focused verification**

```bash
npm run traceability:test --workspace server
```

Expected: PASS.

- [ ] **Step 3: Run builds**

```bash
npm run build:server
npm run build:client
```

Expected: both PASS.

- [ ] **Step 4: Run Prisma validation**

```bash
npm run prisma:generate --workspace server
```

Expected: PASS.

- [ ] **Step 5: Run repository diff check**

```bash
git diff --check
```

Expected: no whitespace errors.

## Task 10: Commit and PR

- [ ] **Step 1: Inspect changed files**

```bash
git status --short
```

Expected: only files listed in this plan plus generated Prisma migration files changed.

- [ ] **Step 2: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations server/src/modules/product-recall server/src/modules/traceability server/src/modules/corrective-action server/src/app.module.ts server/scripts/migrate-product-recall-records.ts server/package.json client/src/api/product-recall.ts client/src/api/__tests__/product-recall.spec.ts client/src/router/index.ts client/src/views/product-recall
git commit -m "feat: add product recall model"
```

- [ ] **Step 3: Push and open PR**

Use branch `codex/gap-311-product-recall-independent-model`. PR title must include `GAP-311`.

## Stop Conditions

- Stop if `pwd` is the main checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear`.
- Stop if GAP-306 service registration is absent and `TraceabilityLinkageService` cannot inject new dependencies cleanly.
- Stop if `schema.prisma` already contains differently named recall models; report the existing names instead of creating duplicates.
- Stop if migration would require deleting historical `Record` rows.
- Stop if tests require `pnpm`; this repository uses npm workspaces for this plan.
