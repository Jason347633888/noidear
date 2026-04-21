# 食品安全 SaaS 全量实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Vault 中 260 份四级表单归纳出的全部功能模块完整实施到 SaaS，打通追溯链路并通过 Chrome DevTools MCP 完成端到端演练验证。

**Architecture:** NestJS 后端遵循 Controller→Service→DTO→Module 四件套模式；前端遵循 `<script setup>` + Element Plus + API client 模式。新模块均需在 `server/src/app.module.ts` 注册、`client/src/router/index.ts` 添加路由、`client/src/views/Layout.vue` 添加菜单项（按需）。Prisma 模型已存在的实体直接加 controller/service；缺模型的需先在 schema.prisma 末尾添加模型再 `npx prisma db push`。

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL, Vue 3 + Element Plus, Chrome DevTools MCP

**Reference files:**
- Design doc: `docs/plans/2026-04-21-full-food-safety-saas-design.md`
- Existing pattern: `server/src/modules/environment-record/` (backend)
- Existing pattern: `client/src/views/environment-record/EnvironmentRecordList.vue` (frontend)
- Existing API pattern: `client/src/api/environment-record.ts`
- Schema: `server/src/prisma/schema.prisma`
- App module: `server/src/app.module.ts`
- Router: `client/src/router/index.ts`
- Menu: `client/src/views/Layout.vue`

---

## GROUP 1：追溯链路关键节点

---

### Task 1：来料检验前端页面

**背景：** 后端 API 完整（`/incoming-inspections` GET/POST），前端仅有菜单项无页面。页面需支持：列表查看、新建检验单（含多条检验项动态行）。

**Files:**
- Create: `client/src/api/incoming-inspection.ts`
- Create: `client/src/views/incoming-inspection/IncomingInspectionList.vue`
- Modify: `client/src/router/index.ts` (添加路由，已有菜单项路径 `/incoming-inspections`)

**Step 1: 创建 API client**

```typescript
// client/src/api/incoming-inspection.ts
import request from './request';

export interface InspectionResult {
  item_name: string;
  actual_value?: string;
  is_pass: boolean;
}

export interface IncomingInspection {
  id: string;
  material_batch_id: string;
  overall_result: string;
  sample_qty: number | null;
  sample_unit: string | null;
  disposition: string | null;
  notes: string | null;
  inspected_at: string;
  inspector_id: string | null;
  results: InspectionResult[];
  material_batch?: {
    id: string;
    lot_number: string;
    material?: { id: string; name: string; code: string };
    supplier?: { id: string; name: string };
  };
}

export interface CreateInspectionPayload {
  material_batch_id: string;
  overall_result: string;
  sample_qty?: number;
  sample_unit?: string;
  disposition?: string;
  notes?: string;
  results: InspectionResult[];
}

export const OVERALL_RESULT_MAP: Record<string, string> = {
  pass: '合格',
  fail: '不合格',
  conditional_pass: '有条件合格',
};

export const incomingInspectionApi = {
  getList: () => request.get('/incoming-inspections'),
  create: (data: CreateInspectionPayload) => request.post('/incoming-inspections', data),
  getByBatch: (batchId: string) => request.get(`/incoming-inspections/batch/${batchId}`),
};
```

**Step 2: 创建前端页面**

```vue
<!-- client/src/views/incoming-inspection/IncomingInspectionList.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>来料检验</h2>
      <p class="page-subtitle">原辅料到货验收记录，检验结果驱动批次入库状态</p>
    </div>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>检验记录（共 {{ list.length }} 条）</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建检验单</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="物料名称" min-width="120">
          <template #default="{ row }">
            {{ row.material_batch?.material?.name ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column label="批次号" prop="material_batch_id" width="180" />
        <el-table-column label="供应商">
          <template #default="{ row }">
            {{ row.material_batch?.supplier?.name ?? '—' }}
          </template>
        </el-table-column>
        <el-table-column label="抽样数量">
          <template #default="{ row }">
            {{ row.sample_qty != null ? `${row.sample_qty} ${row.sample_unit ?? ''}` : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="总体结论" width="120">
          <template #default="{ row }">
            <el-tag :type="row.overall_result === 'pass' ? 'success' : row.overall_result === 'fail' ? 'danger' : 'warning'">
              {{ OVERALL_RESULT_MAP[row.overall_result] ?? row.overall_result }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="检验项通过" width="100">
          <template #default="{ row }">
            {{ row.results.filter((r: any) => r.is_pass).length }}/{{ row.results.length }}
          </template>
        </el-table-column>
        <el-table-column label="检验时间" width="160">
          <template #default="{ row }">{{ formatDate(row.inspected_at) }}</template>
        </el-table-column>
        <el-table-column label="备注" prop="notes" show-overflow-tooltip />
      </el-table>
    </el-card>

    <!-- 新建对话框 -->
    <el-dialog v-model="createVisible" title="新建来料检验单" width="680px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="物料批次ID" required>
          <el-input v-model="form.material_batch_id" placeholder="输入物料批次 ID" />
        </el-form-item>
        <el-form-item label="总体结论" required>
          <el-select v-model="form.overall_result" style="width: 100%">
            <el-option label="合格" value="pass" />
            <el-option label="有条件合格" value="conditional_pass" />
            <el-option label="不合格" value="fail" />
          </el-select>
        </el-form-item>
        <el-form-item label="抽样数量">
          <el-input-number v-model="form.sample_qty" :min="0" style="width: 50%" />
          <el-input v-model="form.sample_unit" placeholder="单位，如 kg" style="width: 48%; margin-left: 2%" />
        </el-form-item>
        <el-form-item label="处置方式">
          <el-input v-model="form.disposition" placeholder="如：退货、销毁、让步接收" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </el-form-item>

        <el-divider>检验项目</el-divider>
        <div v-for="(item, idx) in form.results" :key="idx" class="result-row">
          <el-input v-model="item.item_name" placeholder="检验项目名称" style="width: 35%" />
          <el-input v-model="item.actual_value" placeholder="实测值（选填）" style="width: 30%; margin: 0 8px" />
          <el-select v-model="item.is_pass" style="width: 22%">
            <el-option label="合格 ✓" :value="true" />
            <el-option label="不合格 ✗" :value="false" />
          </el-select>
          <el-button :icon="Delete" circle text type="danger" @click="removeResult(idx)" style="margin-left: 8px" />
        </div>
        <el-button text :icon="Plus" @click="addResult" style="margin-top: 8px">添加检验项</el-button>
      </el-form>

      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { incomingInspectionApi, OVERALL_RESULT_MAP, type IncomingInspection } from '@/api/incoming-inspection';

const list = ref<IncomingInspection[]>([]);
const loading = ref(false);
const createVisible = ref(false);
const submitting = ref(false);

const form = reactive({
  material_batch_id: '',
  overall_result: 'pass',
  sample_qty: undefined as number | undefined,
  sample_unit: '',
  disposition: '',
  notes: '',
  results: [{ item_name: '', actual_value: '', is_pass: true }],
});

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString('zh-CN') : '—';
}

function addResult() {
  form.results.push({ item_name: '', actual_value: '', is_pass: true });
}

function removeResult(idx: number) {
  form.results.splice(idx, 1);
}

function openCreate() {
  Object.assign(form, {
    material_batch_id: '', overall_result: 'pass',
    sample_qty: undefined, sample_unit: '', disposition: '', notes: '',
    results: [{ item_name: '', actual_value: '', is_pass: true }],
  });
  createVisible.value = true;
}

async function loadList() {
  loading.value = true;
  try {
    const res: any = await incomingInspectionApi.getList();
    list.value = res.data ?? res;
  } finally {
    loading.value = false;
  }
}

async function submitCreate() {
  if (!form.material_batch_id) return ElMessage.warning('请填写物料批次 ID');
  if (!form.results.some(r => r.item_name)) return ElMessage.warning('请至少填写一个检验项目');
  submitting.value = true;
  try {
    await incomingInspectionApi.create({
      ...form,
      results: form.results.filter(r => r.item_name),
    });
    ElMessage.success('检验单创建成功');
    createVisible.value = false;
    await loadList();
  } finally {
    submitting.value = false;
  }
}

onMounted(loadList);
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; }
.page-subtitle { color: #909399; margin: 0; font-size: 13px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.result-row { display: flex; align-items: center; margin-bottom: 8px; }
</style>
```

**Step 3: 在 router 中注册路由**

在 `client/src/router/index.ts` 找到 `来料与追溯` 相关的路由区域（约第 570 行），添加：

```typescript
{
  path: 'incoming-inspections',
  name: 'IncomingInspectionList',
  component: () => import('@/views/incoming-inspection/IncomingInspectionList.vue'),
  meta: { title: '来料检验' },
},
```

**Step 4: 启动后端，验证 API 可访问**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx jest src/modules/incoming-inspection/ --passWithNoTests 2>&1 | grep -E "PASS|FAIL|Tests:"
```

Expected: `PASS` 或 `Tests: X passed`

**Step 5: 启动前端，检查页面不报错**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npx tsc --noEmit 2>&1 | grep -E "error|Error" | head -10
```

Expected: 无报错输出

**Step 6: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && git add client/src/api/incoming-inspection.ts client/src/views/incoming-inspection/ client/src/router/index.ts && git commit -m "feat: 来料检验前端页面（列表+新建表单）"
```

---

### Task 2：产品目录后端（Product Catalog Backend）

**背景：** `Product`、`Recipe`、`RecipeLine`、`ProcessStep` 模型已存在于 schema.prisma，但无对应后端 controller/service/module。本 Task 只建产品档案 CRUD，配方在 Task 3。

**Files:**
- Create: `server/src/modules/product/product.controller.ts`
- Create: `server/src/modules/product/product.service.ts`
- Create: `server/src/modules/product/product.module.ts`
- Create: `server/src/modules/product/dto/create-product.dto.ts`
- Create: `server/src/modules/product/dto/update-product.dto.ts`
- Modify: `server/src/app.module.ts` (import ProductModule)

**Step 1: 创建 DTO**

```typescript
// server/src/modules/product/dto/create-product.dto.ts
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsNumber() net_weight?: number;
  @IsOptional() @IsString() weight_unit?: string;
  @IsOptional() @IsString() label_claims?: string;
}

// server/src/modules/product/dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**Step 2: 创建 Service**

```typescript
// server/src/modules/product/product.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, company_id: '1' },
    });
  }

  findAll() {
    return this.prisma.product.findMany({
      where: { company_id: '1', deleted_at: null },
      include: { recipes: { where: { status: 'active' }, take: 1 } },
      orderBy: { created_at: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { recipes: { include: { lines: { include: { material: true } }, steps: true } } },
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deleted_at: new Date(), status: 'discontinued' },
    });
  }
}
```

**Step 3: 创建 Controller**

```typescript
// server/src/modules/product/product.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private service: ProductService) {}

  @Post() create(@Body() dto: CreateProductDto) { return this.service.create(dto); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateProductDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
```

**Step 4: 创建 Module**

```typescript
// server/src/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

**Step 5: 注册到 AppModule**

在 `server/src/app.module.ts` 的 imports 数组中添加 `ProductModule`，在文件顶部添加对应 import。

**Step 6: 验证编译**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -10
```

Expected: 无输出

**Step 7: Commit**

```bash
git add server/src/modules/product/ server/src/app.module.ts && git commit -m "feat: 产品目录后端 CRUD（Product controller/service/module）"
```

---

### Task 3：配方管理后端（Recipe Backend）

**背景：** `Recipe`、`RecipeLine`、`ProcessStep` 模型已在 schema，在 ProductModule 中扩展配方 CRUD 端点。

**Files:**
- Create: `server/src/modules/product/recipe.service.ts`
- Create: `server/src/modules/product/recipe.controller.ts`
- Create: `server/src/modules/product/dto/create-recipe.dto.ts`
- Modify: `server/src/modules/product/product.module.ts` (注册 RecipeController 和 RecipeService)

**Step 1: 创建 Recipe DTO**

```typescript
// server/src/modules/product/dto/create-recipe.dto.ts
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeLineDto {
  @IsString() material_id: string;
  @IsNumber() qty_per_batch: number;
  @IsString() unit: string;
  @IsOptional() @IsBoolean() is_critical?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class CreateRecipeDto {
  @IsString() product_id: string;
  @IsOptional() @IsString() version_note?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  lines: RecipeLineDto[];
}
```

**Step 2: 创建 Recipe Service**

```typescript
// server/src/modules/product/recipe.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    // 归档当前 active 版本
    await this.prisma.recipe.updateMany({
      where: { product_id: dto.product_id, status: 'active', company_id: '1' },
      data: { status: 'archived' },
    });
    // 取最新版本号
    const latest = await this.prisma.recipe.findFirst({
      where: { product_id: dto.product_id, company_id: '1' },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;
    return this.prisma.recipe.create({
      data: {
        company_id: '1',
        product_id: dto.product_id,
        version: nextVersion,
        version_note: dto.version_note,
        status: 'active',
        lines: { create: dto.lines },
      },
      include: { lines: { include: { material: true } } },
    });
  }

  findByProduct(productId: string) {
    return this.prisma.recipe.findMany({
      where: { product_id: productId, company_id: '1' },
      include: { lines: { include: { material: true } }, steps: true },
      orderBy: { version: 'desc' },
    });
  }

  findActive(productId: string) {
    return this.prisma.recipe.findFirst({
      where: { product_id: productId, status: 'active', company_id: '1' },
      include: { lines: { include: { material: true } }, steps: true },
    });
  }
}
```

**Step 3: 创建 Recipe Controller**

```typescript
// server/src/modules/product/recipe.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class RecipeController {
  constructor(private service: RecipeService) {}

  @Post(':productId/recipes')
  create(@Param('productId') productId: string, @Body() dto: CreateRecipeDto) {
    return this.service.create({ ...dto, product_id: productId });
  }

  @Get(':productId/recipes')
  findByProduct(@Param('productId') productId: string) {
    return this.service.findByProduct(productId);
  }

  @Get(':productId/recipes/active')
  findActive(@Param('productId') productId: string) {
    return this.service.findActive(productId);
  }
}
```

**Step 4: 更新 ProductModule 注册新 controller/service**

在 `product.module.ts` 的 `controllers` 数组中添加 `RecipeController`，`providers` 中添加 `RecipeService`，`exports` 中添加 `RecipeService`。

**Step 5: 验证编译和测试**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

Expected: 无报错

**Step 6: Commit**

```bash
git add server/src/modules/product/ && git commit -m "feat: 配方管理后端（Recipe CRUD，含版本管理）"
```

---

### Task 4：产品+配方前端 + 配料表填写入口

**背景：** 产品目录列表、配方查看/创建页面，以及生产开工时的配料表填写（IngredientSheet）——这是 MaterialLot→ProductionBatch 桥接的操作入口。

**Files:**
- Create: `client/src/api/product.ts`
- Create: `client/src/views/product/ProductList.vue`
- Create: `client/src/views/product/RecipeEditor.vue`
- Create: `client/src/views/production/IngredientSheetForm.vue`
- Modify: `client/src/router/index.ts`
- Modify: `client/src/views/Layout.vue` (添加"产品研发"菜单组)

**Step 1: 创建 product API client**

```typescript
// client/src/api/product.ts
import request from './request';

export interface Product {
  id: string; code: string; name: string; spec?: string;
  net_weight?: number; weight_unit?: string; status: string;
  recipes?: Recipe[];
}

export interface RecipeLine {
  id: string; material_id: string; qty_per_batch: number; unit: string;
  is_critical: boolean; notes?: string;
  material?: { id: string; name: string; code: string };
}

export interface Recipe {
  id: string; product_id: string; version: number;
  version_note?: string; status: string;
  lines: RecipeLine[];
}

export const productApi = {
  getList: () => request.get('/products'),
  getOne: (id: string) => request.get(`/products/${id}`),
  create: (data: Partial<Product>) => request.post('/products', data),
  update: (id: string, data: Partial<Product>) => request.patch(`/products/${id}`, data),
  getRecipes: (productId: string) => request.get(`/products/${productId}/recipes`),
  getActiveRecipe: (productId: string) => request.get(`/products/${productId}/recipes/active`),
  createRecipe: (productId: string, data: { version_note?: string; lines: Partial<RecipeLine>[] }) =>
    request.post(`/products/${productId}/recipes`, data),
};
```

**Step 2: 创建产品列表页 ProductList.vue**

```vue
<!-- client/src/views/product/ProductList.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>产品目录</h2>
      <p class="page-subtitle">产品档案管理，每个产品可关联多版本配方</p>
    </div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>产品（{{ list.length }} 个）</span>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建产品</el-button>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="产品编号" prop="code" width="120" />
        <el-table-column label="产品名称" prop="name" />
        <el-table-column label="规格" prop="spec" />
        <el-table-column label="净含量">
          <template #default="{ row }">
            {{ row.net_weight != null ? `${row.net_weight} ${row.weight_unit ?? ''}` : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="当前配方版本">
          <template #default="{ row }">
            <el-tag v-if="row.recipes?.[0]">V{{ row.recipes[0].version }}</el-tag>
            <span v-else class="text-muted">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在产' : '停产' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button text type="primary" @click="viewRecipe(row)">配方</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createVisible" title="新建产品" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="产品编号" required><el-input v-model="form.code" /></el-form-item>
        <el-form-item label="产品名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="规格描述"><el-input v-model="form.spec" /></el-form-item>
        <el-form-item label="净含量">
          <el-input-number v-model="form.net_weight" :min="0" style="width:50%" />
          <el-input v-model="form.weight_unit" placeholder="单位" style="width:48%; margin-left:2%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { productApi, type Product } from '@/api/product';

const router = useRouter();
const list = ref<Product[]>([]);
const loading = ref(false);
const createVisible = ref(false);
const submitting = ref(false);
const form = reactive({ code: '', name: '', spec: '', net_weight: undefined as number | undefined, weight_unit: '' });

async function loadList() {
  loading.value = true;
  try { list.value = (await productApi.getList() as any).data ?? []; }
  finally { loading.value = false; }
}

function openCreate() {
  Object.assign(form, { code: '', name: '', spec: '', net_weight: undefined, weight_unit: '' });
  createVisible.value = true;
}

async function submitCreate() {
  if (!form.code || !form.name) return ElMessage.warning('产品编号和名称必填');
  submitting.value = true;
  try {
    await productApi.create(form);
    ElMessage.success('产品创建成功');
    createVisible.value = false;
    await loadList();
  } finally { submitting.value = false; }
}

function viewRecipe(product: Product) {
  router.push(`/products/${product.id}/recipe`);
}

onMounted(loadList);
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; }
.page-subtitle { color: #909399; margin: 0; font-size: 13px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-muted { color: #909399; }
</style>
```

**Step 3: 创建配方编辑器 RecipeEditor.vue**

```vue
<!-- client/src/views/product/RecipeEditor.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="router.back()" style="margin-right: 12px" />
      <h2>{{ product?.name ?? '' }} — 配方管理</h2>
    </div>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card header="历史版本">
          <el-timeline>
            <el-timeline-item
              v-for="r in recipes" :key="r.id"
              :type="r.status === 'active' ? 'primary' : 'info'"
              :timestamp="`V${r.version} · ${r.status === 'active' ? '当前版本' : '已归档'}`"
              @click="selectedRecipe = r"
              style="cursor:pointer"
            >
              {{ r.version_note ?? '无变更说明' }}
            </el-timeline-item>
          </el-timeline>
          <el-button type="primary" :icon="Plus" @click="openNewRecipe" style="margin-top:12px; width:100%">
            新建版本
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card :header="selectedRecipe ? `V${selectedRecipe.version} 配方明细` : '请选择版本'">
          <el-table v-if="selectedRecipe" :data="selectedRecipe.lines" stripe>
            <el-table-column label="物料名称">
              <template #default="{ row }">{{ row.material?.name ?? row.material_id }}</template>
            </el-table-column>
            <el-table-column label="目标用量">
              <template #default="{ row }">{{ row.qty_per_batch }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="关键配料" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.is_critical" type="danger" size="small">CCP</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" prop="notes" show-overflow-tooltip />
          </el-table>
          <el-empty v-else description="请从左侧选择一个版本" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建版本对话框 -->
    <el-dialog v-model="newRecipeVisible" title="新建配方版本" width="700px">
      <el-form :model="newForm" label-width="90px">
        <el-form-item label="变更说明">
          <el-input v-model="newForm.version_note" placeholder="描述本次配方变更的原因" />
        </el-form-item>
      </el-form>
      <div style="margin: 12px 0 8px; font-weight: 500;">配料明细：</div>
      <div v-for="(line, idx) in newForm.lines" :key="idx" style="display:flex; gap:8px; margin-bottom:8px">
        <el-input v-model="line.material_id" placeholder="物料 ID" style="flex:2" />
        <el-input-number v-model="line.qty_per_batch" :min="0" placeholder="用量" style="flex:1" />
        <el-input v-model="line.unit" placeholder="单位" style="flex:1" />
        <el-checkbox v-model="line.is_critical">关键</el-checkbox>
        <el-button :icon="Delete" circle text type="danger" @click="newForm.lines.splice(idx,1)" />
      </div>
      <el-button text :icon="Plus" @click="newForm.lines.push({ material_id:'', qty_per_batch:0, unit:'kg', is_critical:false })">
        添加配料行
      </el-button>
      <template #footer>
        <el-button @click="newRecipeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitNewRecipe">保存新版本</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Plus, Delete, ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { productApi, type Product, type Recipe } from '@/api/product';

const router = useRouter();
const route = useRoute();
const productId = route.params.productId as string;

const product = ref<Product | null>(null);
const recipes = ref<Recipe[]>([]);
const selectedRecipe = ref<Recipe | null>(null);
const newRecipeVisible = ref(false);
const submitting = ref(false);
const newForm = reactive({ version_note: '', lines: [{ material_id: '', qty_per_batch: 0, unit: 'kg', is_critical: false }] });

async function load() {
  const [p, r] = await Promise.all([productApi.getOne(productId), productApi.getRecipes(productId)]);
  product.value = (p as any).data ?? p;
  recipes.value = (r as any).data ?? r;
  selectedRecipe.value = recipes.value.find(r => r.status === 'active') ?? recipes.value[0] ?? null;
}

function openNewRecipe() {
  Object.assign(newForm, { version_note: '', lines: [{ material_id: '', qty_per_batch: 0, unit: 'kg', is_critical: false }] });
  newRecipeVisible.value = true;
}

async function submitNewRecipe() {
  submitting.value = true;
  try {
    await productApi.createRecipe(productId, newForm);
    ElMessage.success('配方版本创建成功，旧版本已自动归档');
    newRecipeVisible.value = false;
    await load();
  } finally { submitting.value = false; }
}

onMounted(load);
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; }
</style>
```

**Step 4: 创建配料表填写页面 IngredientSheetForm.vue**

```vue
<!-- client/src/views/production/IngredientSheetForm.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>配料表填写</h2>
      <p class="page-subtitle">开工时按产品配方填写，系统自动生成生产批次和投料记录</p>
    </div>

    <el-card style="max-width: 800px">
      <el-steps :active="step" simple style="margin-bottom: 24px">
        <el-step title="选产品" />
        <el-step title="确认配方" />
        <el-step title="填写投料" />
        <el-step title="提交生成批次" />
      </el-steps>

      <!-- Step 0: 选产品 -->
      <div v-if="step === 0">
        <el-form-item label="选择产品">
          <el-select v-model="selectedProductId" filterable placeholder="搜索产品" style="width:100%"
            @change="onProductChange">
            <el-option v-for="p in products" :key="p.id" :label="`${p.code} · ${p.name}`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-button type="primary" :disabled="!selectedProductId" @click="step = 1">下一步</el-button>
      </div>

      <!-- Step 1: 确认配方 -->
      <div v-if="step === 1">
        <el-alert v-if="!activeRecipe" type="warning" :closable="false"
          title="该产品没有启用的配方，请先在产品目录中配置配方" style="margin-bottom: 16px" />
        <template v-else>
          <p><strong>{{ selectedProduct?.name }}</strong> — 配方 V{{ activeRecipe.version }}</p>
          <el-table :data="activeRecipe.lines" stripe size="small" style="margin-bottom: 16px">
            <el-table-column label="物料" prop="material.name" />
            <el-table-column label="目标用量">
              <template #default="{ row }">{{ row.qty_per_batch }} {{ row.unit }}</template>
            </el-table-column>
            <el-table-column label="关键" width="60">
              <template #default="{ row }"><el-tag v-if="row.is_critical" type="danger" size="small">CCP</el-tag></template>
            </el-table-column>
          </el-table>
        </template>
        <div style="display:flex; gap:8px">
          <el-button @click="step = 0">上一步</el-button>
          <el-button type="primary" :disabled="!activeRecipe" @click="initIngredientRows(); step = 2">确认配方，填写投料</el-button>
        </div>
      </div>

      <!-- Step 2: 填写投料实际用量和批次 -->
      <div v-if="step === 2">
        <el-form-item label="生产日期">
          <el-date-picker v-model="productionDate" type="date" style="width:100%" />
        </el-form-item>
        <el-form-item label="计划产量">
          <el-input-number v-model="plannedQty" :min="1" /> 件/批
        </el-form-item>
        <div style="margin: 16px 0 8px; font-weight: 500;">投料明细：</div>
        <div v-for="(row, idx) in ingredientRows" :key="idx"
          :style="{ background: row.is_critical ? '#fef0f0' : '', padding: '8px', marginBottom: '8px', borderRadius: '4px' }">
          <div style="display:flex; gap:8px; align-items:center">
            <span style="flex:1.5; font-size:13px">{{ row.material_name }}</span>
            <el-input v-model="row.lot_id" placeholder="物料批次 ID" style="flex:2" />
            <el-input-number v-model="row.actual_qty" :min="0" style="flex:1" />
            <span style="font-size:12px; color:#909399">{{ row.unit }}</span>
            <el-tag v-if="row.is_critical" type="danger" size="small">CCP</el-tag>
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:16px">
          <el-button @click="step = 1">上一步</el-button>
          <el-button type="primary" @click="step = 3">预览提交</el-button>
        </div>
      </div>

      <!-- Step 3: 预览并提交 -->
      <div v-if="step === 3">
        <el-descriptions :column="2" border style="margin-bottom:16px">
          <el-descriptions-item label="产品">{{ selectedProduct?.name }}</el-descriptions-item>
          <el-descriptions-item label="配方版本">V{{ activeRecipe?.version }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ productionDate }}</el-descriptions-item>
          <el-descriptions-item label="计划产量">{{ plannedQty }}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="ingredientRows" stripe size="small">
          <el-table-column label="物料" prop="material_name" />
          <el-table-column label="批次 ID" prop="lot_id" />
          <el-table-column label="实际用量">
            <template #default="{ row }">{{ row.actual_qty }} {{ row.unit }}</template>
          </el-table-column>
        </el-table>
        <div style="display:flex; gap:8px; margin-top:16px">
          <el-button @click="step = 2">修改</el-button>
          <el-button type="primary" :loading="submitting" @click="submitSheet">确认提交，生成生产批次</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { productApi, type Product, type Recipe } from '@/api/product';
import request from '@/api/request';

const step = ref(0);
const products = ref<Product[]>([]);
const selectedProductId = ref('');
const activeRecipe = ref<Recipe | null>(null);
const productionDate = ref('');
const plannedQty = ref(1);
const ingredientRows = ref<{ material_id: string; material_name: string; lot_id: string; actual_qty: number; unit: string; is_critical: boolean }[]>([]);
const submitting = ref(false);

const selectedProduct = computed(() => products.value.find(p => p.id === selectedProductId.value));

async function onProductChange() {
  activeRecipe.value = null;
  if (!selectedProductId.value) return;
  const res: any = await productApi.getActiveRecipe(selectedProductId.value);
  activeRecipe.value = res.data ?? res;
}

function initIngredientRows() {
  ingredientRows.value = (activeRecipe.value?.lines ?? []).map(l => ({
    material_id: l.material_id,
    material_name: l.material?.name ?? l.material_id,
    lot_id: '',
    actual_qty: Number(l.qty_per_batch),
    unit: l.unit,
    is_critical: l.is_critical,
  }));
}

async function submitSheet() {
  if (ingredientRows.value.some(r => !r.lot_id)) return ElMessage.warning('请填写所有物料的批次 ID');
  submitting.value = true;
  try {
    await request.post('/batch-trace/ingredient-sheet', {
      product_id: selectedProductId.value,
      recipe_id: activeRecipe.value?.id,
      production_date: productionDate.value,
      planned_qty: plannedQty.value,
      ingredients: ingredientRows.value.map(r => ({
        material_batch_id: r.lot_id,
        material_id: r.material_id,
        quantity: r.actual_qty,
        unit: r.unit,
      })),
    });
    ElMessage.success('生产批次已生成，投料记录已保存');
    step.value = 0;
  } finally { submitting.value = false; }
}

onMounted(async () => {
  products.value = (await productApi.getList() as any).data ?? [];
});
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px; }
.page-subtitle { color: #909399; margin: 0; font-size: 13px; }
</style>
```

**Step 5: 添加配料表 API 后端端点**

在 `server/src/modules/batch-trace/` 找到主 controller，添加：

```typescript
// 在 batch-trace.controller.ts 或 production-batch.controller.ts 中添加：
@Post('ingredient-sheet')
@UseGuards(JwtAuthGuard)
async createFromIngredientSheet(@Body() body: {
  product_id: string;
  recipe_id: string;
  production_date: string;
  planned_qty: number;
  ingredients: { material_batch_id: string; material_id: string; quantity: number; unit: string }[];
}, @Request() req: any) {
  // 创建 ProductionBatch
  const batch = await this.prisma.productionBatch.create({
    data: {
      company_id: 1,
      product_id: body.product_id,
      recipe_id: body.recipe_id,
      planned_qty: body.planned_qty,
      production_date: new Date(body.production_date),
      created_by: req.user.id,
    },
  });
  // 创建 BatchMaterialUsage 记录
  await Promise.all(body.ingredients.map(ing =>
    this.prisma.batchMaterialUsage.create({
      data: {
        productionBatchId: batch.id,
        materialBatchId: ing.material_batch_id,
        quantity: ing.quantity,
      },
    })
  ));
  return batch;
}
```

**Step 6: 添加路由和菜单**

在 `client/src/router/index.ts` 添加：
```typescript
{ path: 'products', name: 'ProductList', component: () => import('@/views/product/ProductList.vue'), meta: { title: '产品目录' } },
{ path: 'products/:productId/recipe', name: 'RecipeEditor', component: () => import('@/views/product/RecipeEditor.vue'), meta: { title: '配方管理' } },
{ path: 'ingredient-sheet', name: 'IngredientSheetForm', component: () => import('@/views/production/IngredientSheetForm.vue'), meta: { title: '配料表填写' } },
```

在 `client/src/views/Layout.vue` 的 menuItems 中添加新组（在"来料与追溯"之前）：
```typescript
{
  title: '产品研发',
  icon: Tickets,
  children: [
    { path: '/products', title: '产品目录', icon: Goods },
    { path: '/ingredient-sheet', title: '配料表填写', icon: EditPen },
  ],
},
```

**Step 7: 类型检查**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

Expected: 无报错

**Step 8: Commit**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear && git add client/src/api/product.ts client/src/views/product/ client/src/views/production/ client/src/router/index.ts client/src/views/Layout.vue server/src/modules/batch-trace/ && git commit -m "feat: 产品目录+配方管理前端+配料表填写入口"
```

---

## GROUP 2：缺口实体实施

每个 Task 遵循相同模式：如果 Prisma 模型缺失先在 schema 末尾添加 → db push → 后端 4 件套 → 前端页面 → 路由 → commit。

---

### Task 5：ReworkRecord（回料/返工记录）

**背景：** 模型已在 schema（line 2498），需后端 + 前端。字段：source_batch_id（回料来源批次）、target_batch_id（加入的目标批次）、rework_qty、rework_reason、rework_date。

**Files:**
- Create: `server/src/modules/rework-record/rework-record.controller.ts`
- Create: `server/src/modules/rework-record/rework-record.service.ts`
- Create: `server/src/modules/rework-record/rework-record.module.ts`
- Create: `server/src/modules/rework-record/dto/create-rework-record.dto.ts`
- Create: `client/src/api/rework-record.ts`
- Create: `client/src/views/rework-record/ReworkRecordList.vue`
- Modify: `server/src/app.module.ts`, `client/src/router/index.ts`, `client/src/views/Layout.vue`

**Step 1: 确认 Prisma 模型结构**

```bash
grep -A 15 "model ReworkRecord" /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

读取输出，确认模型字段，以此为准写 DTO。

**Step 2: DTO**

```typescript
// server/src/modules/rework-record/dto/create-rework-record.dto.ts
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateReworkRecordDto {
  @IsString() source_batch_id: string;       // 回料来源批次 ID
  @IsOptional() @IsString() target_batch_id?: string; // 加入目标批次 ID
  @IsNumber() rework_qty: number;
  @IsString() rework_reason: string;
  @IsDateString() rework_date: string;
  @IsOptional() @IsString() rework_process?: string;
  @IsOptional() @IsString() notes?: string;
}
```

**Step 3: Service**

```typescript
// server/src/modules/rework-record/rework-record.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReworkRecordDto } from './dto/create-rework-record.dto';

@Injectable()
export class ReworkRecordService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateReworkRecordDto, operatorId: string) {
    return this.prisma.reworkRecord.create({
      data: { ...dto, company_id: 1, operator_id: operatorId, rework_date: new Date(dto.rework_date) },
    });
  }

  findAll() {
    return this.prisma.reworkRecord.findMany({
      where: { company_id: 1 },
      orderBy: { rework_date: 'desc' },
      take: 100,
    });
  }
}
```

**Step 4: Controller + Module（遵循 Task 2 相同模式）**

Controller: `@Controller('rework-records')` with `@Post()` and `@Get()`
Module: 注册 Controller 和 Service

**Step 5: 前端页面**（遵循 EnvironmentRecordList.vue 结构，字段替换为回料字段）

关键字段：来源批次号、目标批次号、回料重量、回料原因、返工日期、处理方式

**Step 6: 注册路由 + 菜单**

路由: `{ path: 'rework-records', name: 'ReworkRecordList', component: () => import('@/views/rework-record/ReworkRecordList.vue') }`
菜单: 加入"过程与人员"组下

**Step 7: 测试编译**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

**Step 8: Commit**

```bash
git add server/src/modules/rework-record/ client/src/views/rework-record/ client/src/api/rework-record.ts server/src/app.module.ts client/src/router/index.ts client/src/views/Layout.vue && git commit -m "feat: 回料/返工记录模块（ReworkRecord）"
```

---

### Task 6：FragileItemInspection（玻璃及硬塑完整性检查）

**背景：** 模型已在 schema（line 2779），BRCGS 4.9.3 强制要求。字段：item_name（易碎品名称）、preset_qty（预设数量）、check_method（检查方式）、is_complete（是否完整）、check_date。

**Files:**（同 Task 5 结构，路径替换为 `fragile-item-inspection`）

**Step 1: 读取模型**
```bash
grep -A 15 "model FragileItemInspection" /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

**Step 2-8:** 遵循 Task 5 完全相同模式，路径前缀替换为 `fragile-item-inspection`，字段替换为易碎品检查字段。

菜单加入"质量合规"组下。

**Commit:**
```bash
git commit -m "feat: 玻璃及硬塑完整性检查模块（FragileItemInspection）"
```

---

### Task 7：变更全流程模块（ChangeVerificationRecord + ChangeComplianceRecord + ChangeApproval）

**背景：** `ChangeVerificationRecord` 模型存在，`ChangeComplianceRecord` 和 `ChangeApproval` 不存在需添加。三者组成完整的变更管理审批链：ChangeEvent → 合规性评估 → 验证记录 → 多部门会签审批。

**Files:**
- Modify: `server/src/prisma/schema.prisma` (添加 ChangeComplianceRecord、ChangeApproval 模型)
- Create: `server/src/modules/change-event/change-compliance.service.ts`
- Create: `server/src/modules/change-event/change-verification.service.ts`
- Create: `server/src/modules/change-event/change-approval.service.ts`
- Modify: `server/src/modules/change-event/change-event.module.ts`
- Create: 对应 DTOs
- Create: `client/src/views/change-event/ChangeFlowDetail.vue`

**Step 1: 在 schema.prisma 末尾添加两个缺失模型**

```prisma
model ChangeComplianceRecord {
  id                  String      @id @default(cuid())
  company_id          Int
  change_event_id     String
  change_event        ChangeEvent @relation(fields: [change_event_id], references: [id])
  material_type       String?     // 配料类型
  has_allergen        Boolean     @default(false)
  allergen_type       String?
  is_gmo              Boolean     @default(false)
  applicable_standard String?
  gb2760_compliant    Boolean?
  dosage_compliant    Boolean?
  compliance_conclusion String?
  affects_ccp         Boolean     @default(false)
  food_safety_risk    String?     // 'high'|'medium'|'low'|'na'
  label_update_needed Boolean     @default(false)
  label_measures      String?
  evaluator_id        String?
  evaluated_at        DateTime?
  created_at          DateTime    @default(now())
  updated_at          DateTime    @updatedAt

  @@map("change_compliance_records")
}

model ChangeApproval {
  id              String      @id @default(cuid())
  company_id      Int
  change_event_id String
  change_event    ChangeEvent @relation(fields: [change_event_id], references: [id])
  department      String      // 'quality'|'product_dev'|'manufacturing'|'food_safety_team'|'reviewer'
  opinion         String?
  signer_id       String?
  signed_at       DateTime?
  status          String      @default("pending") // 'pending'|'approved'|'rejected'
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt

  @@map("change_approvals")
}
```

**Step 2: 在 ChangeEvent 模型中添加反向关联**

在 `schema.prisma` 中找到 `model ChangeEvent`，在 relations 部分添加：
```prisma
compliance_records  ChangeComplianceRecord[]
approvals           ChangeApproval[]
```

**Step 3: 执行 db push**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss
```

Expected: `🚀  Your database is now in sync with your Prisma schema.`

**Step 4: 创建 DTOs 和 Services**

ChangeComplianceRecord DTO 关键字段：change_event_id, material_type, has_allergen, gb2760_compliant, compliance_conclusion, affects_ccp, food_safety_risk
ChangeApproval DTO 关键字段：change_event_id, department, opinion, status

Service 方法：create、findByChangeEvent、updateStatus（审批通过/拒绝）

**Step 5: 添加 API 端点到 change-event.controller.ts**

```typescript
@Post(':id/compliance')
createCompliance(@Param('id') id: string, @Body() dto: CreateComplianceDto) {
  return this.complianceService.create({ ...dto, change_event_id: id });
}

@Post(':id/approvals')
createApproval(@Param('id') id: string, @Body() dto: CreateApprovalDto) {
  return this.approvalService.create({ ...dto, change_event_id: id });
}

@Patch(':id/approvals/:approvalId')
updateApproval(@Param('approvalId') approvalId: string, @Body() dto: { status: string; opinion?: string }) {
  return this.approvalService.updateStatus(approvalId, dto);
}
```

**Step 6: 前端 ChangeFlowDetail.vue**

在现有 ChangeEventList 基础上，新增详情页展示变更审批流程状态（合规评估 → 验证 → 多部门会签），每个环节用 el-steps 可视化。

**Step 7: db push 后运行单元测试确认无破坏**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx jest --testPathIgnorePatterns="e2e-spec|integration-spec" --passWithNoTests 2>&1 | tail -5
```

Expected: `0 failed`

**Step 8: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/modules/change-event/ client/src/views/change-event/ && git commit -m "feat: 变更全流程模块（合规评估+验证记录+多部门会签审批）"
```

---

### Task 8：LineChangeCheckRecord（换产前检查确认记录）

**背景：** 需新增 Prisma 模型。记录换产前清场确认（人员到位、卫生、工器具、物料、工艺文件、标签确认、剩余物料处理等 9 项）。

**Step 1: 在 schema.prisma 末尾添加**

```prisma
model LineChangeCheckRecord {
  id                  String   @id @default(cuid())
  company_id          Int
  production_batch_id String?
  check_date          DateTime @db.Date
  product_name        String
  personnel_ready     Boolean  @default(false)
  sanitation_ok       Boolean  @default(false)
  tools_ready         Boolean  @default(false)
  materials_ready     Boolean  @default(false)
  process_doc_ok      Boolean  @default(false)
  label_confirmed     Boolean  @default(false)
  clearance_done      Boolean  @default(false)
  residual_handled    Boolean  @default(false)
  allergen_cleaned    Boolean  @default(false)
  metal_detection_ok  Boolean  @default(false)
  notes               String?
  checker_id          String?
  approved_by         String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@map("line_change_check_records")
}
```

**Step 2: db push**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx prisma db push --schema=src/prisma/schema.prisma --accept-data-loss
```

**Step 3-7:** 后端 4 件套 + 前端页面（遵循标准模式）

前端页面重点：用 el-checkbox-group 渲染 10 个清场确认项，全部勾选才能提交。

菜单加入"过程与人员"组下。

**Commit:**
```bash
git commit -m "feat: 换产前检查确认记录模块（LineChangeCheckRecord）"
```

---

### Task 9：FoodSafetyCultureRecord（食品安全文化建设记录）

**背景：** 需新增 Prisma 模型。BRCGS 1.2 条款（2020 第九版新增强制项），字段：month, action_measures（7 项固定行动措施 JSON array）, responsible_dept, execution_eval, annual_summary。

**Step 1: 添加模型**

```prisma
model FoodSafetyCultureRecord {
  id               String   @id @default(cuid())
  company_id       Int
  record_month     String   // YYYY-MM
  action_measures  Json     // 7 项行动措施及执行情况
  responsible_dept String?
  execution_eval   String?
  annual_summary   String?
  recorder_id      String?
  reviewer_id      String?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  @@map("food_safety_culture_records")
}
```

**Step 2: db push → 后端 4 件套 → 前端页面 → commit**

前端页面：月份选择器 + 7 行固定措施表格（措施名称固定，执行情况可填写）。
菜单加入"质量合规"组下。

**Commit:**
```bash
git commit -m "feat: 食品安全文化建设记录模块（FoodSafetyCultureRecord）"
```

---

### Task 10：AssetLoanRecord（资产借用记录）

**背景：** 需新增模型。目前主要是钥匙借用，可扩展至工器具、门禁卡。

```prisma
model AssetLoanRecord {
  id           String   @id @default(cuid())
  company_id   Int
  asset_type   String   // 'key'|'tool'|'access_card'|'other'
  asset_name   String
  custodian_id String?  // 管理人
  borrower_id  String?  // 借用人
  borrow_reason String?
  borrow_at    DateTime
  return_at    DateTime?
  notes        String?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@map("asset_loan_records")
}
```

db push → 后端 + 前端 → 菜单加入"系统管理"组下 → commit

**Commit:** `git commit -m "feat: 资产借用记录模块（AssetLoanRecord）"`

---

### Task 11：DocumentIssuance（表单领用记录）

**背景：** 模型已在 schema（line 2766），记录纸质表单领用情况。

**Step 1: 读取模型**
```bash
grep -A 12 "model DocumentIssuance" /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

后端 + 前端（简单 CRUD，字段：日期、内容类型枚举、份数、领用人）

菜单加入"系统管理"组下。

**Commit:** `git commit -m "feat: 表单领用记录模块（DocumentIssuance）"`

---

### Task 12：ExternalParty（外部方档案）

**背景：** 需新增模型。营销部客户 + 行政部收运单位，统一用 party_type 区分。

```prisma
model ExternalParty {
  id           String   @id @default(cuid())
  company_id   Int
  party_type   String   // 'customer'|'carrier'|'waste_collector'|'other'
  name         String
  contact_name String?
  phone        String?
  address      String?
  vehicle_no   String?  // 承运车牌
  notes        String?
  status       String   @default("active")
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@map("external_parties")
}
```

db push → 后端 + 前端（含 party_type 筛选器）→ 菜单加入"质量合规"组

**Commit:** `git commit -m "feat: 外部方档案模块（ExternalParty：客户+收运单位统一建模）"`

---

### Task 13：PackagingMaterialUsage（包装材料用量记录）

**背景：** 需新增模型，记录纸托/包装膜用量与废料。

```prisma
model PackagingMaterialUsage {
  id                  String   @id @default(cuid())
  company_id          Int
  production_batch_id String?
  record_date         DateTime @db.Date
  material_name       String   // 如"纸托"、"包装膜"
  used_weight         Decimal  @db.Decimal(10,3)
  waste_weight        Decimal  @db.Decimal(10,3)
  unit                String   @default("kg")
  notes               String?
  recorder_id         String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@map("packaging_material_usage")
}
```

db push → 后端 + 前端 → 菜单加入"过程与人员"组 → commit

**Commit:** `git commit -m "feat: 包装材料用量记录模块（PackagingMaterialUsage）"`

---

## GROUP 3：产品研发系统（复杂）

---

### Task 14：工艺步骤管理（ProcessStep Backend + Frontend）

**背景：** `ProcessStep` 模型已存在并与 Recipe 关联。需支持：添加工艺步骤到配方（步骤序号、步骤名、参数、CCP 关联、负责人角色）。

**Files:**
- Create: `server/src/modules/product/process-step.service.ts`
- Create: `server/src/modules/product/dto/create-process-step.dto.ts`
- Modify: `server/src/modules/product/recipe.controller.ts` (添加 steps 端点)
- Modify: `client/src/views/product/RecipeEditor.vue` (添加工艺步骤 tab)

**Step 1: 读取 ProcessStep 模型**
```bash
grep -A 20 "model ProcessStep" /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma
```

**Step 2: DTO**

```typescript
// server/src/modules/product/dto/create-process-step.dto.ts
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateProcessStepDto {
  @IsString() recipe_id: string;
  @IsNumber() step_no: number;
  @IsString() step_name: string;
  @IsOptional() @IsString() equipment?: string;
  @IsOptional() @IsString() parameters?: string; // JSON string 或 free text
  @IsOptional() @IsString() ccp_point_id?: string;
  @IsOptional() @IsNumber() duration_min?: number;
  @IsOptional() @IsString() notes?: string;
}
```

**Step 3: Service + 端点（添加到 recipe.controller.ts）**

```typescript
@Post(':productId/recipes/:recipeId/steps')
addStep(@Param('recipeId') recipeId: string, @Body() dto: CreateProcessStepDto) {
  return this.processStepService.create({ ...dto, recipe_id: recipeId });
}

@Get(':productId/recipes/:recipeId/steps')
getSteps(@Param('recipeId') recipeId: string) {
  return this.processStepService.findByRecipe(recipeId);
}
```

**Step 4: 更新 RecipeEditor.vue**

在配方详情中增加"工艺步骤"Tab，表格展示步骤序号、步骤名称、关键参数、CCP 关联，支持添加步骤。

**Step 5: Commit**
```bash
git commit -m "feat: 工艺步骤管理（ProcessStep Backend+Frontend）"
```

---

### Task 15：完整变更管理前端流程页

**背景：** 将 Task 7 的后端和现有 ChangeEventList 整合，呈现完整变更流程：提交变更申请 → 合规性评估 → 验证 → 多部门会签。

**Files:**
- Create: `client/src/views/change-event/ChangeFlowDetail.vue`
- Modify: `client/src/router/index.ts` (添加 `:id` 路由)

**关键 UI：**
- el-steps 展示流程进度（4 步）
- 每步展示对应记录的内容和状态
- 审批人可在当前步骤操作（填写意见、批准/拒绝）
- 权限：只有对应部门的用户才能操作自己的审批项

**Commit:**
```bash
git commit -m "feat: 变更管理完整审批流前端（4步流程可视化）"
```

---

## GROUP 4：二/三级文件落地到系统行为

---

### Task 16：自动化工作流触发规则

**背景：** 二级程序文件规定的联动规则，当前需用代码实现事件驱动触发。

**Files:**
- Create: `server/src/modules/workflow/food-safety-rules.service.ts`
- Modify: `server/src/modules/incoming-inspection/incoming-inspection.service.ts`
- Modify: `server/src/modules/ccp/ccp.service.ts`

**规则 1：来料检验不合格 → 自动创建不合格品处置单**

在 `incoming-inspection.service.ts` 的 `create` 方法末尾：

```typescript
// 来料检验结果为 fail → 自动创建不合格品处置单
if (inspection.overall_result === 'fail') {
  await this.prisma.nonConformance.create({
    data: {
      company_id: companyId,
      source_type: 'material_lot',
      source_id: dto.material_batch_id,
      description: `来料检验不合格，自动创建处置单。检验 ID: ${inspection.id}`,
      status: 'open',
      detected_at: new Date(),
    },
  });
}
```

**规则 2：CCP 超标 → 自动创建纠正措施单**

在 `ccp.service.ts` 的 create 方法中，当 `is_within_limit === false` 时：

```typescript
if (!dto.is_within_limit) {
  await this.prisma.correctiveAction.create({
    data: {
      company_id: companyId,
      source_type: 'ccp_record',
      source_id: record.id,
      description: `CCP 监控超标，自动创建纠正措施。CCP 记录 ID: ${record.id}`,
      status: 'open',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h 内完成
    },
  });
}
```

**Step 1: 确认 NonConformance 和 CorrectiveAction 模型有 source_type/source_id 字段**
```bash
grep -n "source_type\|source_id" /Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma | head -10
```

**Step 2: 实现两条规则，运行相关测试**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx jest src/modules/incoming-inspection/ src/modules/ccp/ --passWithNoTests 2>&1 | grep -E "PASS|FAIL|Tests:"
```

**Step 3: Commit**
```bash
git commit -m "feat: 自动化联动规则（来料不合格→不合格品处置单，CCP超标→纠正措施）"
```

---

## GROUP 5：Chrome DevTools MCP 端到端演练验证

---

### Task 17：启动服务 + Chrome DevTools MCP 全链路演练

**背景：** 通过 Chrome DevTools MCP 工具（已配置 `npx chrome-devtools-mcp@latest`）连接到运行中的 Chrome，走完整追溯链路并截图留档。

**前置条件：**
1. 后端服务运行在 `http://localhost:3000`
2. 前端服务运行在 `http://localhost:5173`（或 Vite 默认端口）
3. Chrome 浏览器已打开并启用 `--remote-debugging-port=9222`

**Step 1: 启动服务（在系统终端执行）**

```bash
# 终端 1
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npm run start:dev

# 终端 2
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/client && npm run dev

# Chrome 带调试端口启动
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**Step 2: 用 Chrome DevTools MCP 走追溯演练**

演练路径（按顺序操作）：

1. **登录系统** → `http://localhost:5173/login`
2. **新建物料批次**（仓库管理 → 物料批次）→ 创建一批"低筋面粉"批次，记录批次 ID
3. **来料检验** → 来料检验页面 → 新建检验单，选刚创建的批次，填写检验项，总体结论=合格
4. **确认批次入库状态**（物料批次详情查看 status=in_warehouse）
5. **车间申请领料** → 仓库-领料申请 → 提交领料单
6. **填写配料表** → 配料表填写页面 → 选产品（需预先有产品和配方），填写各物料批次号和用量 → 提交生成生产批次
7. **追溯查询** → 追溯查询页面 → 输入刚生成的生产批次号 → 验证能反查到来料批次、供应商信息

**Step 3: 验证追溯结果满足 BRCGS 要求**

追溯报告应包含：
- ✅ 原料批次号
- ✅ 原料供应商
- ✅ 来料检验结论
- ✅ 领料时间
- ✅ 生产批次号
- ✅ 生产日期

**Step 4: 截图/录像存档**

截图保存到 `docs/e2e-screenshots/trace-drill-YYYY-MM-DD/`

**Step 5: 最终验收测试**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server && npx jest --testPathIgnorePatterns="e2e-spec|integration-spec|load.spec|performance" --passWithNoTests 2>&1 | tail -5
```

Expected: `Tests: XXX passed, 0 failed`

**Step 6: Commit**

```bash
git add docs/e2e-screenshots/ && git commit -m "docs: 追溯演练截图留档（BRCGS 4h 追溯验证）"
```

---

## 实施顺序总结

| 优先级 | Task | 预估工作量 |
|--------|------|-----------|
| 1 | Task 1：来料检验前端 | 1h |
| 2 | Task 2：产品目录后端 | 1h |
| 3 | Task 3：配方管理后端 | 1h |
| 4 | Task 4：产品+配方前端+配料表 | 3h |
| 5 | Task 5：ReworkRecord | 1.5h |
| 6 | Task 6：FragileItemInspection | 1h |
| 7 | Task 7：变更全流程 | 3h |
| 8 | Task 8：LineChangeCheckRecord | 1.5h |
| 9 | Task 9：FoodSafetyCultureRecord | 1h |
| 10 | Task 10：AssetLoanRecord | 1h |
| 11 | Task 11：DocumentIssuance | 0.5h |
| 12 | Task 12：ExternalParty | 1h |
| 13 | Task 13：PackagingMaterialUsage | 1h |
| 14 | Task 14：ProcessStep | 1.5h |
| 15 | Task 15：变更管理前端流程页 | 2h |
| 16 | Task 16：自动化工作流规则 | 1.5h |
| 17 | Task 17：E2E 演练验证 | 2h |

**总计估算：约 25h**
