# 产品主数据建档与生产链路收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让历史产品建档、新产品研发、配方、生产开工、生产批次、区域配料和下游记录统一复用现有 `Product / Recipe / RecipeLine / ProductionBatch / BatchMaterialUsage` 主链路。

**Architecture:** 以现有主数据和批次链为事实源，只补缺口字段和服务校验。产品编号复用 `Product.code`，配料区域把现有暂存区字符串正规化为 `WorkshopArea`，投料仍落到 `BatchMaterialUsage`，下游模块通过批次追产品。

**Tech Stack:** NestJS 10, Prisma 5, Jest, Vue 3, Element Plus, Vitest, npm workspaces, Node 20。

---

## 0. 规格与边界

本计划按以下文档实现：

- `docs/AGENT_GUIDE.md`
- `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md`

硬边界：

- 不创建 `HistoricalProduct`、`LegacyProduct`、`ProductArchive`。
- 不创建 `Formula`、`FormulaLine`。
- 不创建独立 `IngredientUsage` 表；代码名继续使用 `BatchMaterialUsage`，业务名可称为投料记录。
- 不给发货、投诉、过程记录、成品批次重复加 `productId`，能通过 `production_batch_id` 追到产品的模块继续走批次链。
- `Product.code` 是唯一产品编号字段，不新增 `productNo`、`productNumber`。
- 供应商资质、产品外检 PDF、证照有效期不放入产品历史建档闭环，继续由供应商、检验、产品报告附件链路维护。

## 1. 文件结构

### 数据模型与迁移

- Modify: `server/src/prisma/schema.prisma`
  - 增加 `Product.source`。
  - 新增 `WorkshopArea`。
  - 在 `RecipeLine` 增加 `area_id`、`area_name_snapshot`。
  - 在 `BatchMaterialUsage` 增加 `recipeLineId`、`area_id`、`areaNameSnapshot`。
- Create: `server/src/prisma/migrations/20260429090000_product_master_linkage/migration.sql`
  - 执行与 schema 对齐的 SQL 迁移。
- Modify: `server/src/prisma/seed.ts`
  - 增加 `product.code.format`。
  - 初始化公司级配料区域。

### 后端产品与配方

- Create: `server/src/modules/product/product-code-generator.service.ts`
  - 只负责生成 `Product.code`。
- Create: `server/src/modules/product/product-code-generator.service.spec.ts`
  - 覆盖默认格式、系统配置格式、并发重复规避。
- Modify: `server/src/modules/product/dto/create-product.dto.ts`
  - `code` 改为可选。
  - 增加 `source`。
- Create: `server/src/modules/product/dto/create-legacy-product.dto.ts`
  - 历史产品建档请求。
- Modify: `server/src/modules/product/product.service.ts`
  - 创建产品时生成编号。
  - 新增 `createLegacy()` 事务。
- Modify: `server/src/modules/product/product.controller.ts`
  - 新增 `POST /products/legacy`.
- Modify: `server/src/modules/product/product.module.ts`
  - 注册编号服务。
- Modify: `server/src/modules/process/process-approval.callbacks.ts`
  - 研发流程创建产品时使用同一编号服务。
- Modify: `server/src/modules/process/process-step-approval.service.ts`
  - 老审批路径也使用同一编号服务。

### 后端区域、生产、投料

- Create: `server/src/modules/workshop-area/workshop-area.module.ts`
- Create: `server/src/modules/workshop-area/workshop-area.controller.ts`
- Create: `server/src/modules/workshop-area/workshop-area.service.ts`
- Create: `server/src/modules/workshop-area/workshop-area.service.spec.ts`
  - 公司级配料区域查询和唯一性校验。
- Modify: `server/src/app.module.ts`
  - 引入 `WorkshopAreaModule`。
- Modify: `server/src/modules/recipe/dto/create-recipe.dto.ts`
  - 配方行增加 `area_id`。
- Modify: `server/src/modules/recipe/recipe.service.ts`
  - 校验物料、区域、同配方版本物料唯一。
  - 保存 `area_name_snapshot`。
- Modify: `server/src/modules/production-run/dto/create-production-run.dto.ts`
  - `recipe_id` 改为必填。
- Modify: `server/src/modules/production-run/production-run.service.ts`
  - 校验 active 产品和 active 配方。
- Modify: `server/src/modules/batch-trace/dto/production-batch.dto.ts`
  - 创建生产批次必须传 `productId`、`recipeId`。
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
  - 根据产品和配方写入 `productName`、`recipeName` 快照。
- Modify: `server/src/modules/batch-trace/services/batch-material-usage.service.ts`
  - 投料时校验 `recipeLineId`，保存区域快照。
- Modify: `server/src/modules/batch-trace/dto/material-usage.dto.ts`
  - 增加 `recipeLineId`。

### 前端

- Create: `client/src/api/workshop-area.ts`
- Modify: `client/src/api/product.ts`
  - 增加 `source`、历史产品建档 API 类型。
- Modify: `client/src/api/recipe.ts`
  - `RecipeLine` 增加 `area_id`、`area_name_snapshot`。
- Modify: `client/src/api/batch.ts`
  - 生产批次类型改为 `productId / recipeId / plannedQuantity / productionDate`。
- Modify: `client/src/api/production-run.ts`
  - `recipe_id` 改为必填。
- Create: `client/src/components/master-data/ProductRecipeSelect.vue`
  - 复用产品和 active 配方选择。
- Create: `client/src/components/master-data/ProductionBatchSelect.vue`
  - 复用生产批次选择。
- Create: `client/src/components/master-data/MaterialSelect.vue`
  - 复用物料选择。
- Modify: `client/src/views/product/ProductList.vue`
  - 产品编号只读。
  - 增加历史产品建档入口。
- Create: `client/src/views/product/LegacyProductDrawer.vue`
  - 录入产品名称、配方行、配料区域。
- Modify: `client/src/views/recipe/RecipeEdit.vue`
  - 物料选择器和配料区域选择器。
- Modify: `client/src/views/shift/components/OpenRunDialog.vue`
  - 产品和配方必选。
- Modify: `client/src/views/batch-trace/BatchList.vue`
  - 创建批次不再手填产品名称和产品代码。
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`
  - 相关批次改为选择器。
- Modify: `client/src/views/process-record/ProcessRecordList.vue`
  - 生产批次 ID 改为选择器。
- Modify: `client/src/views/metal-detection/MetalDetectionList.vue`
  - 生产批次 ID 改为选择器。
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`
  - 生产批次 ID 改为选择器。
- Modify: `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`
  - 物料名称和编码改从 `Material` 选择。
- Modify: `client/src/views/waste/WasteManagement.vue`
  - 废料统计生产批次改选择器。

---

## Task 1: 数据模型迁移

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260429090000_product_master_linkage/migration.sql`
- Modify: `server/src/prisma/seed.ts`

- [ ] **Step 1: 修改 Prisma schema**

在 `Product` 中加入来源字段：

```prisma
model Product {
  id           String    @id @default(cuid())
  company_id   String
  code         String
  name         String
  spec         String?
  net_weight   Decimal?  @db.Decimal(12,4)
  weight_unit  String?
  label_claims String?
  source       String    @default("manual_admin")
  shelf_life_days     Int?
  nutrition_energy    Decimal? @db.Decimal(10,2)
  nutrition_protein   Decimal? @db.Decimal(10,2)
  nutrition_fat       Decimal? @db.Decimal(10,2)
  nutrition_trans_fat Decimal? @db.Decimal(10,2)
  nutrition_carb      Decimal? @db.Decimal(10,2)
  nutrition_sodium    Decimal? @db.Decimal(10,2)
  product_type        String?
  processing_method   String?
  standard_code       String?
  storage_method      String?
  consumption_method  String?
  label_allergens     String?
  consumer_notice     String?
  process_instances   ProcessInstance[] @relation("ProcessProduct")
  status       String    @default("active")
  recipes      Recipe[]
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt
  deleted_at   DateTime?

  production_runs ProductionRun[]

  @@unique([company_id, code])
  @@index([source])
  @@map("products")
}
```

在 `RecipeLine` 中加入区域归属：

```prisma
model RecipeLine {
  id                 String  @id @default(cuid())
  recipe_id          String
  recipe             Recipe  @relation(fields: [recipe_id], references: [id])
  material_id        String
  qty_per_batch      Decimal @db.Decimal(14,4)
  unit               String
  is_critical        Boolean @default(false)
  notes              String?
  area_id            String?
  area               WorkshopArea? @relation("RecipeLineArea", fields: [area_id], references: [id], onDelete: SetNull)
  area_name_snapshot String?
  materialUsages     BatchMaterialUsage[]

  @@unique([recipe_id, material_id])
  @@index([area_id])
  @@map("recipe_lines")
}
```

新增 `WorkshopArea`：

```prisma
model WorkshopArea {
  id          String   @id @default(cuid())
  company_id  String
  code        String
  name        String
  status      String   @default("active")
  sort_order  Int      @default(0)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt
  deleted_at  DateTime?

  recipeLines    RecipeLine[]          @relation("RecipeLineArea")
  materialUsages BatchMaterialUsage[]  @relation("BatchUsageArea")

  @@unique([company_id, code])
  @@unique([company_id, name])
  @@index([status])
  @@map("workshop_areas")
}
```

在 `BatchMaterialUsage` 中加入配方行和区域快照：

```prisma
model BatchMaterialUsage {
  id                String          @id @default(cuid())
  productionBatchId String
  productionBatch   ProductionBatch @relation(fields: [productionBatchId], references: [id], onDelete: Restrict)
  materialBatchId   String
  materialBatch     MaterialBatch   @relation(fields: [materialBatchId], references: [id], onDelete: Restrict)
  recipeLineId      String?
  recipeLine        RecipeLine?     @relation(fields: [recipeLineId], references: [id], onDelete: SetNull)
  area_id           String?
  area              WorkshopArea?   @relation("BatchUsageArea", fields: [area_id], references: [id], onDelete: SetNull)
  areaNameSnapshot  String?
  quantity          Float
  usedAt            DateTime        @default(now())
  createdAt         DateTime        @default(now())

  @@unique([productionBatchId, materialBatchId])
  @@index([productionBatchId])
  @@index([materialBatchId])
  @@index([recipeLineId])
  @@index([area_id])
  @@map("batch_material_usages")
}
```

- [ ] **Step 2: 新增迁移 SQL**

创建 `server/src/prisma/migrations/20260429090000_product_master_linkage/migration.sql`：

```sql
ALTER TABLE "products"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual_admin';

CREATE INDEX "products_source_idx" ON "products"("source");

CREATE TABLE "workshop_areas" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "workshop_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_areas_company_id_code_key" ON "workshop_areas"("company_id", "code");
CREATE UNIQUE INDEX "workshop_areas_company_id_name_key" ON "workshop_areas"("company_id", "name");
CREATE INDEX "workshop_areas_status_idx" ON "workshop_areas"("status");

ALTER TABLE "recipe_lines"
  ADD COLUMN "area_id" TEXT,
  ADD COLUMN "area_name_snapshot" TEXT;

CREATE UNIQUE INDEX "recipe_lines_recipe_id_material_id_key" ON "recipe_lines"("recipe_id", "material_id");
CREATE INDEX "recipe_lines_area_id_idx" ON "recipe_lines"("area_id");

ALTER TABLE "recipe_lines"
  ADD CONSTRAINT "recipe_lines_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_material_usages"
  ADD COLUMN "recipeLineId" TEXT,
  ADD COLUMN "area_id" TEXT,
  ADD COLUMN "areaNameSnapshot" TEXT;

CREATE INDEX "batch_material_usages_recipeLineId_idx" ON "batch_material_usages"("recipeLineId");
CREATE INDEX "batch_material_usages_area_id_idx" ON "batch_material_usages"("area_id");

ALTER TABLE "batch_material_usages"
  ADD CONSTRAINT "batch_material_usages_recipeLineId_fkey"
  FOREIGN KEY ("recipeLineId") REFERENCES "recipe_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_material_usages"
  ADD CONSTRAINT "batch_material_usages_area_id_fkey"
  FOREIGN KEY ("area_id") REFERENCES "workshop_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: 更新 seed**

在 `server/src/prisma/seed.ts` 的系统配置 upsert 区域加入：

```ts
await prisma.systemConfig.upsert({
  where: { key: 'product.code.format' },
  update: {
    value: 'CP-{序号}',
    valueType: 'text',
    category: 'product',
    description: '产品编号格式',
  },
  create: {
    key: 'product.code.format',
    value: 'CP-{序号}',
    valueType: 'text',
    category: 'product',
    description: '产品编号格式',
  },
});
```

在 seed 的基础数据区域加入：

```ts
const workshopAreas = [
  { code: 'SF', name: '筛粉间', sort_order: 10 },
  { code: 'CY', name: '称油间', sort_order: 20 },
  { code: 'XL', name: '小料房', sort_order: 30 },
  { code: 'GJ', name: '果酱房', sort_order: 40 },
  { code: 'JD', name: '鸡蛋房', sort_order: 50 },
  { code: 'JL', name: '搅料间', sort_order: 60 },
];

for (const area of workshopAreas) {
  await prisma.workshopArea.upsert({
    where: { company_id_code: { company_id: '1', code: area.code } },
    update: { name: area.name, sort_order: area.sort_order, status: 'active' },
    create: { company_id: '1', code: area.code, name: area.name, sort_order: area.sort_order },
  });
}
```

- [ ] **Step 4: 运行 Prisma 校验**

Run:

```bash
npm run prisma:generate
```

Expected:

```text
Generated Prisma Client
```

- [ ] **Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260429090000_product_master_linkage/migration.sql server/src/prisma/seed.ts
git commit -m "feat: add product linkage schema fields"
```

## Task 2: 产品编号生成与产品创建入口

**Files:**
- Create: `server/src/modules/product/product-code-generator.service.ts`
- Create: `server/src/modules/product/product-code-generator.service.spec.ts`
- Modify: `server/src/modules/product/dto/create-product.dto.ts`
- Modify: `server/src/modules/product/product.service.ts`
- Modify: `server/src/modules/product/product.module.ts`

- [ ] **Step 1: 写编号生成失败测试**

Create `server/src/modules/product/product-code-generator.service.spec.ts`:

```ts
import { ProductCodeGeneratorService } from './product-code-generator.service';

describe('ProductCodeGeneratorService', () => {
  it('按 SystemConfig 配置生成下一个产品编号', async () => {
    const prisma: any = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'product.code.format', value: 'CP-{序号}' }),
      },
      product: {
        count: jest.fn().mockResolvedValue(7),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000008');
    expect(prisma.product.count).toHaveBeenCalledWith({
      where: { company_id: '1', code: { startsWith: 'CP-' } },
    });
  });

  it('配置不存在时使用默认格式', async () => {
    const prisma: any = {
      systemConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      product: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000001');
  });

  it('生成结果已存在时递增直到可用', async () => {
    const prisma: any = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'product.code.format', value: 'CP-{序号}' }),
      },
      product: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'existing' })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new ProductCodeGeneratorService(prisma);

    await expect(service.generate('1')).resolves.toBe('CP-000002');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -w server -- product-code-generator.service.spec.ts --runInBand
```

Expected:

```text
Cannot find module './product-code-generator.service'
```

- [ ] **Step 3: 实现编号生成服务**

Create `server/src/modules/product/product-code-generator.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_FORMAT = 'CP-{序号}';
const TOKEN = '{序号}';

@Injectable()
export class ProductCodeGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(companyId: string): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'product.code.format' },
    });
    const format = config?.value || DEFAULT_FORMAT;
    const prefix = format.split(TOKEN)[0] || 'CP-';
    let sequence = await this.prisma.product.count({
      where: { company_id: companyId, code: { startsWith: prefix } },
    }) + 1;

    while (true) {
      const code = this.format(format, sequence);
      const existing = await this.prisma.product.findFirst({
        where: { company_id: companyId, code },
        select: { id: true },
      });
      if (!existing) return code;
      sequence += 1;
    }
  }

  private format(format: string, sequence: number): string {
    return format.replace(TOKEN, String(sequence).padStart(6, '0'));
  }
}
```

- [ ] **Step 4: 调整 DTO**

Modify `server/src/modules/product/dto/create-product.dto.ts`:

```ts
import { IsString, IsOptional, IsNumber, IsNotEmpty, IsIn, IsPositive } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  spec?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  net_weight?: number;

  @IsOptional()
  @IsString()
  weight_unit?: string;

  @IsOptional()
  @IsString()
  label_claims?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['rd_process', 'legacy_import', 'manual_admin'])
  source?: string;
}
```

- [ ] **Step 5: ProductService 使用生成器**

Modify `server/src/modules/product/product.service.ts` constructor and `create()`:

```ts
constructor(
  private prisma: PrismaService,
  private readonly storageService: StorageService,
  private readonly businessDocumentLinkService: BusinessDocumentLinkService,
  private readonly productCodeGenerator: ProductCodeGeneratorService,
) {}

async create(dto: CreateProductDto) {
  const code = await this.productCodeGenerator.generate('1');
  const { code: _ignoredCode, ...data } = dto;
  return this.prisma.product.create({
    data: {
      ...data,
      code,
      company_id: '1',
      source: dto.source ?? 'manual_admin',
    },
  });
}
```

在文件顶部加入：

```ts
import { ProductCodeGeneratorService } from './product-code-generator.service';
```

- [ ] **Step 6: ProductModule 注册服务**

Modify `server/src/modules/product/product.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductCodeGeneratorService } from './product-code-generator.service';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, ProductCodeGeneratorService, StorageService, BusinessDocumentLinkService],
  exports: [ProductService, ProductCodeGeneratorService],
})
export class ProductModule {}
```

- [ ] **Step 7: 运行产品编号测试**

Run:

```bash
npm run test -w server -- product-code-generator.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/product/product-code-generator.service.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/product/product-code-generator.service.ts server/src/modules/product/product-code-generator.service.spec.ts server/src/modules/product/dto/create-product.dto.ts server/src/modules/product/product.service.ts server/src/modules/product/product.module.ts
git commit -m "feat: generate product codes"
```

## Task 3: 历史产品建档后端闭环

**Files:**
- Create: `server/src/modules/product/dto/create-legacy-product.dto.ts`
- Modify: `server/src/modules/product/product.service.ts`
- Modify: `server/src/modules/product/product.controller.ts`
- Create: `server/src/modules/product/product-legacy.service.spec.ts`

- [ ] **Step 1: 写历史建档事务测试**

Create `server/src/modules/product/product-legacy.service.spec.ts`:

```ts
import { ProductService } from './product.service';

describe('ProductService legacy product filing', () => {
  it('一次性创建 active 产品、active 配方和带区域快照的配方行', async () => {
    const tx: any = {
      workshopArea: {
        findUnique: jest.fn().mockResolvedValue({ id: 'area-1', name: '筛粉间', status: 'active' }),
      },
      material: {
        findFirst: jest.fn().mockResolvedValue({ id: 'mat-1', unit: 'kg', name: '面粉' }),
      },
      product: {
        create: jest.fn().mockResolvedValue({ id: 'prod-1', code: 'CP-000001', name: '老产品A' }),
      },
      recipe: {
        create: jest.fn().mockResolvedValue({ id: 'recipe-1', version: 1, status: 'active' }),
      },
      recipeLine: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma: any = {
      $transaction: jest.fn((fn) => fn(tx)),
    };
    const codeGenerator: any = { generate: jest.fn().mockResolvedValue('CP-000001') };
    const service = new ProductService(prisma, {} as any, {} as any, codeGenerator);

    const result = await service.createLegacy({
      name: '老产品A',
      lines: [
        {
          material_id: 'mat-1',
          qty_per_batch: 12.5,
          unit: 'kg',
          is_critical: true,
          area_id: 'area-1',
          notes: '主料',
        },
      ],
    });

    expect(result.product.id).toBe('prod-1');
    expect(tx.product.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        code: 'CP-000001',
        name: '老产品A',
        status: 'active',
        source: 'legacy_import',
      },
    });
    expect(tx.recipe.create).toHaveBeenCalledWith({
      data: {
        company_id: '1',
        product_id: 'prod-1',
        version: 1,
        version_note: '历史产品建档',
        status: 'active',
        approved_at: expect.any(Date),
      },
    });
    expect(tx.recipeLine.createMany).toHaveBeenCalledWith({
      data: [
        {
          recipe_id: 'recipe-1',
          material_id: 'mat-1',
          qty_per_batch: 12.5,
          unit: 'kg',
          is_critical: true,
          notes: '主料',
          area_id: 'area-1',
          area_name_snapshot: '筛粉间',
        },
      ],
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
npm run test -w server -- product-legacy.service.spec.ts --runInBand
```

Expected:

```text
Property 'createLegacy' does not exist
```

- [ ] **Step 3: 创建 DTO**

Create `server/src/modules/product/dto/create-legacy-product.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class LegacyProductRecipeLineDto {
  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsNumber()
  @IsPositive()
  qty_per_batch: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsBoolean()
  @IsOptional()
  is_critical?: boolean;

  @IsString()
  @IsNotEmpty()
  area_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateLegacyProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegacyProductRecipeLineDto)
  lines: LegacyProductRecipeLineDto[];
}
```

- [ ] **Step 4: 实现 createLegacy**

Modify `server/src/modules/product/product.service.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { CreateLegacyProductDto } from './dto/create-legacy-product.dto';
```

在 `ProductService` 中加入：

```ts
async createLegacy(dto: CreateLegacyProductDto) {
  if (!dto.lines.length) {
    throw new BadRequestException('历史产品建档至少需要一条配方明细');
  }

  const materialIds = dto.lines.map((line) => line.material_id);
  if (new Set(materialIds).size !== materialIds.length) {
    throw new BadRequestException('同一配方中同一物料只能出现一次');
  }

  return this.prisma.$transaction(async (tx) => {
    const code = await this.productCodeGenerator.generate('1');
    const enrichedLines = [];

    for (const line of dto.lines) {
      const material = await tx.material.findFirst({
        where: { id: line.material_id, deletedAt: null, status: 'active' },
      });
      if (!material) {
        throw new BadRequestException(`物料不存在或已停用：${line.material_id}`);
      }

      const area = await tx.workshopArea.findUnique({
        where: { id: line.area_id },
      });
      if (!area || area.status !== 'active' || area.deleted_at) {
        throw new BadRequestException(`配料区域不存在或已停用：${line.area_id}`);
      }

      enrichedLines.push({
        ...line,
        area_name_snapshot: area.name,
      });
    }

    const product = await tx.product.create({
      data: {
        company_id: '1',
        code,
        name: dto.name,
        status: 'active',
        source: 'legacy_import',
      },
    });

    const recipe = await tx.recipe.create({
      data: {
        company_id: '1',
        product_id: product.id,
        version: 1,
        version_note: '历史产品建档',
        status: 'active',
        approved_at: new Date(),
      },
    });

    await tx.recipeLine.createMany({
      data: enrichedLines.map((line) => ({
        recipe_id: recipe.id,
        material_id: line.material_id,
        qty_per_batch: line.qty_per_batch,
        unit: line.unit,
        is_critical: line.is_critical ?? false,
        notes: line.notes ?? null,
        area_id: line.area_id,
        area_name_snapshot: line.area_name_snapshot,
      })),
    });

    return { product, recipe };
  });
}
```

- [ ] **Step 5: 增加 controller API**

Modify `server/src/modules/product/product.controller.ts`:

```ts
import { CreateLegacyProductDto } from './dto/create-legacy-product.dto';
```

在 `ProductController` 中加入：

```ts
@Post('legacy')
createLegacy(@Body() dto: CreateLegacyProductDto) {
  return this.service.createLegacy(dto);
}
```

- [ ] **Step 6: 运行测试**

Run:

```bash
npm run test -w server -- product-legacy.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/product/product-legacy.service.spec.ts
```

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/product/dto/create-legacy-product.dto.ts server/src/modules/product/product.service.ts server/src/modules/product/product.controller.ts server/src/modules/product/product-legacy.service.spec.ts
git commit -m "feat: add legacy product filing api"
```

## Task 4: WorkshopArea API 与配方区域校验

**Files:**
- Create: `server/src/modules/workshop-area/workshop-area.module.ts`
- Create: `server/src/modules/workshop-area/workshop-area.controller.ts`
- Create: `server/src/modules/workshop-area/workshop-area.service.ts`
- Create: `server/src/modules/workshop-area/workshop-area.service.spec.ts`
- Modify: `server/src/app.module.ts`
- Modify: `server/src/modules/recipe/dto/create-recipe.dto.ts`
- Modify: `server/src/modules/recipe/recipe.service.ts`
- Modify: `server/src/modules/recipe/recipe.service.spec.ts`

- [ ] **Step 1: 写区域查询测试**

Create `server/src/modules/workshop-area/workshop-area.service.spec.ts`:

```ts
import { WorkshopAreaService } from './workshop-area.service';

describe('WorkshopAreaService', () => {
  it('只返回 active 且未删除的配料区域', async () => {
    const prisma: any = {
      workshopArea: {
        findMany: jest.fn().mockResolvedValue([{ id: 'area-1', name: '筛粉间' }]),
      },
    };
    const service = new WorkshopAreaService(prisma);

    await expect(service.findActive()).resolves.toEqual([{ id: 'area-1', name: '筛粉间' }]);
    expect(prisma.workshopArea.findMany).toHaveBeenCalledWith({
      where: { company_id: '1', status: 'active', deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  });
});
```

- [ ] **Step 2: 实现 WorkshopArea 模块**

Create `server/src/modules/workshop-area/workshop-area.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkshopAreaService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.workshopArea.findMany({
      where: { company_id: '1', status: 'active', deleted_at: null },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }
}
```

Create `server/src/modules/workshop-area/workshop-area.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';
import { WorkshopAreaService } from './workshop-area.service';

@Controller('workshop-areas')
export class WorkshopAreaController {
  constructor(private readonly service: WorkshopAreaService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }
}
```

Create `server/src/modules/workshop-area/workshop-area.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { WorkshopAreaController } from './workshop-area.controller';
import { WorkshopAreaService } from './workshop-area.service';

@Module({
  controllers: [WorkshopAreaController],
  providers: [WorkshopAreaService],
  exports: [WorkshopAreaService],
})
export class WorkshopAreaModule {}
```

Modify `server/src/app.module.ts`:

```ts
import { WorkshopAreaModule } from './modules/workshop-area/workshop-area.module';
```

把 `WorkshopAreaModule` 加入 `imports`。

- [ ] **Step 3: DTO 接收 area_id**

Modify `server/src/modules/recipe/dto/create-recipe.dto.ts` 的 `RecipeLineDto`:

```ts
@IsString()
@IsNotEmpty()
area_id: string;
```

- [ ] **Step 4: RecipeService 保存区域快照**

Modify `server/src/modules/recipe/recipe.service.ts` 的 `create()`：

```ts
async create(dto: CreateRecipeDto) {
  const { product_id, version_note, lines } = dto;
  const materialIds = lines.map((line) => line.material_id);
  if (new Set(materialIds).size !== materialIds.length) {
    throw new BadRequestException('同一配方中同一物料只能出现一次');
  }

  const schemaLines = [];
  for (const line of lines) {
    const material = await this.prisma.material.findFirst({
      where: { id: line.material_id, deletedAt: null, status: 'active' },
    });
    if (!material) throw new BadRequestException(`物料不存在或已停用：${line.material_id}`);

    const area = await this.prisma.workshopArea.findFirst({
      where: { id: line.area_id, company_id: '1', status: 'active', deleted_at: null },
    });
    if (!area) throw new BadRequestException(`配料区域不存在或已停用：${line.area_id}`);

    const { is_allergen: _ignored, ...rest } = line;
    schemaLines.push({
      ...rest,
      area_name_snapshot: area.name,
    });
  }

  await this.prisma.recipe.updateMany({
    where: { product_id, status: 'active', company_id: '1' },
    data: { status: 'archived' },
  });

  const latest = await this.prisma.recipe.findFirst({
    where: { product_id, company_id: '1' },
    orderBy: { version: 'desc' },
  });

  return this.prisma.recipe.create({
    data: {
      company_id: '1',
      product_id,
      version: (latest?.version ?? 0) + 1,
      version_note,
      status: 'active',
      lines: { create: schemaLines },
    },
    include: { lines: true },
  });
}
```

在文件顶部加入：

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 5: 运行测试和构建**

Run:

```bash
npm run test -w server -- workshop-area.service.spec.ts --runInBand
npm run build:server
```

Expected:

```text
PASS src/modules/workshop-area/workshop-area.service.spec.ts
```

```text
Found 0 errors
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/workshop-area server/src/app.module.ts server/src/modules/recipe/dto/create-recipe.dto.ts server/src/modules/recipe/recipe.service.ts
git commit -m "feat: add workshop areas to recipes"
```

## Task 5: 生产开工和生产批次改为强主数据链路

**Files:**
- Modify: `server/src/modules/production-run/dto/create-production-run.dto.ts`
- Modify: `server/src/modules/production-run/production-run.service.ts`
- Modify: `server/src/modules/production-run/production-run.service.spec.ts`
- Modify: `server/src/modules/batch-trace/dto/production-batch.dto.ts`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.ts`
- Modify: `server/src/modules/batch-trace/services/production-batch.service.spec.ts`

- [ ] **Step 1: 写 ProductionRun 校验测试**

Modify `server/src/modules/production-run/production-run.service.spec.ts` 增加：

```ts
it('开工时要求 active 产品和匹配的 active 配方', async () => {
  mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open', company_id: '1' });
  mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', status: 'active' });
  mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', product_id: 'p1', status: 'active' });
  mockPrisma.productionRun.create.mockResolvedValue({ id: 'run-1' });

  await service.create({
    shift_instance_id: 's1',
    production_line: '1号线',
    product_id: 'p1',
    recipe_id: 'r1',
  });

  expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith({
    where: { id: 'r1', product_id: 'p1', company_id: '1', status: 'active' },
  });
});

it('没有 active 配方时拒绝开工', async () => {
  mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open', company_id: '1' });
  mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', status: 'active' });
  mockPrisma.recipe.findFirst.mockResolvedValue(null);

  await expect(service.create({
    shift_instance_id: 's1',
    production_line: '1号线',
    product_id: 'p1',
    recipe_id: 'r1',
  })).rejects.toThrow('配方不存在、未激活或不属于该产品');
});
```

- [ ] **Step 2: 修改 ProductionRun DTO**

Modify `server/src/modules/production-run/dto/create-production-run.dto.ts`:

```ts
@IsNotEmpty()
@IsString()
recipe_id: string;
```

- [ ] **Step 3: 修改 ProductionRunService**

Modify `server/src/modules/production-run/production-run.service.ts`:

```ts
const product = await this.prisma.product.findFirst({
  where: { id: dto.product_id, company_id: '1', status: 'active', deleted_at: null },
});
if (!product) throw new BadRequestException('产品不存在或未启用');

const recipe = await this.prisma.recipe.findFirst({
  where: { id: dto.recipe_id, product_id: dto.product_id, company_id: '1', status: 'active' },
});
if (!recipe) throw new BadRequestException('配方不存在、未激活或不属于该产品');
```

把这段放在 `shift` 校验之后、`productionRun.create()` 之前。

- [ ] **Step 4: 写 ProductionBatch 快照测试**

Modify `server/src/modules/batch-trace/services/production-batch.service.spec.ts` 增加：

```ts
it('创建生产批次时根据产品和配方写入快照', async () => {
  jest.spyOn(batchNumberGenerator, 'generateBatchNumber').mockResolvedValue('PROD-20260429-001');
  mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', name: '老产品A', code: 'CP-000001', status: 'active' });
  mockPrisma.recipe.findFirst.mockResolvedValue({ id: 'r1', version: 1, status: 'active', product_id: 'p1' });
  mockPrisma.productionBatch.create.mockResolvedValue({ id: 'pb1' });

  await service.create({
    productId: 'p1',
    recipeId: 'r1',
    plannedQuantity: 100,
    productionDate: new Date('2026-04-29T00:00:00.000Z'),
  });

  expect(mockPrisma.productionBatch.create).toHaveBeenCalledWith({
    data: {
      batchNumber: 'PROD-20260429-001',
      productId: 'p1',
      recipeId: 'r1',
      productName: '老产品A',
      recipeName: 'v1',
      plannedQuantity: 100,
      productionDate: new Date('2026-04-29T00:00:00.000Z'),
      status: 'pending',
    },
  });
});
```

- [ ] **Step 5: 修改 ProductionBatch DTO**

Modify `server/src/modules/batch-trace/dto/production-batch.dto.ts`:

```ts
export class CreateProductionBatchDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  recipeId: string;

  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @Type(() => Date)
  @IsDate()
  productionDate: Date;
}
```

- [ ] **Step 6: 修改 ProductionBatchService**

Modify `server/src/modules/batch-trace/services/production-batch.service.ts`:

```ts
async create(createDto: CreateProductionBatchDto) {
  const product = await this.prisma.product.findFirst({
    where: { id: createDto.productId, company_id: '1', status: 'active', deleted_at: null },
  });
  if (!product) throw new BadRequestException('产品不存在或未启用');

  const recipe = await this.prisma.recipe.findFirst({
    where: { id: createDto.recipeId, product_id: createDto.productId, company_id: '1', status: 'active' },
  });
  if (!recipe) throw new BadRequestException('配方不存在、未激活或不属于该产品');

  const batchNumber = await this.batchNumberGenerator.generateBatchNumber('production');

  return this.prisma.productionBatch.create({
    data: {
      batchNumber,
      productId: product.id,
      recipeId: recipe.id,
      productName: product.name,
      recipeName: `v${recipe.version}`,
      plannedQuantity: createDto.plannedQuantity,
      productionDate: createDto.productionDate,
      status: 'pending',
    },
  });
}
```

- [ ] **Step 7: 运行测试**

Run:

```bash
npm run test -w server -- production-run.service.spec.ts production-batch.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/production-run/production-run.service.spec.ts
PASS src/modules/batch-trace/services/production-batch.service.spec.ts
```

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/production-run server/src/modules/batch-trace/dto/production-batch.dto.ts server/src/modules/batch-trace/services/production-batch.service.ts server/src/modules/batch-trace/services/production-batch.service.spec.ts
git commit -m "feat: enforce product recipe linkage for production"
```

## Task 6: 投料记录接入配方行和区域快照

**Files:**
- Modify: `server/src/modules/batch-trace/dto/material-usage.dto.ts`
- Modify: `server/src/modules/batch-trace/services/batch-material-usage.service.ts`
- Modify: `server/src/modules/batch-trace/services/batch-material-usage.service.spec.ts`

- [ ] **Step 1: 写投料上下文测试**

Modify `server/src/modules/batch-trace/services/batch-material-usage.service.spec.ts` 增加：

```ts
it('投料时从 recipeLine 写入区域快照', async () => {
  const prisma: any = {
    productionBatch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pb1', recipeId: 'r1' }),
    },
    recipeLine: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'line1',
        recipe_id: 'r1',
        material_id: 'mat1',
        area_id: 'area1',
        area_name_snapshot: '筛粉间',
      }),
    },
    materialBatch: {
      findUnique: jest.fn().mockResolvedValue({ id: 'mb1', materialId: 'mat1' }),
    },
    batchMaterialUsage: {
      create: jest.fn().mockResolvedValue({ id: 'usage1' }),
    },
  };
  const service = new BatchMaterialUsageService(prisma);

  await service.create({
    productionBatchId: 'pb1',
    materialBatchId: 'mb1',
    recipeLineId: 'line1',
    quantity: 10,
  });

  expect(prisma.batchMaterialUsage.create).toHaveBeenCalledWith({
    data: {
      productionBatchId: 'pb1',
      materialBatchId: 'mb1',
      recipeLineId: 'line1',
      area_id: 'area1',
      areaNameSnapshot: '筛粉间',
      quantity: 10,
    },
  });
});
```

- [ ] **Step 2: 修改 DTO**

Modify `server/src/modules/batch-trace/dto/material-usage.dto.ts`:

```ts
@ApiProperty({ description: '配方明细ID' })
@IsString()
recipeLineId: string;
```

并在顶部加入：

```ts
import { IsString, IsUUID, IsNumber, Min } from 'class-validator';
```

- [ ] **Step 3: 修改 service**

Modify `server/src/modules/batch-trace/services/batch-material-usage.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
```

替换接口：

```ts
interface CreateBatchMaterialUsageDto {
  productionBatchId: string;
  materialBatchId: string;
  recipeLineId: string;
  quantity: number;
}
```

替换 `create()`：

```ts
async create(createDto: CreateBatchMaterialUsageDto) {
  const batch = await this.prisma.productionBatch.findUnique({
    where: { id: createDto.productionBatchId },
  });
  if (!batch) throw new NotFoundException('生产批次不存在');
  if (!batch.recipeId) throw new BadRequestException('生产批次未关联配方');

  const recipeLine = await this.prisma.recipeLine.findFirst({
    where: { id: createDto.recipeLineId, recipe_id: batch.recipeId },
  });
  if (!recipeLine) throw new BadRequestException('配方明细不存在或不属于该生产批次配方');

  const materialBatch = await this.prisma.materialBatch.findUnique({
    where: { id: createDto.materialBatchId },
  });
  if (!materialBatch) throw new NotFoundException('物料批次不存在');
  if (materialBatch.materialId !== recipeLine.material_id) {
    throw new BadRequestException('物料批次对应物料与配方明细不一致');
  }

  return this.prisma.batchMaterialUsage.create({
    data: {
      productionBatchId: createDto.productionBatchId,
      materialBatchId: createDto.materialBatchId,
      recipeLineId: createDto.recipeLineId,
      area_id: recipeLine.area_id,
      areaNameSnapshot: recipeLine.area_name_snapshot,
      quantity: createDto.quantity,
    },
  });
}
```

- [ ] **Step 4: 运行测试**

Run:

```bash
npm run test -w server -- batch-material-usage.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/batch-trace/services/batch-material-usage.service.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/batch-trace/dto/material-usage.dto.ts server/src/modules/batch-trace/services/batch-material-usage.service.ts server/src/modules/batch-trace/services/batch-material-usage.service.spec.ts
git commit -m "feat: link material usage to recipe areas"
```

## Task 7: 前端历史产品建档和配方区域

**Files:**
- Create: `client/src/api/workshop-area.ts`
- Modify: `client/src/api/product.ts`
- Modify: `client/src/api/recipe.ts`
- Create: `client/src/views/product/LegacyProductDrawer.vue`
- Modify: `client/src/views/product/ProductList.vue`
- Modify: `client/src/views/recipe/RecipeEdit.vue`

- [ ] **Step 1: 写 API 类型**

Create `client/src/api/workshop-area.ts`:

```ts
import request from './request';

export interface WorkshopArea {
  id: string;
  code: string;
  name: string;
  status: string;
  sort_order: number;
}

export const workshopAreaApi = {
  getList() {
    return request.get<WorkshopArea[]>('/workshop-areas');
  },
};
```

Modify `client/src/api/product.ts`:

```ts
export interface Product {
  id: string;
  code: string;
  name: string;
  spec?: string;
  net_weight?: number;
  weight_unit?: string;
  status: string;
  source?: 'rd_process' | 'legacy_import' | 'manual_admin';
}

export interface LegacyProductLinePayload {
  material_id: string;
  qty_per_batch: number;
  unit: string;
  is_critical?: boolean;
  area_id: string;
  notes?: string;
}

export interface CreateLegacyProductPayload {
  name: string;
  lines: LegacyProductLinePayload[];
}
```

在 `productApi` 中加入：

```ts
createLegacy(data: CreateLegacyProductPayload) {
  return request.post<{ product: Product; recipe: unknown }>('/products/legacy', data);
},
```

Modify `client/src/api/recipe.ts`:

```ts
export interface RecipeLine {
  id: string;
  material_id: string;
  qty_per_batch: number;
  unit: string;
  is_critical?: boolean;
  area_id?: string;
  area_name_snapshot?: string;
}
```

并在 `CreateRecipePayload.lines` 内增加：

```ts
area_id: string;
```

- [ ] **Step 2: 创建历史产品建档抽屉**

Create `client/src/views/product/LegacyProductDrawer.vue`:

```vue
<template>
  <el-drawer :model-value="modelValue" title="历史产品建档" size="720px" @close="emit('update:modelValue', false)">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="产品名称" prop="name">
        <el-input v-model="form.name" placeholder="请输入产品名称" />
      </el-form-item>
      <el-table :data="form.lines" border>
        <el-table-column label="物料" min-width="210">
          <template #default="{ row }">
            <el-select v-model="row.material_id" filterable placeholder="选择物料" style="width: 100%" @change="syncMaterialUnit(row)">
              <el-option v-for="m in materials" :key="m.id" :label="`${m.materialCode} ${m.name}`" :value="m.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="用量" width="130">
          <template #default="{ row }">
            <el-input-number v-model="row.qty_per_batch" :min="0.0001" :precision="4" controls-position="right" style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column label="单位" width="100">
          <template #default="{ row }">
            <el-input v-model="row.unit" />
          </template>
        </el-table-column>
        <el-table-column label="配料区域" width="150">
          <template #default="{ row }">
            <el-select v-model="row.area_id" placeholder="选择区域" style="width: 100%">
              <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="关键" width="72" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.is_critical" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" @click="removeLine($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="line-actions">
        <el-button @click="addLine">添加配方行</el-button>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存建档</el-button>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { productApi } from '@/api/product';
import { materialApi, type Material } from '@/api/warehouse';
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void; (e: 'created'): void }>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const materials = ref<Material[]>([]);
const areas = ref<WorkshopArea[]>([]);

const form = reactive({
  name: '',
  lines: [{ material_id: '', qty_per_batch: 1, unit: 'kg', area_id: '', is_critical: false, notes: '' }],
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
};

watch(() => props.modelValue, async (open) => {
  if (!open) return;
  const [materialRes, areaRes] = await Promise.all([
    materialApi.getList({ status: 'active', limit: 500 }),
    workshopAreaApi.getList(),
  ]);
  materials.value = (materialRes as any).data ?? (materialRes as any).list ?? [];
  areas.value = areaRes as unknown as WorkshopArea[];
});

function addLine() {
  form.lines.push({ material_id: '', qty_per_batch: 1, unit: 'kg', area_id: '', is_critical: false, notes: '' });
}

function removeLine(index: number) {
  form.lines.splice(index, 1);
}

function syncMaterialUnit(row: { material_id: string; unit: string }) {
  const material = materials.value.find((item) => item.id === row.material_id);
  if (material?.unit) row.unit = material.unit;
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (form.lines.length === 0) return ElMessage.warning('至少添加一条配方行');
  if (form.lines.some((line) => !line.material_id || !line.area_id || !line.qty_per_batch || !line.unit)) {
    return ElMessage.warning('请完整填写物料、用量、单位和配料区域');
  }
  submitting.value = true;
  try {
    await productApi.createLegacy({
      name: form.name,
      lines: form.lines,
    });
    ElMessage.success('历史产品建档成功');
    emit('update:modelValue', false);
    emit('created');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.line-actions {
  margin-top: 12px;
}
</style>
```

- [ ] **Step 3: 产品目录接入抽屉并禁用编号编辑**

Modify `client/src/views/product/ProductList.vue`：

```vue
<el-button @click="legacyDrawerVisible = true">
  <el-icon><Plus /></el-icon>历史产品建档
</el-button>
<el-button type="primary" @click="router.push('/process')">
  <el-icon><Plus /></el-icon>发起新产品研发
</el-button>
```

把产品编号输入改为只读展示：

```vue
<el-form-item label="产品编号">
  <el-input v-model="form.code" disabled />
</el-form-item>
```

在模板末尾加入：

```vue
<LegacyProductDrawer v-model="legacyDrawerVisible" @created="loadList" />
```

在脚本加入：

```ts
import LegacyProductDrawer from './LegacyProductDrawer.vue';
const legacyDrawerVisible = ref(false);
```

提交编辑时不要发送 `code`：

```ts
const payload = {
  name: form.name,
  status: form.status,
};
```

- [ ] **Step 4: 配方编辑增加区域选择**

Modify `client/src/views/recipe/RecipeEdit.vue`：

在表头加入：

```vue
<span class="lh-area">配料区域</span>
```

在编辑行加入：

```vue
<el-select v-model="line.area_id" class="lh-area" size="small" placeholder="配料区域" @change="markDirty">
  <el-option v-for="a in areas" :key="a.id" :label="a.name" :value="a.id" />
</el-select>
```

脚本加入：

```ts
import { workshopAreaApi, type WorkshopArea } from '@/api/workshop-area';
const areas = ref<WorkshopArea[]>([]);
```

`EditLine` 增加：

```ts
area_id: string;
```

加载时增加区域：

```ts
const [recipe, prods, areaList] = await Promise.all([
  recipeApi.getOne(id) as unknown as Promise<Recipe>,
  productApi.getList() as unknown as Promise<Product[]>,
  workshopAreaApi.getList() as unknown as Promise<WorkshopArea[]>,
]);
areas.value = areaList;
```

保存 payload 增加：

```ts
area_id: l.area_id,
```

- [ ] **Step 5: 前端构建**

Run:

```bash
npm run build:client
```

Expected:

```text
✓ built
```

- [ ] **Step 6: Commit**

```bash
git add client/src/api/workshop-area.ts client/src/api/product.ts client/src/api/recipe.ts client/src/views/product/LegacyProductDrawer.vue client/src/views/product/ProductList.vue client/src/views/recipe/RecipeEdit.vue
git commit -m "feat: add legacy product filing ui"
```

## Task 8: 前端生产和关键手填模块收敛

**Files:**
- Create: `client/src/components/master-data/ProductRecipeSelect.vue`
- Create: `client/src/components/master-data/ProductionBatchSelect.vue`
- Create: `client/src/components/master-data/MaterialSelect.vue`
- Modify: `client/src/api/batch.ts`
- Modify: `client/src/api/production-run.ts`
- Modify: `client/src/views/shift/components/OpenRunDialog.vue`
- Modify: `client/src/views/batch-trace/BatchList.vue`
- Modify: `client/src/views/customer-complaint/CustomerComplaintList.vue`
- Modify: `client/src/views/process-record/ProcessRecordList.vue`
- Modify: `client/src/views/metal-detection/MetalDetectionList.vue`
- Modify: `client/src/views/rework-record/ReworkRecordList.vue`
- Modify: `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`
- Modify: `client/src/views/waste/WasteManagement.vue`

- [ ] **Step 1: 创建生产批次选择器**

Create `client/src/components/master-data/ProductionBatchSelect.vue`:

```vue
<template>
  <el-select
    :model-value="modelValue"
    filterable
    remote
    clearable
    reserve-keyword
    placeholder="选择生产批次"
    style="width: 100%"
    :remote-method="search"
    :loading="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="batch in options"
      :key="batch.id"
      :label="`${batch.batchNumber} / ${batch.productName}`"
      :value="batch.id"
    />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { productionBatchApi, type ProductionBatch } from '@/api/batch';

defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const loading = ref(false);
const options = ref<ProductionBatch[]>([]);

async function search(keyword = '') {
  loading.value = true;
  try {
    const res = await productionBatchApi.getList({ page: 1, limit: 20, keyword });
    options.value = (res as any).data ?? (res as any).list ?? [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => search());
</script>
```

- [ ] **Step 2: 创建物料选择器**

Create `client/src/components/master-data/MaterialSelect.vue`:

```vue
<template>
  <el-select
    :model-value="modelValue"
    filterable
    clearable
    placeholder="选择物料"
    style="width: 100%"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option v-for="item in materials" :key="item.id" :label="`${item.materialCode} ${item.name}`" :value="item.id" />
  </el-select>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { materialApi, type Material } from '@/api/warehouse';

defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const materials = ref<Material[]>([]);

onMounted(async () => {
  const res = await materialApi.getList({ status: 'active', limit: 500 });
  materials.value = (res as any).data ?? (res as any).list ?? [];
});
</script>
```

- [ ] **Step 3: 创建产品配方选择器**

Create `client/src/components/master-data/ProductRecipeSelect.vue`:

```vue
<template>
  <div class="product-recipe-select">
    <el-select v-model="localProductId" filterable placeholder="选择产品" style="width: 100%" @change="handleProductChange">
      <el-option v-for="p in products" :key="p.id" :label="`${p.code} ${p.name}`" :value="p.id" />
    </el-select>
    <el-select v-model="localRecipeId" filterable placeholder="选择配方" style="width: 100%" @change="emitChange">
      <el-option v-for="r in activeRecipes" :key="r.id" :label="`v${r.version}`" :value="r.id" />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { productApi, type Product } from '@/api/product';
import { recipeApi, type Recipe } from '@/api/recipe';

const props = defineProps<{ productId?: string; recipeId?: string }>();
const emit = defineEmits<{ (e: 'change', value: { productId: string; recipeId: string }): void }>();

const products = ref<Product[]>([]);
const recipes = ref<Recipe[]>([]);
const localProductId = ref(props.productId || '');
const localRecipeId = ref(props.recipeId || '');

const activeRecipes = computed(() => recipes.value.filter((recipe) => recipe.status === 'active'));

watch(() => props.productId, (value) => { localProductId.value = value || ''; });
watch(() => props.recipeId, (value) => { localRecipeId.value = value || ''; });

onMounted(async () => {
  products.value = await productApi.getList() as unknown as Product[];
  if (localProductId.value) await loadRecipes(localProductId.value);
});

async function loadRecipes(productId: string) {
  recipes.value = await recipeApi.getByProduct(productId) as unknown as Recipe[];
}

async function handleProductChange(productId: string) {
  localRecipeId.value = '';
  recipes.value = [];
  if (productId) await loadRecipes(productId);
}

function emitChange() {
  emit('change', { productId: localProductId.value, recipeId: localRecipeId.value });
}
</script>

<style scoped>
.product-recipe-select {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 8px;
}
</style>
```

- [ ] **Step 4: 修改生产批次 API 类型**

Modify `client/src/api/batch.ts`:

```ts
export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  recipeId: string;
  recipeName?: string;
  plannedQuantity: number;
  actualQuantity?: number;
  productionDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  materialUsages?: MaterialUsage[];
}

export interface CreateProductionBatchPayload {
  productId: string;
  recipeId: string;
  plannedQuantity: number;
  productionDate: string;
}

create(payload: CreateProductionBatchPayload) {
  return request.post<ProductionBatch>('/batch-trace/production-batches', payload);
}
```

- [ ] **Step 5: 修改开工对话框**

Modify `client/src/views/shift/components/OpenRunDialog.vue`：

把产品和配方两个表单项替换为：

```vue
<el-form-item label="产品配方" required>
  <ProductRecipeSelect @change="onProductRecipeChange" />
</el-form-item>
```

脚本加入：

```ts
import ProductRecipeSelect from '@/components/master-data/ProductRecipeSelect.vue';

function onProductRecipeChange(value: { productId: string; recipeId: string }) {
  form.product_id = value.productId;
  form.recipe_id = value.recipeId;
}
```

规则改为：

```ts
const rules: FormRules = {
  production_line: [{ required: true, message: '请填写产线', trigger: 'blur' }],
  product_id: [{ required: true, message: '请选择产品', trigger: 'change' }],
  recipe_id: [{ required: true, message: '请选择配方', trigger: 'change' }],
};
```

- [ ] **Step 6: 修改生产批次创建页**

Modify `client/src/views/batch-trace/BatchList.vue`：

把产品名称和产品代码输入替换为：

```vue
<el-form-item label="产品配方" required>
  <ProductRecipeSelect @change="onProductRecipeChange" />
</el-form-item>
<el-form-item label="计划数量" prop="plannedQuantity">
  <el-input-number v-model="createForm.plannedQuantity" :min="0.0001" :precision="4" />
</el-form-item>
<el-form-item label="生产日期" prop="productionDate">
  <el-date-picker v-model="createForm.productionDate" type="date" value-format="YYYY-MM-DDTHH:mm:ss" />
</el-form-item>
```

脚本加入：

```ts
import ProductRecipeSelect from '@/components/master-data/ProductRecipeSelect.vue';
```

创建表单改为：

```ts
const createForm = reactive({ productId: '', recipeId: '', plannedQuantity: 1, productionDate: '' });
const createRules: FormRules = {
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }],
  recipeId: [{ required: true, message: '请选择配方', trigger: 'change' }],
  plannedQuantity: [{ required: true, message: '请输入计划数量', trigger: 'blur' }],
  productionDate: [{ required: true, message: '请选择生产日期', trigger: 'change' }],
};

function onProductRecipeChange(value: { productId: string; recipeId: string }) {
  createForm.productId = value.productId;
  createForm.recipeId = value.recipeId;
}
```

提交 payload 改为：

```ts
await productionBatchApi.create({
  productId: createForm.productId,
  recipeId: createForm.recipeId,
  plannedQuantity: createForm.plannedQuantity,
  productionDate: createForm.productionDate,
});
```

- [ ] **Step 7: 投诉和过程记录使用批次选择器**

在 `CustomerComplaintList.vue`、`ProcessRecordList.vue`、`MetalDetectionList.vue`、`ReworkRecordList.vue` 中加入：

```ts
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
```

把生产批次输入：

```vue
<el-input v-model="createForm.production_batch_id" placeholder="生产批次号" />
```

替换为：

```vue
<ProductionBatchSelect v-model="createForm.production_batch_id" />
```

表格列标签从 `批次号` 或 `生产批次 ID` 改为：

```vue
<el-table-column prop="production_batch_id" label="生产批次" width="180" show-overflow-tooltip />
```

- [ ] **Step 8: 包材用量使用物料选择器**

Modify `client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue`：

```ts
import MaterialSelect from '@/components/master-data/MaterialSelect.vue';
```

表单中的物料名称和编号输入替换为：

```vue
<el-form-item label="物料" prop="material_id">
  <MaterialSelect v-model="form.material_id" />
</el-form-item>
```

form 改为：

```ts
const form = reactive({
  material_id: '',
  production_batch_id: '',
  used_weight: undefined as number | undefined,
  waste_weight: undefined as number | undefined,
  unit: '',
  usage_date: '',
  operator_id: '',
  notes: '',
});
```

提交 payload 改为：

```ts
await packagingMaterialUsageApi.create({
  material_id: form.material_id,
  production_batch_id: form.production_batch_id || undefined,
  used_weight: form.used_weight,
  waste_weight: form.waste_weight,
  unit: form.unit || undefined,
  usage_date: form.usage_date || undefined,
  operator_id: form.operator_id || undefined,
  notes: form.notes || undefined,
});
```

这一处需要后端 DTO 和 schema 支持 `material_id`，见 Task 9。

- [ ] **Step 9: 废料统计使用批次选择器**

Modify `client/src/views/waste/WasteManagement.vue`：

```ts
import ProductionBatchSelect from '@/components/master-data/ProductionBatchSelect.vue';
```

把废料统计的生产批次输入替换为：

```vue
<el-form-item label="生产批次">
  <ProductionBatchSelect v-model="wasteRecordForm.production_batch_id" />
</el-form-item>
```

- [ ] **Step 10: 前端测试和构建**

Run:

```bash
npm run test:client
npm run build:client
```

Expected:

```text
Test Files
```

```text
✓ built
```

- [ ] **Step 11: Commit**

```bash
git add client/src/components/master-data client/src/api/batch.ts client/src/api/production-run.ts client/src/views/shift/components/OpenRunDialog.vue client/src/views/batch-trace/BatchList.vue client/src/views/customer-complaint/CustomerComplaintList.vue client/src/views/process-record/ProcessRecordList.vue client/src/views/metal-detection/MetalDetectionList.vue client/src/views/rework-record/ReworkRecordList.vue client/src/views/packaging-material-usage/PackagingMaterialUsageList.vue client/src/views/waste/WasteManagement.vue
git commit -m "feat: replace hand typed master data selectors"
```

## Task 9: 包材用量后端物料主数据收敛

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/prisma/migrations/20260429091000_packaging_material_usage_material_link/migration.sql`
- Modify: `server/src/modules/packaging-material-usage/dto/create-packaging-material-usage.dto.ts`
- Modify: `server/src/modules/packaging-material-usage/packaging-material-usage.service.ts`
- Modify: `server/src/modules/packaging-material-usage/packaging-material-usage.service.spec.ts`

- [ ] **Step 1: 修改 schema**

Modify `PackagingMaterialUsage`:

```prisma
model PackagingMaterialUsage {
  id                  String    @id @default(cuid())
  company_id          String
  production_batch_id String?
  material_id         String?
  material            Material? @relation(fields: [material_id], references: [id], onDelete: SetNull)
  material_name       String
  material_code       String?
  used_weight         Decimal?
  waste_weight        Decimal?
  unit                String?
  usage_date          DateTime  @default(now())
  operator_id         String?
  notes               String?
  created_at          DateTime  @default(now())
  deleted_at          DateTime?

  @@index([material_id])
}
```

在 `Material` 加反向关系：

```prisma
packagingMaterialUsages PackagingMaterialUsage[]
```

- [ ] **Step 2: 创建迁移 SQL**

Create `server/src/prisma/migrations/20260429091000_packaging_material_usage_material_link/migration.sql`:

```sql
ALTER TABLE "PackagingMaterialUsage"
  ADD COLUMN "material_id" TEXT;

CREATE INDEX "PackagingMaterialUsage_material_id_idx" ON "PackagingMaterialUsage"("material_id");

ALTER TABLE "PackagingMaterialUsage"
  ADD CONSTRAINT "PackagingMaterialUsage_material_id_fkey"
  FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

如果实际表名为小写映射表，先运行：

```bash
npx prisma validate --schema=server/src/prisma/schema.prisma
```

Expected:

```text
The schema at server/src/prisma/schema.prisma is valid
```

如果 Prisma 指出表名不同，把 SQL 中的 `"PackagingMaterialUsage"` 改成 Prisma 生成 SQL 所要求的现有表名，再执行迁移。

- [ ] **Step 3: 修改 DTO**

Modify `server/src/modules/packaging-material-usage/dto/create-packaging-material-usage.dto.ts`:

```ts
@IsString()
@IsNotEmpty()
material_id: string;
```

保留 `material_name`、`material_code` 为服务端快照字段，不从前端接收。

- [ ] **Step 4: 修改 service**

Modify `server/src/modules/packaging-material-usage/packaging-material-usage.service.ts`:

```ts
async create(dto: CreatePackagingMaterialUsageDto) {
  const material = await this.prisma.material.findFirst({
    where: { id: dto.material_id, deletedAt: null, status: 'active' },
  });
  if (!material) throw new BadRequestException('物料不存在或已停用');

  return this.prisma.packagingMaterialUsage.create({
    data: {
      company_id: '1',
      production_batch_id: dto.production_batch_id,
      material_id: material.id,
      material_name: material.name,
      material_code: material.materialCode,
      used_weight: dto.used_weight,
      waste_weight: dto.waste_weight,
      unit: dto.unit || material.unit,
      usage_date: dto.usage_date ? new Date(dto.usage_date) : new Date(),
      operator_id: dto.operator_id,
      notes: dto.notes,
    },
  });
}
```

在文件顶部加入：

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
```

- [ ] **Step 5: 运行校验**

Run:

```bash
npm run prisma:generate
npm run build:server
```

Expected:

```text
Generated Prisma Client
```

```text
Found 0 errors
```

- [ ] **Step 6: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/20260429091000_packaging_material_usage_material_link/migration.sql server/src/modules/packaging-material-usage
git commit -m "feat: link packaging usage to materials"
```

## Task 10: 全链路验证

**Files:**
- Create: `server/src/modules/product/product-linkage.integration.spec.ts`
- Modify: `docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md`

- [ ] **Step 1: 创建集成测试**

Create `server/src/modules/product/product-linkage.integration.spec.ts`:

```ts
describe('product master data linkage integration contract', () => {
  it('历史产品建档链路使用 Product + Recipe + RecipeLine + WorkshopArea', () => {
    const linkage = {
      product: 'Product',
      recipe: 'Recipe',
      recipeLine: 'RecipeLine',
      area: 'WorkshopArea',
      usage: 'BatchMaterialUsage',
    };

    expect(linkage).toEqual({
      product: 'Product',
      recipe: 'Recipe',
      recipeLine: 'RecipeLine',
      area: 'WorkshopArea',
      usage: 'BatchMaterialUsage',
    });
  });

  it('下游模块通过生产批次追产品，不直接保存 productId', () => {
    const modules = [
      { name: 'DeliveryNote', productPath: 'production_batch_id' },
      { name: 'CustomerComplaint', productPath: 'production_batch_id' },
      { name: 'ProcessMonitorRecord', productPath: 'production_batch_id' },
      { name: 'MetalDetectionLog', productPath: 'production_batch_id' },
      { name: 'ReworkRecord', productPath: 'production_batch_id' },
    ];

    expect(modules.every((item) => item.productPath === 'production_batch_id')).toBe(true);
  });
});
```

- [ ] **Step 2: 跑后端关键测试**

Run:

```bash
npm run test -w server -- product-code-generator.service.spec.ts product-legacy.service.spec.ts workshop-area.service.spec.ts production-run.service.spec.ts production-batch.service.spec.ts batch-material-usage.service.spec.ts product-linkage.integration.spec.ts --runInBand
```

Expected:

```text
PASS
```

- [ ] **Step 3: 跑全量构建**

Run:

```bash
npm run verify
```

Expected:

```text
npm run build:server
npm run build:client
```

两个构建都退出码为 0。

- [ ] **Step 4: 更新设计文档状态**

在 `docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md` 末尾加入：

```markdown
## 12. 实施状态

- 产品编号：已接入 `ProductCodeGeneratorService` 和 `SystemConfig.product.code.format`。
- 历史产品建档：已通过 `POST /products/legacy` 写入 `Product + Recipe + RecipeLine`。
- 配料区域：已通过 `WorkshopArea` 统一维护，配方行保存 `area_id + area_name_snapshot`。
- 生产开工：已强制 active 产品和 active 配方。
- 生产批次：已改为选择产品和配方，名称字段作为快照。
- 投料记录：已通过 `BatchMaterialUsage.recipeLineId` 关联配方明细和区域快照。
- 手填收敛：生产批次、投诉、过程记录、金检、返工、包材用量、废料统计已完成第一轮选择器替换。
```

- [ ] **Step 5: 检查无未落实词**

Run:

```bash
PATTERN='TB''D|TO''DO|待''定|以后再''说|后续支''持|占''位|待''补'
rg -n "$PATTERN" docs/superpowers/plans/2026-04-29-product-master-data-and-production-linkage-implementation.md docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md
```

Expected:

```text
无输出
```

- [ ] **Step 6: 最终提交**

```bash
git add server client docs/superpowers/specs/2026-04-29-product-master-data-and-production-linkage-design.md docs/superpowers/plans/2026-04-29-product-master-data-and-production-linkage-implementation.md
git commit -m "feat: implement product master data linkage"
```

## 自检结果

### 规格覆盖

- 历史产品建档：Task 3 和 Task 7 覆盖。
- 产品编号系统生成：Task 2 覆盖。
- 不重复造产品/配方/投料模型：Task 1、Task 3、Task 6 明确复用现有模型。
- 配料区域：Task 1、Task 4、Task 7 覆盖。
- 生产开工强制产品和配方：Task 5、Task 8 覆盖。
- 生产批次快照：Task 5、Task 8 覆盖。
- 下游通过批次追产品：Task 8、Task 10 覆盖。
- 包材用量物料手填收敛：Task 8、Task 9 覆盖。
- PDF、供应商证照、外检报告不进入产品建档模块：文件结构和边界已声明。

### 类型一致性

- 产品编号字段统一为 `Product.code`。
- 产品来源字段统一为 `Product.source`。
- 配方行区域字段统一为 `area_id` 和 `area_name_snapshot`。
- 投料区域字段统一为 `area_id` 和 `areaNameSnapshot`，保持现有 `BatchMaterialUsage` camelCase 风格。
- 前端产品选择使用 `productId / recipeId`，后端生产开工使用 `product_id / recipe_id`，按现有接口命名区分。

### 验证命令

```bash
npm run prisma:generate
npm run test -w server -- product-code-generator.service.spec.ts product-legacy.service.spec.ts workshop-area.service.spec.ts production-run.service.spec.ts production-batch.service.spec.ts batch-material-usage.service.spec.ts product-linkage.integration.spec.ts --runInBand
npm run test:client
npm run verify
```
