# 食品安全 SaaS 全量表单系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全量落地 ProductionRun 追溯体系 + 263 张表单 + 表单引擎升级 + 文件生命周期 + 定期任务引擎 + 移动端 + CAPA 闭环 + 管理层仪表盘

**Architecture:** ShiftInstance → ProductionRun → FormRecord 四层锚点；表单引擎升级支持 9 类字段 + 9 类实体关联；解析脚本批量导入 263 张模板

**Tech Stack:** NestJS + Prisma + PostgreSQL，Vue 3 + Element Plus，移动端 PWA

**Source of Truth:** `docs/plans/2026-04-22-form-system-design.md`

---

## Task 1：ShiftInstance + ProductionRun Prisma 模型

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Step 1: 在 schema.prisma 末尾添加两个新模型**

```prisma
model ShiftInstance {
  id           String   @id @default(cuid())
  company_id   String
  shift_type   String   // '白班' | '夜班'
  shift_date   DateTime @db.Date  // 开班日期（夜班跨午夜取开班当天）
  opened_by    String
  closed_by    String?
  opened_at    DateTime @default(now())
  closed_at    DateTime?
  status       String   @default("open") // 'open' | 'closed'
  notes        String?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  production_runs ProductionRun[]
  records         Record[]

  @@unique([company_id, shift_type, shift_date])
  @@index([company_id, shift_date])
  @@map("shift_instances")
}

model ProductionRun {
  id               String        @id @default(cuid())
  company_id       String
  shift_instance_id String
  shift_instance   ShiftInstance @relation(fields: [shift_instance_id], references: [id], onDelete: Restrict)
  production_line  String
  product_id       String
  product          Product       @relation(fields: [product_id], references: [id], onDelete: Restrict)
  recipe_id        String?
  recipe           Recipe?       @relation(fields: [recipe_id], references: [id], onDelete: SetNull)
  started_at       DateTime
  ended_at         DateTime?
  status           String        @default("active") // 'active' | 'closed'
  actual_yield     Decimal?      @db.Decimal(14, 4)
  yield_unit       String?
  notes            String?
  created_at       DateTime      @default(now())
  updated_at       DateTime      @updatedAt

  records                  Record[]
  production_batches        ProductionBatch[]
  line_change_check_records LineChangeCheckRecord[]

  @@index([company_id, shift_instance_id])
  @@index([product_id])
  @@map("production_runs")
}
```

**Step 2: 在 Record 模型中添加关联字段**

在 Record 模型现有字段后、`@@index` 前添加：

```prisma
  shift_instance_id  String?
  shift_instance     ShiftInstance?  @relation(fields: [shift_instance_id], references: [id], onDelete: SetNull)
  production_run_id  String?
  production_run     ProductionRun?  @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
  document_no        String?         // 单据号，格式: {模板代码}-{YYYYMMDD}-{4位序号}
  entity_links       Json?           // [{type, id, display_label}]
```

**Step 3: 在 Product 和 Recipe 模型中添加反向关系**

在 Product 模型末尾 `@@map` 前添加：
```prisma
  production_runs ProductionRun[]
```

在 Recipe 模型末尾 `@@map` 前添加：
```prisma
  production_runs ProductionRun[]
```

在 LineChangeCheckRecord 模型末尾 `@@map` 前添加：
```prisma
  production_run_id String?
  production_run    ProductionRun? @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
```

在 ProductionBatch 模型末尾 `@@map` 前添加：
```prisma
  production_run_id String?
  production_run    ProductionRun? @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
```

**Step 4: 生成并运行迁移**

```bash
cd server
npx prisma migrate dev --name add_shift_instance_production_run
```

Expected: 迁移成功，生成 `shift_instances` 和 `production_runs` 表

**Step 5: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/
git commit -m "feat: add ShiftInstance and ProductionRun models with Record/Product/Recipe relations"
```

---

## Task 2：ShiftInstance 后端 CRUD（NestJS）

**Files:**
- Create: `server/src/modules/shift-instance/shift-instance.module.ts`
- Create: `server/src/modules/shift-instance/shift-instance.controller.ts`
- Create: `server/src/modules/shift-instance/shift-instance.service.ts`
- Create: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 创建 DTO**

```typescript
// dto/create-shift-instance.dto.ts
import { IsNotEmpty, IsString, IsIn, IsDateString, IsOptional } from 'class-validator';

export class CreateShiftInstanceDto {
  @IsNotEmpty() @IsIn(['白班', '夜班'])
  shift_type: string;

  @IsNotEmpty() @IsDateString()
  shift_date: string; // YYYY-MM-DD

  @IsOptional() @IsString()
  notes?: string;
}

export class CloseShiftInstanceDto {
  @IsOptional() @IsString()
  notes?: string;
}
```

**Step 2: 创建 Service**

```typescript
// shift-instance.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

@Injectable()
export class ShiftInstanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftInstanceDto, userId: string) {
    const existing = await this.prisma.shiftInstance.findUnique({
      where: { company_id_shift_type_shift_date: {
        company_id: '1', shift_type: dto.shift_type,
        shift_date: new Date(dto.shift_date)
      }}
    });
    if (existing) throw new ConflictException('该班次已开班');

    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type: dto.shift_type,
        shift_date: new Date(dto.shift_date),
        opened_by: userId,
        notes: dto.notes,
      }
    });
  }

  async findAll(date?: string) {
    return this.prisma.shiftInstance.findMany({
      where: {
        company_id: '1',
        ...(date ? { shift_date: new Date(date) } : {}),
      },
      include: {
        production_runs: {
          include: { product: true },
          orderBy: { started_at: 'asc' }
        }
      },
      orderBy: { shift_date: 'desc' }
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.shiftInstance.findFirst({
      where: { id, company_id: '1' },
      include: {
        production_runs: {
          include: { product: true, recipe: true },
          orderBy: { started_at: 'asc' }
        }
      }
    });
    if (!inst) throw new NotFoundException('班次不存在');
    return inst;
  }

  async close(id: string, dto: CloseShiftInstanceDto, userId: string) {
    const inst = await this.findOne(id);
    if (inst.status === 'closed') throw new BadRequestException('班次已关闭');
    return this.prisma.shiftInstance.update({
      where: { id },
      data: { status: 'closed', closed_by: userId, closed_at: new Date(), notes: dto.notes ?? inst.notes }
    });
  }
}
```

**Step 3: 创建 Controller**

```typescript
// shift-instance.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ShiftInstanceService } from './shift-instance.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

@Controller('shift-instances')
export class ShiftInstanceController {
  constructor(private svc: ShiftInstanceService) {}

  @Post() create(@Body() dto: CreateShiftInstanceDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.id ?? 'system');
  }

  @Get() findAll(@Query('date') date?: string) {
    return this.svc.findAll(date);
  }

  @Get(':id') findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/close') close(@Param('id') id: string, @Body() dto: CloseShiftInstanceDto, @Req() req: any) {
    return this.svc.close(id, dto, req.user?.id ?? 'system');
  }
}
```

**Step 4: 创建 Module 并注册到 AppModule**

```typescript
// shift-instance.module.ts
import { Module } from '@nestjs/common';
import { ShiftInstanceController } from './shift-instance.controller';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftInstanceController],
  providers: [ShiftInstanceService],
  exports: [ShiftInstanceService],
})
export class ShiftInstanceModule {}
```

在 `app.module.ts` 中添加 `ShiftInstanceModule` 的 import 和 imports 数组条目。

**Step 5: 启动后测试**

```bash
curl -X POST http://localhost:3000/shift-instances \
  -H "Content-Type: application/json" \
  -d '{"shift_type":"白班","shift_date":"2026-04-22"}'
```

Expected: 返回新建的 ShiftInstance 对象，status: "open"

**Step 6: Commit**

```bash
git add server/src/modules/shift-instance/ server/src/app.module.ts
git commit -m "feat: add ShiftInstance CRUD with open/close lifecycle"
```

---

## Task 3：ProductionRun 后端 CRUD（NestJS）

**Files:**
- Create: `server/src/modules/production-run/production-run.module.ts`
- Create: `server/src/modules/production-run/production-run.controller.ts`
- Create: `server/src/modules/production-run/production-run.service.ts`
- Create: `server/src/modules/production-run/dto/create-production-run.dto.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 创建 DTO**

```typescript
// dto/create-production-run.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateProductionRunDto {
  @IsNotEmpty() @IsString()
  shift_instance_id: string;

  @IsNotEmpty() @IsString()
  production_line: string;

  @IsNotEmpty() @IsString()
  product_id: string;

  @IsOptional() @IsString()
  recipe_id?: string;

  @IsOptional() @IsDateString()
  started_at?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class CloseProductionRunDto {
  @IsOptional()
  actual_yield?: number;

  @IsOptional() @IsString()
  yield_unit?: string;

  @IsOptional() @IsString()
  notes?: string;
}
```

**Step 2: 创建 Service**

```typescript
// production-run.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@Injectable()
export class ProductionRunService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(dto: CreateProductionRunDto) {
    const shift = await this.prisma.shiftInstance.findFirst({
      where: { id: dto.shift_instance_id, company_id: '1' }
    });
    if (!shift) throw new NotFoundException('班次不存在');
    if (shift.status === 'closed') throw new BadRequestException('班次已关闭，不能开产');

    return this.prisma.productionRun.create({
      data: {
        company_id: '1',
        shift_instance_id: dto.shift_instance_id,
        production_line: dto.production_line,
        product_id: dto.product_id,
        recipe_id: dto.recipe_id,
        started_at: dto.started_at ? new Date(dto.started_at) : new Date(),
        notes: dto.notes,
      },
      include: { product: true, recipe: true, shift_instance: true }
    });
  }

  async findByShift(shiftInstanceId: string) {
    return this.prisma.productionRun.findMany({
      where: { shift_instance_id: shiftInstanceId, company_id: '1' },
      include: { product: true, recipe: true },
      orderBy: { started_at: 'asc' }
    });
  }

  async close(id: string, dto: CloseProductionRunDto) {
    const run = await this.prisma.productionRun.findFirst({
      where: { id, company_id: '1' }
    });
    if (!run) throw new NotFoundException('生产段不存在');
    if (run.status === 'closed') throw new BadRequestException('生产段已关闭');

    const closed = await this.prisma.productionRun.update({
      where: { id },
      data: {
        status: 'closed',
        ended_at: new Date(),
        actual_yield: dto.actual_yield,
        yield_unit: dto.yield_unit,
        notes: dto.notes ?? run.notes,
      }
    });

    this.eventEmitter.emit('production-run.closed', {
      id: closed.id,
      product_id: closed.product_id,
      shift_instance_id: closed.shift_instance_id,
      company_id: closed.company_id,
    });

    return closed;
  }
}
```

**Step 3: 创建 Controller**

```typescript
// production-run.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ProductionRunService } from './production-run.service';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@Controller('production-runs')
export class ProductionRunController {
  constructor(private svc: ProductionRunService) {}

  @Post() create(@Body() dto: CreateProductionRunDto) {
    return this.svc.create(dto);
  }

  @Get() findByShift(@Query('shiftInstanceId') shiftInstanceId: string) {
    return this.svc.findByShift(shiftInstanceId);
  }

  @Patch(':id/close') close(@Param('id') id: string, @Body() dto: CloseProductionRunDto) {
    return this.svc.close(id, dto);
  }
}
```

**Step 4: 创建 Module 并注册到 AppModule**

```typescript
// production-run.module.ts
import { Module } from '@nestjs/common';
import { ProductionRunController } from './production-run.controller';
import { ProductionRunService } from './production-run.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionRunController],
  providers: [ProductionRunService],
  exports: [ProductionRunService],
})
export class ProductionRunModule {}
```

在 `app.module.ts` 添加 `ProductionRunModule`。

**Step 5: Commit**

```bash
git add server/src/modules/production-run/ server/src/app.module.ts
git commit -m "feat: add ProductionRun CRUD with close lifecycle and event emission"
```

---

## Task 4：RecordTemplate fieldsJson 引擎升级

**Files:**
- Create: `server/src/modules/record-template/types/fields-json.types.ts`
- Create: `server/src/modules/record-template/document-no.service.ts`
- Modify: `server/src/modules/record-template/record-template.service.ts`

**Step 1: 定义 fieldsJson 类型**

```typescript
// types/fields-json.types.ts
export type FieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'boolean'
  | 'enum' | 'multi-enum'
  | 'inspection-table'  // 三列: 标准要求|实测值|单项结论
  | 'checklist'         // 多项勾选
  | 'photo'             // 图片附件
  | 'signature'         // 数字签名
  | 'entity-link';      // 关联实体

export type EntityType =
  | 'shift_instance' | 'production_run' | 'material_lot' | 'supplier'
  | 'production_batch' | 'finished_goods_batch' | 'product' | 'recipe' | 'equipment';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unit?: string;
  defaultValue?: unknown;
  options?: string[];           // for enum / multi-enum
  validRange?: { min?: number; max?: number }; // for number
  entity?: EntityType;          // for entity-link
  autoFill?: boolean;           // auto-populate from context
  inspectionRows?: Array<{ item: string; standard: string }>; // for inspection-table
  checklistItems?: string[];    // for checklist
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
}

export interface ConditionalRule {
  when: { field: string; equals: unknown };
  show: string[];
}

export interface FieldsJson {
  sections: SectionDef[];
  conditionalRules?: ConditionalRule[];
}
```

**Step 2: 创建单据号生成 Service**

```typescript
// document-no.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentNoService {
  constructor(private prisma: PrismaService) {}

  async generate(templateCode: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 统计当日该模板已生成的单据数量
    const count = await this.prisma.record.count({
      where: {
        template: { code: templateCode },
        document_no: { startsWith: `${templateCode}-${dateStr}-` },
      }
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${templateCode}-${dateStr}-${seq}`;
  }
}
```

**Step 3: 在 RecordTemplate Module 中注册 DocumentNoService**

将 `DocumentNoService` 添加到 `record-template.module.ts` 的 providers 和 exports。

**Step 4: Record 创建时自动生成单据号**

在 `record.service.ts` 的 `create` 方法中，创建 Record 时调用 `DocumentNoService.generate(template.code)` 并写入 `document_no` 字段。

**Step 5: Commit**

```bash
git add server/src/modules/record-template/
git commit -m "feat: upgrade fieldsJson type system with 9 field types + document number generator"
```

---

## Task 5：263 张表单自动解析脚本

**Files:**
- Create: `scripts/parse-vault-forms.ts`
- Create: `scripts/seed-templates.ts`

**Step 1: 编写解析脚本**

```typescript
// scripts/parse-vault-forms.ts
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const VAULT_FORMS_DIR = '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单';

interface ParsedField {
  name: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  inputMethod?: string;
  defaultValue?: string;
}

interface ParsedTemplate {
  code: string;
  name: string;
  department: string;
  fields: ParsedField[];
  rawPath: string;
}

function parseFieldTable(content: string): ParsedField[] {
  const tableRegex = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
  const fields: ParsedField[] = [];
  let match: RegExpExecArray | null;
  let headerPassed = false;

  while ((match = tableRegex.exec(content)) !== null) {
    const cols = match.slice(1).map(c => c.trim());
    if (cols[0] === '字段名' || cols[0].startsWith('-')) { headerPassed = true; continue; }
    if (!headerPassed) continue;
    if (!cols[0]) continue;

    fields.push({
      name: cols[0].replace(/\s+/g, '_').toLowerCase(),
      label: cols[0],
      type: mapType(cols[1]),
      unit: cols[2] !== '-' ? cols[2] : undefined,
      required: cols[3] === '是',
      inputMethod: cols[4],
      defaultValue: cols[5] !== '-' ? cols[5] : undefined,
    });
  }
  return fields;
}

function mapType(vaultType: string): string {
  const t = vaultType.trim().toLowerCase();
  if (t.includes('枚举') || t.includes('选择')) return 'enum';
  if (t.includes('数值') || t.includes('数字')) return 'number';
  if (t.includes('日期时间')) return 'datetime';
  if (t.includes('日期')) return 'date';
  if (t.includes('检验表') || t.includes('三列')) return 'inspection-table';
  if (t.includes('勾选') || t.includes('checklist')) return 'checklist';
  if (t.includes('图片') || t.includes('照片')) return 'photo';
  return 'text';
}

function extractCode(filename: string, content: string): string {
  // 尝试从内容中提取编号，如 GRSS-ZZ-JL-01
  const codeMatch = content.match(/GRSS-[A-Z]{2}-JL-\d+/);
  if (codeMatch) return codeMatch[0];
  // fallback: 用文件名
  return path.basename(filename, '.md').toUpperCase().replace(/[^A-Z0-9-]/g, '-');
}

export function parseAllForms(): ParsedTemplate[] {
  const files = glob.sync('**/*.md', { cwd: VAULT_FORMS_DIR, absolute: true });
  const templates: ParsedTemplate[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const department = path.basename(path.dirname(file));
    const nameMatch = content.match(/^#\s+(.+)/m);
    const name = nameMatch ? nameMatch[1].trim() : path.basename(file, '.md');
    const fields = parseFieldTable(content);
    if (fields.length === 0) continue; // 跳过无字段清单的文件

    templates.push({
      code: extractCode(file, content),
      name,
      department,
      fields,
      rawPath: file,
    });
  }

  return templates;
}
```

**Step 2: 编写种子脚本**

```typescript
// scripts/seed-templates.ts
import { PrismaClient } from '@prisma/client';
import { parseAllForms } from './parse-vault-forms';

const prisma = new PrismaClient();

async function main() {
  const templates = parseAllForms();
  console.log(`解析到 ${templates.length} 个表单模板`);

  for (const t of templates) {
    const fieldsJson = {
      sections: [{
        title: '表单内容',
        fields: t.fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          unit: f.unit,
          defaultValue: f.defaultValue,
        }))
      }]
    };

    await prisma.recordTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, fieldsJson, updatedAt: new Date() },
      create: {
        id: `tpl-${t.code.toLowerCase()}`,
        code: t.code,
        name: t.name,
        fieldsJson,
        description: `来源: ${t.department}，原文件: ${t.rawPath.split('/').pop()}`,
        status: 'active',
      }
    });
  }

  console.log('导入完成');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

**Step 3: 添加 package.json script**

在 `server/package.json` 的 scripts 中添加：
```json
"seed:templates": "ts-node -P tsconfig.json scripts/seed-templates.ts"
```

**Step 4: 运行脚本验证**

```bash
cd server
npm run seed:templates
```

Expected: 输出"解析到 N 个表单模板，导入完成"，N ≥ 200

**Step 5: Commit**

```bash
git add scripts/ server/package.json
git commit -m "feat: add vault form auto-parse script, batch import 263 templates"
```

---

## Task 6：前端开班/开产/换产/关产操作流

**Files:**
- Create: `client/src/views/shift/ShiftDashboard.vue`
- Create: `client/src/views/shift/components/OpenShiftDialog.vue`
- Create: `client/src/views/shift/components/OpenRunDialog.vue`
- Create: `client/src/api/shift-instance.ts`
- Create: `client/src/api/production-run.ts`
- Modify: `client/src/router/index.ts`

**Step 1: 创建 API 层**

```typescript
// client/src/api/shift-instance.ts
import request from './request'

export const ShiftInstanceApi = {
  create: (data: { shift_type: string; shift_date: string; notes?: string }) =>
    request.post('/shift-instances', data),
  list: (date?: string) =>
    request.get('/shift-instances', { params: { date } }),
  findOne: (id: string) => request.get(`/shift-instances/${id}`),
  close: (id: string, notes?: string) =>
    request.patch(`/shift-instances/${id}/close`, { notes }),
}

// client/src/api/production-run.ts
export const ProductionRunApi = {
  create: (data: { shift_instance_id: string; production_line: string; product_id: string; recipe_id?: string }) =>
    request.post('/production-runs', data),
  listByShift: (shiftInstanceId: string) =>
    request.get('/production-runs', { params: { shiftInstanceId } }),
  close: (id: string, data: { actual_yield?: number; yield_unit?: string; notes?: string }) =>
    request.patch(`/production-runs/${id}/close`, data),
}
```

**Step 2: 创建班次看板主页面**

`ShiftDashboard.vue` 包含：
- 顶部：今日日期 + 开班按钮（未开班时显示）
- 中部：当前班次列表，每个班次展开显示其 ProductionRun 列表
- 每个 ProductionRun 卡片：产品名 + 产线 + 状态 + 操作按钮（开产/关产/换产）
- 右下角浮动按钮：快捷开产

页面骨架：
```vue
<template>
  <div class="shift-dashboard">
    <div class="header">
      <h2>今日班次：{{ today }}</h2>
      <el-button v-if="!activeShift" type="primary" @click="openShiftDialog = true">开班</el-button>
      <el-button v-else type="danger" @click="closeShift">关班</el-button>
    </div>

    <div v-for="shift in shifts" :key="shift.id" class="shift-card">
      <div class="shift-header">{{ shift.shift_type }} | {{ formatDate(shift.shift_date) }}</div>
      <div v-for="run in shift.production_runs" :key="run.id" class="run-card">
        <span>{{ run.product.name }}</span>
        <span>产线 {{ run.production_line }}</span>
        <el-tag :type="run.status === 'active' ? 'success' : 'info'">{{ run.status }}</el-tag>
        <el-button v-if="run.status === 'active'" size="small" @click="closeRun(run)">关产</el-button>
      </div>
      <el-button v-if="shift.status === 'open'" @click="openRunDialog = true; selectedShift = shift">+ 开产</el-button>
    </div>

    <OpenShiftDialog v-model="openShiftDialog" @created="loadShifts" />
    <OpenRunDialog v-model="openRunDialog" :shift="selectedShift" @created="loadShifts" />
  </div>
</template>
```

**Step 3: 创建开班对话框**

`OpenShiftDialog.vue`：
- el-form：班次类型（白班/夜班单选）+ 日期选择（默认今天）+ 备注
- 提交调用 `ShiftInstanceApi.create`

**Step 4: 创建开产对话框**

`OpenRunDialog.vue`：
- el-form：产线（文本/下拉）+ 产品（el-select 搜索）+ 配方（自动根据产品加载激活配方）
- 提交调用 `ProductionRunApi.create`

**Step 5: 注册路由**

```typescript
{ path: '/shift-dashboard', component: () => import('@/views/shift/ShiftDashboard.vue'), name: 'ShiftDashboard' }
```

**Step 6: Commit**

```bash
git add client/src/views/shift/ client/src/api/shift-instance.ts client/src/api/production-run.ts client/src/router/index.ts
git commit -m "feat: add shift dashboard with open/close shift and production run flow"
```

---

## Task 7：班次完成度看板

**Files:**
- Create: `server/src/modules/shift-instance/shift-completion.service.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.controller.ts`
- Create: `client/src/views/shift/components/ShiftCompletionBoard.vue`

**Step 1: 后端完成度计算 Service**

```typescript
// shift-completion.service.ts
@Injectable()
export class ShiftCompletionService {
  constructor(private prisma: PrismaService) {}

  async getCompletionStatus(shiftInstanceId: string) {
    const runs = await this.prisma.productionRun.findMany({
      where: { shift_instance_id: shiftInstanceId, company_id: '1' },
      include: {
        product: true,
        records: { include: { template: true } }
      }
    });

    // 必填模板列表（从 RecordTemplate 中查询 is_mandatory = true 的）
    const mandatoryTemplates = await this.prisma.recordTemplate.findMany({
      where: { status: 'active', batchLinkEnabled: true } // 暂用 batchLinkEnabled 标识生产关联表单
    });

    return runs.map(run => {
      const filledCodes = new Set(run.records.map(r => r.template.code));
      const missing = mandatoryTemplates.filter(t => !filledCodes.has(t.code));
      return {
        run_id: run.id,
        product_name: run.product.name,
        production_line: run.production_line,
        status: run.status,
        total_mandatory: mandatoryTemplates.length,
        filled: mandatoryTemplates.length - missing.length,
        missing_templates: missing.map(t => ({ code: t.code, name: t.name })),
        completion_rate: mandatoryTemplates.length > 0
          ? ((mandatoryTemplates.length - missing.length) / mandatoryTemplates.length * 100).toFixed(1)
          : '100',
      };
    });
  }
}
```

**Step 2: 添加 Controller 端点**

```typescript
@Get(':id/completion')
getCompletion(@Param('id') id: string) {
  return this.completionService.getCompletionStatus(id);
}
```

**Step 3: 前端完成度组件**

`ShiftCompletionBoard.vue`：
- 每个 ProductionRun 显示进度条（el-progress）
- 缺失表单列表红色标注
- 每5分钟自动刷新

**Step 4: Commit**

```bash
git add server/src/modules/shift-instance/shift-completion.service.ts client/src/views/shift/components/ShiftCompletionBoard.vue
git commit -m "feat: add shift completion board with mandatory form tracking"
```

---

## Task 8：文件生命周期管理

**Files:**
- Modify: `server/src/prisma/schema.prisma`（Document 模型扩展）
- Create: `server/src/modules/document/document-lifecycle.service.ts`
- Create: `server/src/modules/document/dto/document-lifecycle.dto.ts`
- Modify: `server/src/modules/document/document.controller.ts`

**Step 1: 扩展 Document 模型**

在 schema.prisma 的 Document 模型中添加：

```prisma
  effective_date     DateTime?
  review_due_date    DateTime?
  superseded_by_id   String?
  superseded_by      Document?  @relation("DocumentSuperseded", fields: [superseded_by_id], references: [id])
  supersedes         Document[] @relation("DocumentSuperseded")
  read_confirmations DocumentReadConfirmation[]
```

新增 DocumentReadConfirmation 模型：

```prisma
model DocumentReadConfirmation {
  id          String   @id @default(cuid())
  document_id String
  document    Document @relation(fields: [document_id], references: [id], onDelete: Cascade)
  user_id     String
  confirmed_at DateTime @default(now())
  @@unique([document_id, user_id])
  @@map("document_read_confirmations")
}
```

**Step 2: 运行迁移**

```bash
cd server && npx prisma migrate dev --name extend_document_lifecycle
```

**Step 3: 创建生命周期 Service**

关键方法：
- `publish(id)`: status → 'effective'，设置 effective_date，向关联岗位员工发通知
- `supersede(id, newId)`: 旧文件 status → 'superseded'，superseded_by_id = newId
- `confirmRead(documentId, userId)`: upsert DocumentReadConfirmation
- `getReadStatus(documentId)`: 返回确认/未确认人员列表
- `getDueSoon(days = 30)`: 查询 review_due_date 在 N 天内的文件

**Step 4: Commit**

```bash
git add server/src/prisma/ server/src/modules/document/
git commit -m "feat: extend Document with lifecycle fields and read confirmation tracking"
```

---

## Task 9：定期任务引擎

**Files:**
- Modify: `server/src/prisma/schema.prisma`（新增 ScheduledTaskRule）
- Create: `server/src/modules/scheduled-task/scheduled-task.module.ts`
- Create: `server/src/modules/scheduled-task/scheduled-task.service.ts`
- Create: `server/src/modules/scheduled-task/scheduled-task.scheduler.ts`

**Step 1: 添加 ScheduledTaskRule 模型**

```prisma
model ScheduledTaskRule {
  id                   String   @id @default(cuid())
  company_id           String
  task_name            String
  description          String?
  cron_expression      String   // 如 "0 0 1 * *"
  assignee_role        String?
  form_template_id     String?
  reminder_days_before Int      @default(3)
  is_active            Boolean  @default(true)
  source_document_id   String?
  last_triggered_at    DateTime?
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt
  @@map("scheduled_task_rules")
}
```

**Step 2: 创建调度 Scheduler**

```typescript
// scheduled-task.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ScheduledTaskScheduler {
  constructor(private prisma: PrismaService, private notificationSvc: NotificationService) {}

  // 每天8点检查今日到期任务
  @Cron('0 8 * * *')
  async checkDueTasks() {
    const rules = await this.prisma.scheduledTaskRule.findMany({
      where: { company_id: '1', is_active: true }
    });

    for (const rule of rules) {
      const isDue = this.evalCron(rule.cron_expression);
      if (!isDue) continue;

      // 创建 RecordTask 待办
      await this.prisma.recordTask.create({
        data: {
          company_id: '1',
          title: rule.task_name,
          description: rule.description,
          template_id: rule.form_template_id,
          due_date: new Date(),
          status: 'pending',
          source: 'scheduled_rule',
          source_id: rule.id,
        }
      });

      await this.prisma.scheduledTaskRule.update({
        where: { id: rule.id },
        data: { last_triggered_at: new Date() }
      });
    }
  }

  private evalCron(expression: string): boolean {
    // 简单实现：解析 cron 表达式判断今天是否触发
    // 生产环境可使用 cron-parser 库
    return true; // placeholder
  }
}
```

**Step 3: 运行迁移并注册模块**

```bash
cd server && npx prisma migrate dev --name add_scheduled_task_rule
```

**Step 4: Commit**

```bash
git add server/src/prisma/ server/src/modules/scheduled-task/
git commit -m "feat: add ScheduledTaskRule model and cron-driven task scheduler"
```

---

## Task 10：移动端适配 + 图片附件

**Files:**
- Create: `server/src/modules/upload/upload.module.ts`
- Create: `server/src/modules/upload/upload.controller.ts`
- Create: `client/src/composables/usePhotoUpload.ts`
- Modify: `client/src/views/record/RecordForm.vue`（photo 字段渲染）
- Modify: `client/src/assets/styles/mobile.css`

**Step 1: 后端图片上传（本地存储，OSS 后续替换）**

```typescript
// upload.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new Error('只允许上传图片'), false);
      } else {
        cb(null, true);
      }
    }
  }))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/${file.filename}` };
  }
}
```

**Step 2: 前端 usePhotoUpload composable**

```typescript
// composables/usePhotoUpload.ts
import { ref } from 'vue'
import axios from 'axios'

export function usePhotoUpload() {
  const uploading = ref(false)

  async function uploadPhoto(file: File): Promise<string> {
    uploading.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post('/api/upload/image', form)
      return res.data.url
    } finally {
      uploading.value = false
    }
  }

  return { uploadPhoto, uploading }
}
```

**Step 3: 表单中渲染 photo 字段**

在 `RecordForm.vue` 的字段渲染 switch 中添加 photo case：
```vue
<template v-if="field.type === 'photo'">
  <el-upload
    action="/api/upload/image"
    list-type="picture-card"
    :on-success="(res) => form[field.name] = res.url"
    accept="image/*"
    capture="environment"
  >
    <el-icon><Camera /></el-icon>
  </el-upload>
</template>
```

**Step 4: 移动端 CSS 适配**

```css
/* mobile.css */
@media (max-width: 768px) {
  .el-form-item { margin-bottom: 16px; }
  .el-table { font-size: 12px; }
  .page-header { flex-direction: column; gap: 8px; }
  .el-dialog { width: 95% !important; margin: 5vh auto; }
  .el-button { min-height: 40px; }
}
```

**Step 5: Commit**

```bash
git add server/src/modules/upload/ client/src/composables/usePhotoUpload.ts client/src/assets/styles/mobile.css
git commit -m "feat: add image upload endpoint and mobile-responsive form styles"
```

---

## Task 11：完整 CAPA 闭环 + 趋势分析

**Files:**
- Modify: `server/src/prisma/schema.prisma`（VerificationRecord + CAPA 状态扩展）
- Create: `server/src/modules/corrective-action/verification-record.service.ts`
- Create: `server/src/modules/corrective-action/capa-analytics.service.ts`
- Create: `client/src/views/corrective-action/CapaDetail.vue`
- Create: `client/src/views/corrective-action/CapaAnalytics.vue`

**Step 1: 添加 VerificationRecord 模型**

```prisma
model VerificationRecord {
  id                    String          @id @default(cuid())
  company_id            String
  corrective_action_id  String
  corrective_action     CorrectiveAction @relation(fields: [corrective_action_id], references: [id], onDelete: Cascade)
  verified_by           String
  verification_method   String
  result                String          // 'effective' | 'ineffective'
  notes                 String?
  evidence_record_ids   String[]        // FormRecord IDs
  verified_at           DateTime        @default(now())
  created_at            DateTime        @default(now())
  @@map("verification_records")
}
```

在 CorrectiveAction 模型添加：
```prisma
  verification_records VerificationRecord[]
```

**Step 2: CAPA 状态机**

CorrectiveAction status 流转：
```
open → implementing → pending_verification → closed
                ↑              |
                └──────────────┘ (验证无效时退回)
```

**Step 3: 趋势分析 Service**

```typescript
// capa-analytics.service.ts
async getTrends(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const actions = await this.prisma.correctiveAction.findMany({
    where: { company_id: '1', created_at: { gte: since } },
    include: { verification_records: true }
  });

  return {
    total: actions.length,
    by_status: this.groupBy(actions, 'status'),
    avg_close_days: this.avgCloseDays(actions),
    recurrence_rate: this.calcRecurrenceRate(actions),
    monthly_trend: this.monthlyCount(actions, months),
  };
}
```

**Step 4: 前端 CAPA 详情页**

`CapaDetail.vue` 展示完整状态机：
- 时间线（el-timeline）：创建 → 措施实施 → 提交验证 → 验证通过 → 关闭
- 验证记录表单（验证方法 + 结论 + 证据记录关联）
- 操作按钮随状态显示（"提交验证"/"记录验证"/"关闭"）

**Step 5: 运行迁移**

```bash
cd server && npx prisma migrate dev --name add_verification_record_capa_extend
```

**Step 6: Commit**

```bash
git add server/src/prisma/ server/src/modules/corrective-action/ client/src/views/corrective-action/
git commit -m "feat: add VerificationRecord, complete CAPA state machine, and trend analytics"
```

---

## Task 12：管理层仪表盘 + BRCGS 准备度 + 批次追溯 PDF

**Files:**
- Create: `server/src/modules/statistics/management-dashboard.service.ts`
- Create: `server/src/modules/statistics/traceability-export.service.ts`
- Create: `client/src/views/dashboard/ManagementDashboard.vue`
- Create: `client/src/views/traceability/BatchTraceabilityReport.vue`

**Step 1: 管理仪表盘 Service**

```typescript
// management-dashboard.service.ts
async getKpis() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ncCount, capaOverdue, ccpRecords, trainingRate, docsExpiringSoon] = await Promise.all([
    // 本月不合格品数
    this.prisma.nonConformance.count({ where: { company_id: '1', created_at: { gte: monthStart } } }),
    // 超期未关闭 CAPA
    this.prisma.correctiveAction.count({
      where: { company_id: '1', status: { not: 'closed' }, due_date: { lt: now } }
    }),
    // CCP 合格率（本月）
    this.prisma.record.count({ where: { template: { code: { contains: 'CCP' } }, createdAt: { gte: monthStart } } }),
    // 培训完成率（简化）
    this.getTrainingRate(),
    // 即将到期文件（30天内）
    this.prisma.document.count({
      where: { review_due_date: { lte: new Date(now.getTime() + 30 * 86400000) }, status: 'effective' }
    }),
  ]);

  return { ncCount, capaOverdue, ccpRecords, trainingRate, docsExpiringSoon };
}
```

**Step 2: 批次追溯 PDF 导出 Service**

使用 `@nestjs/common` + `pdfkit` 库：

```typescript
// traceability-export.service.ts
async exportBatchTraceability(finishedGoodsBatchId: string): Promise<Buffer> {
  const batch = await this.prisma.finishedGoodsBatch.findFirst({
    where: { id: finishedGoodsBatchId },
    include: {
      records: { include: { template: true } },
      production_run: {
        include: {
          shift_instance: true,
          product: true,
          recipe: true,
          records: { include: { template: true } }
        }
      }
    }
  });

  // 查询原料追溯（通过 BatchMaterialUsage）
  const ingredients = await this.prisma.batchMaterialUsage.findMany({
    where: { production_batch_id: batch.production_run?.id },
    include: { material_lot: { include: { supplier: true, incoming_inspections: true } } }
  });

  // 使用 pdfkit 生成 PDF
  return this.buildPdf(batch, ingredients);
}
```

**Step 3: 前端管理仪表盘**

`ManagementDashboard.vue`：
- 顶部 KPI 卡片（el-statistic）：不合格数、超期 CAPA、BRCGS 到期文件
- 中部图表（el-chart / echarts）：月度不合格趋势、CAPA 状态分布
- BRCGS 准备度清单（红/黄/绿三色）

**Step 4: 安装 pdfkit**

```bash
cd server && npm install pdfkit @types/pdfkit
```

**Step 5: Commit**

```bash
git add server/src/modules/statistics/ client/src/views/dashboard/ client/src/views/traceability/
git commit -m "feat: add management dashboard, BRCGS readiness score, and batch traceability PDF export"
```

---

## 实施顺序总结

| Task | 内容 | 依赖 |
|------|------|------|
| 1 | ShiftInstance + ProductionRun Prisma 模型 | - |
| 2 | ShiftInstance 后端 CRUD | Task 1 |
| 3 | ProductionRun 后端 CRUD | Task 1, 2 |
| 4 | RecordTemplate fieldsJson 升级 + 单据号 | Task 1 |
| 5 | 263 张表单解析脚本 | Task 4 |
| 6 | 前端开班/开产/换产/关产流 | Task 2, 3 |
| 7 | 班次完成度看板 | Task 6 |
| 8 | 文件生命周期管理 | - |
| 9 | 定期任务引擎 | - |
| 10 | 移动端 + 图片附件 | - |
| 11 | CAPA 闭环 + 趋势分析 | - |
| 12 | 管理仪表盘 + PDF 导出 | Task 11 |

---

## 执行方式

**选项 1：Subagent-Driven（本 session 内）**
由我逐 Task 派发新 subagent 实施，每 Task 完成后做 spec 合规审查 + 代码质量审查

**选项 2：Parallel Session（新 session）**
在新 session 中打开本计划文件，使用 `superpowers:executing-plans` 逐步执行

选哪个？
