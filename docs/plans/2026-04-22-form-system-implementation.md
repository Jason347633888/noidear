# 食品安全 SaaS 全量表单系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全量落地 ProductionRun 追溯体系 + 263 张表单 + 表单引擎升级 + 文件生命周期 + 定期任务引擎 + 移动端 + CAPA 闭环 + 管理层仪表盘

**Architecture:** ShiftInstance → ProductionRun → FormRecord 四层锚点；RecordTemplate.fieldsJson 升级支持 9 类字段 + 9 类实体关联；vault 解析脚本批量导入 263 张模板；核心追溯表单单独精确实现

**Tech Stack:** NestJS + Prisma + PostgreSQL，Vue 3 + Element Plus，multer（已装），pdfkit（已装），cron-parser（待装）

**Working directory:** `/Users/jiashenglin/Desktop/好玩的项目/noidear`

**Test pattern:** `jest.fn()` mock + `Test.createTestingModule` — 参考 `server/src/modules/record/record.service.spec.ts`

---

## Task 1：Prisma Schema — ShiftInstance + ProductionRun 模型

**Files:**
- Modify: `server/src/prisma/schema.prisma`

**Context:** 新增两个核心模型，并在 Record / Product / Recipe / LineChangeCheckRecord / ProductionBatch 模型中添加反向关联。`is_mandatory` 字段也在此加入 RecordTemplate，供完成度看板使用。

**Step 1: 在 schema.prisma 末尾追加 ShiftInstance 模型**

找到文件末尾（最后一个 `@@map` 后），追加：

```prisma
model ShiftInstance {
  id              String   @id @default(cuid())
  company_id      String
  shift_type      String   // '白班' | '夜班'
  shift_date      DateTime @db.Date
  opened_by       String
  closed_by       String?
  opened_at       DateTime @default(now())
  closed_at       DateTime?
  status          String   @default("open") // 'open' | 'closed'
  notes           String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  production_runs ProductionRun[]
  records         Record[]

  @@unique([company_id, shift_type, shift_date])
  @@index([company_id, shift_date])
  @@map("shift_instances")
}

model ProductionRun {
  id                String        @id @default(cuid())
  company_id        String
  shift_instance_id String
  shift_instance    ShiftInstance @relation(fields: [shift_instance_id], references: [id], onDelete: Restrict)
  production_line   String
  product_id        String
  product           Product       @relation(fields: [product_id], references: [id], onDelete: Restrict)
  recipe_id         String?
  recipe            Recipe?       @relation(fields: [recipe_id], references: [id], onDelete: SetNull)
  started_at        DateTime
  ended_at          DateTime?
  status            String        @default("active") // 'active' | 'closed'
  actual_yield      Decimal?      @db.Decimal(14, 4)
  yield_unit        String?
  notes             String?
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  records                   Record[]
  production_batches         ProductionBatch[]
  line_change_check_records  LineChangeCheckRecord[]

  @@index([company_id, shift_instance_id])
  @@index([product_id])
  @@map("production_runs")
}
```

**Step 2: 在 Record 模型中添加新字段**

在 Record 模型的 `@@index([relatedBatchNumber])` 那行前插入：

```prisma
  shift_instance_id  String?
  shift_instance     ShiftInstance?  @relation(fields: [shift_instance_id], references: [id], onDelete: SetNull)
  production_run_id  String?
  production_run     ProductionRun?  @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
  document_no        String?
  entity_links       Json?
```

**Step 3: 在 RecordTemplate 模型中添加 is_mandatory 字段**

在 RecordTemplate 的 `deviationEnabled` 行前插入：

```prisma
  is_mandatory Boolean @default(false)
```

**Step 4: 在 Product 模型末尾 `@@map` 前添加反向关系**

```prisma
  production_runs ProductionRun[]
```

**Step 5: 在 Recipe 模型末尾 `@@map` 前添加反向关系**

```prisma
  production_runs ProductionRun[]
```

**Step 6: 在 LineChangeCheckRecord 模型末尾 `@@map` 前添加**

```prisma
  production_run_id String?
  production_run    ProductionRun? @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
```

**Step 7: 在 ProductionBatch 模型末尾 `@@map` 前添加**

```prisma
  production_run_id String?
  production_run    ProductionRun? @relation(fields: [production_run_id], references: [id], onDelete: SetNull)
```

**Step 8: 运行迁移**

```bash
cd server
npx prisma migrate dev --name add_shift_production_run_models
```

Expected: 输出 `The following migration(s) have been created and applied` 无报错

**Step 9: 验证 Prisma Client 生成成功**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` 无报错

**Step 10: Commit**

```bash
cd ..
git add server/src/prisma/schema.prisma server/src/prisma/migrations/
git commit -m "feat: add ShiftInstance and ProductionRun Prisma models with all reverse relations"
```

---

## Task 2：ShiftInstance 后端 CRUD

**Files:**
- Create: `server/src/modules/shift-instance/dto/create-shift-instance.dto.ts`
- Create: `server/src/modules/shift-instance/shift-instance.service.ts`
- Create: `server/src/modules/shift-instance/shift-instance.service.spec.ts`
- Create: `server/src/modules/shift-instance/shift-instance.controller.ts`
- Create: `server/src/modules/shift-instance/shift-instance.module.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 创建 DTO 文件**

```typescript
// server/src/modules/shift-instance/dto/create-shift-instance.dto.ts
import { IsNotEmpty, IsIn, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShiftInstanceDto {
  @IsNotEmpty()
  @IsIn(['白班', '夜班'])
  shift_type: string;

  @IsNotEmpty()
  @IsDateString()
  shift_date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftInstanceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Step 2: 写失败测试**

```typescript
// server/src/modules/shift-instance/shift-instance.service.spec.ts
import { Test } from '@nestjs/testing';
import { ShiftInstanceService } from './shift-instance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ShiftInstanceService', () => {
  let service: ShiftInstanceService;

  const mockPrisma = {
    shiftInstance: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShiftInstanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShiftInstanceService);
  });

  describe('create', () => {
    it('should throw ConflictException when shift already exists', async () => {
      mockPrisma.shiftInstance.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create shift when none exists', async () => {
      mockPrisma.shiftInstance.findUnique.mockResolvedValue(null);
      mockPrisma.shiftInstance.create.mockResolvedValue({ id: 'new-id', status: 'open' });
      const result = await service.create({ shift_type: '白班', shift_date: '2026-04-22' }, 'user1');
      expect(result.status).toBe('open');
      expect(mockPrisma.shiftInstance.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shift_type: '白班' }) }),
      );
    });
  });

  describe('close', () => {
    it('should throw BadRequestException when already closed', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 'id1', status: 'closed' });
      await expect(service.close('id1', {}, 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should close an open shift', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({
        id: 'id1', status: 'open', production_runs: [],
      });
      mockPrisma.shiftInstance.update.mockResolvedValue({ id: 'id1', status: 'closed' });
      const result = await service.close('id1', {}, 'user1');
      expect(result.status).toBe('closed');
    });
  });
});
```

**Step 3: 运行测试确认失败**

```bash
cd server
npx jest shift-instance.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './shift-instance.service'`

**Step 4: 实现 Service**

```typescript
// server/src/modules/shift-instance/shift-instance.service.ts
import {
  Injectable, ConflictException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

@Injectable()
export class ShiftInstanceService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftInstanceDto, userId: string) {
    const existing = await this.prisma.shiftInstance.findUnique({
      where: {
        company_id_shift_type_shift_date: {
          company_id: '1',
          shift_type: dto.shift_type,
          shift_date: new Date(dto.shift_date),
        },
      },
    });
    if (existing) throw new ConflictException('该班次已开班');

    return this.prisma.shiftInstance.create({
      data: {
        company_id: '1',
        shift_type: dto.shift_type,
        shift_date: new Date(dto.shift_date),
        opened_by: userId,
        notes: dto.notes,
      },
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
          orderBy: { started_at: 'asc' },
        },
      },
      orderBy: { shift_date: 'desc' },
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.shiftInstance.findFirst({
      where: { id, company_id: '1' },
      include: {
        production_runs: {
          include: { product: true, recipe: true },
          orderBy: { started_at: 'asc' },
        },
      },
    });
    if (!inst) throw new NotFoundException('班次不存在');
    return inst;
  }

  async close(id: string, dto: CloseShiftInstanceDto, userId: string) {
    const inst = await this.prisma.shiftInstance.findFirst({
      where: { id, company_id: '1' },
      include: { production_runs: true },
    });
    if (!inst) throw new NotFoundException('班次不存在');
    if (inst.status === 'closed') throw new BadRequestException('班次已关闭');

    return this.prisma.shiftInstance.update({
      where: { id },
      data: {
        status: 'closed',
        closed_by: userId,
        closed_at: new Date(),
        ...(dto.notes != null ? { notes: dto.notes } : {}),
      },
    });
  }
}
```

**Step 5: 运行测试确认通过**

```bash
npx jest shift-instance.service.spec.ts --no-coverage
```

Expected: PASS — 4 tests passed

**Step 6: 创建 Controller**

```typescript
// server/src/modules/shift-instance/shift-instance.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ShiftInstanceService } from './shift-instance.service';
import { CreateShiftInstanceDto, CloseShiftInstanceDto } from './dto/create-shift-instance.dto';

@Controller('shift-instances')
export class ShiftInstanceController {
  constructor(private readonly svc: ShiftInstanceService) {}

  @Post()
  create(@Body() dto: CreateShiftInstanceDto, @Req() req: any) {
    return this.svc.create(dto, req.user?.id ?? 'system');
  }

  @Get()
  findAll(@Query('date') date?: string) {
    return this.svc.findAll(date);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseShiftInstanceDto, @Req() req: any) {
    return this.svc.close(id, dto, req.user?.id ?? 'system');
  }
}
```

**Step 7: 创建 Module**

```typescript
// server/src/modules/shift-instance/shift-instance.module.ts
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

**Step 8: 注册到 AppModule**

在 `server/src/app.module.ts` 顶部 imports 区添加：
```typescript
import { ShiftInstanceModule } from './modules/shift-instance/shift-instance.module';
```
并在 `imports` 数组末尾加 `ShiftInstanceModule,`

**Step 9: 构建验证**

```bash
cd server
npx tsc --noEmit
```

Expected: 无 TypeScript 错误

**Step 10: Commit**

```bash
cd ..
git add server/src/modules/shift-instance/ server/src/app.module.ts
git commit -m "feat: add ShiftInstance CRUD with open/close lifecycle and unit tests"
```

---

## Task 3：ProductionRun 后端 CRUD

**Files:**
- Create: `server/src/modules/production-run/dto/create-production-run.dto.ts`
- Create: `server/src/modules/production-run/production-run.service.ts`
- Create: `server/src/modules/production-run/production-run.service.spec.ts`
- Create: `server/src/modules/production-run/production-run.controller.ts`
- Create: `server/src/modules/production-run/production-run.module.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 创建 DTO**

```typescript
// server/src/modules/production-run/dto/create-production-run.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsDateString, IsNumber, IsPositive } from 'class-validator';

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
  @IsOptional() @IsNumber() @IsPositive()
  actual_yield?: number;

  @IsOptional() @IsString()
  yield_unit?: string;

  @IsOptional() @IsString()
  notes?: string;
}
```

**Step 2: 写失败测试**

```typescript
// server/src/modules/production-run/production-run.service.spec.ts
import { Test } from '@nestjs/testing';
import { ProductionRunService } from './production-run.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductionRunService', () => {
  let service: ProductionRunService;
  const mockEmit = jest.fn();

  const mockPrisma = {
    shiftInstance: { findFirst: jest.fn() },
    productionRun: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductionRunService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: { emit: mockEmit } },
      ],
    }).compile();
    service = module.get(ProductionRunService);
  });

  describe('create', () => {
    it('should throw NotFoundException when shift not found', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ shift_instance_id: 'x', production_line: '1', product_id: 'p1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when shift is closed', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'closed' });
      await expect(
        service.create({ shift_instance_id: 's1', production_line: '1', product_id: 'p1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create run for open shift', async () => {
      mockPrisma.shiftInstance.findFirst.mockResolvedValue({ id: 's1', status: 'open' });
      mockPrisma.productionRun.create.mockResolvedValue({ id: 'r1', status: 'active' });
      const result = await service.create({
        shift_instance_id: 's1', production_line: '1', product_id: 'p1',
      });
      expect(result.status).toBe('active');
    });
  });

  describe('close', () => {
    it('should emit production-run.closed event on close', async () => {
      mockPrisma.productionRun.findFirst.mockResolvedValue({
        id: 'r1', status: 'active', product_id: 'p1', shift_instance_id: 's1', company_id: '1',
      });
      mockPrisma.productionRun.update.mockResolvedValue({ id: 'r1', status: 'closed', product_id: 'p1', shift_instance_id: 's1', company_id: '1' });
      await service.close('r1', {});
      expect(mockEmit).toHaveBeenCalledWith('production-run.closed', expect.objectContaining({ id: 'r1' }));
    });
  });
});
```

**Step 3: 运行测试确认失败**

```bash
cd server
npx jest production-run.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './production-run.service'`

**Step 4: 实现 Service**

```typescript
// server/src/modules/production-run/production-run.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@Injectable()
export class ProductionRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateProductionRunDto) {
    const shift = await this.prisma.shiftInstance.findFirst({
      where: { id: dto.shift_instance_id, company_id: '1' },
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
      include: { product: true, recipe: true, shift_instance: true },
    });
  }

  async findByShift(shiftInstanceId: string) {
    return this.prisma.productionRun.findMany({
      where: { shift_instance_id: shiftInstanceId, company_id: '1' },
      include: { product: true, recipe: true },
      orderBy: { started_at: 'asc' },
    });
  }

  async close(id: string, dto: CloseProductionRunDto) {
    const run = await this.prisma.productionRun.findFirst({
      where: { id, company_id: '1' },
    });
    if (!run) throw new NotFoundException('生产段不存在');
    if (run.status === 'closed') throw new BadRequestException('生产段已关闭');

    const closed = await this.prisma.productionRun.update({
      where: { id },
      data: {
        status: 'closed',
        ended_at: new Date(),
        ...(dto.actual_yield != null ? { actual_yield: dto.actual_yield } : {}),
        ...(dto.yield_unit != null ? { yield_unit: dto.yield_unit } : {}),
        ...(dto.notes != null ? { notes: dto.notes } : {}),
      },
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

**Step 5: 运行测试确认通过**

```bash
npx jest production-run.service.spec.ts --no-coverage
```

Expected: PASS — 4 tests passed

**Step 6: 创建 Controller + Module**

```typescript
// server/src/modules/production-run/production-run.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ProductionRunService } from './production-run.service';
import { CreateProductionRunDto, CloseProductionRunDto } from './dto/create-production-run.dto';

@Controller('production-runs')
export class ProductionRunController {
  constructor(private readonly svc: ProductionRunService) {}

  @Post()
  create(@Body() dto: CreateProductionRunDto) {
    return this.svc.create(dto);
  }

  @Get()
  findByShift(@Query('shiftInstanceId') shiftInstanceId: string) {
    return this.svc.findByShift(shiftInstanceId);
  }

  @Patch(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseProductionRunDto) {
    return this.svc.close(id, dto);
  }
}
```

```typescript
// server/src/modules/production-run/production-run.module.ts
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

**Step 7: 注册到 AppModule，构建验证**

在 `app.module.ts` 中添加 `ProductionRunModule` import。

```bash
cd server && npx tsc --noEmit
```

Expected: 无错误

**Step 8: Commit**

```bash
cd ..
git add server/src/modules/production-run/ server/src/app.module.ts
git commit -m "feat: add ProductionRun CRUD with unit tests and production-run.closed event"
```

---

## Task 4：RecordTemplate fieldsJson 升级 + 单据号

**Files:**
- Create: `server/src/modules/record-template/types/fields-json.types.ts`
- Create: `server/src/modules/record-template/document-no.service.ts`
- Create: `server/src/modules/record-template/document-no.service.spec.ts`
- Modify: `server/src/modules/record-template/record-template.module.ts`
- Modify: `server/src/modules/record/record.service.ts`

**Step 1: 创建类型定义文件**

```typescript
// server/src/modules/record-template/types/fields-json.types.ts
export type FieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'boolean'
  | 'enum' | 'multi-enum'
  | 'inspection-table'
  | 'checklist'
  | 'photo'
  | 'signature'
  | 'entity-link';

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
  options?: string[];
  validRange?: { min?: number; max?: number };
  entity?: EntityType;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
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

**Step 2: 写失败测试**

```typescript
// server/src/modules/record-template/document-no.service.spec.ts
import { Test } from '@nestjs/testing';
import { DocumentNoService } from './document-no.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentNoService', () => {
  let service: DocumentNoService;
  const mockPrisma = {
    record: { count: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentNoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentNoService);
  });

  it('should generate document number with 4-digit sequence', async () => {
    mockPrisma.record.count.mockResolvedValue(2); // 2 existing today
    const no = await service.generate('GRSS-ZZ-JL-01');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(no).toBe(`GRSS-ZZ-JL-01-${today}-0003`);
  });

  it('should start at 0001 when no records exist today', async () => {
    mockPrisma.record.count.mockResolvedValue(0);
    const no = await service.generate('TPL-001');
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(no).toBe(`TPL-001-${today}-0001`);
  });
});
```

**Step 3: 运行确认失败**

```bash
cd server
npx jest document-no.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './document-no.service'`

**Step 4: 实现 DocumentNoService**

```typescript
// server/src/modules/record-template/document-no.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentNoService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(templateCode: string): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `${templateCode}-${dateStr}-`;

    const count = await this.prisma.record.count({
      where: { document_no: { startsWith: prefix } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
  }
}
```

**Step 5: 运行确认通过**

```bash
npx jest document-no.service.spec.ts --no-coverage
```

Expected: PASS — 2 tests passed

**Step 6: 注册到 RecordTemplateModule**

修改 `server/src/modules/record-template/record-template.module.ts`，在 providers 和 exports 中添加 `DocumentNoService`：

```typescript
import { DocumentNoService } from './document-no.service';
// providers: [RecordTemplateService, DocumentNoService]
// exports: [RecordTemplateService, DocumentNoService]
```

**Step 7: 在 record.service.ts 的 create 方法中集成 document_no**

在 `record.service.ts` 构造函数中注入 `DocumentNoService`（需先在 RecordModule 中 import RecordTemplateModule）。

在 `create` 方法的 `prisma.record.create` 的 data 对象中添加：

```typescript
document_no: await this.documentNoService.generate(template.code),
```

**Step 8: 构建验证**

```bash
npx tsc --noEmit
```

Expected: 无错误

**Step 9: Commit**

```bash
cd ..
git add server/src/modules/record-template/ server/src/modules/record/
git commit -m "feat: add fieldsJson type system, DocumentNoService, and auto document_no generation"
```

---

## Task 5：263 张表单 vault 解析脚本

**Files:**
- Create: `server/scripts/parse-vault-forms.ts`
- Create: `server/scripts/seed-templates.ts`
- Modify: `server/package.json`

**Step 1: 安装 glob**

```bash
cd server
npm install glob
npm install --save-dev @types/node
```

Expected: `added N packages`

**Step 2: 创建解析脚本**

```typescript
// server/scripts/parse-vault-forms.ts
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

export const VAULT_FORMS_DIR =
  '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单';

export interface ParsedField {
  name: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  defaultValue?: string;
}

export interface ParsedTemplate {
  code: string;
  name: string;
  department: string;
  fields: ParsedField[];
  rawPath: string;
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

function extractCode(filePath: string, content: string): string {
  const match = content.match(/GRSS-[A-Z]{2}-JL-\d+/);
  if (match) return match[0];
  return path.basename(filePath, '.md').toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 40);
}

export function parseFieldTable(content: string): ParsedField[] {
  const lines = content.split('\n');
  const fields: ParsedField[] = [];
  let inTable = false;
  let headerParsed = false;

  for (const line of lines) {
    if (!line.includes('|')) { inTable = false; headerParsed = false; continue; }
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols[0] === '字段名') { inTable = true; headerParsed = false; continue; }
    if (inTable && !headerParsed && cols[0].startsWith('-')) { headerParsed = true; continue; }
    if (!inTable || !headerParsed || !cols[0]) continue;

    fields.push({
      name: cols[0].replace(/\s+/g, '_').toLowerCase().replace(/[^\w]/g, '').slice(0, 50),
      label: cols[0],
      type: mapType(cols[1] ?? ''),
      unit: (cols[2] && cols[2] !== '-') ? cols[2] : undefined,
      required: cols[3] === '是',
      defaultValue: (cols[5] && cols[5] !== '-') ? cols[5] : undefined,
    });
  }
  return fields;
}

export function parseAllForms(): ParsedTemplate[] {
  const files = globSync('**/*.md', { cwd: VAULT_FORMS_DIR, absolute: true });
  const templates: ParsedTemplate[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const department = path.basename(path.dirname(file));
    const nameMatch = content.match(/^#\s+(.+)/m);
    const name = nameMatch ? nameMatch[1].trim() : path.basename(file, '.md');
    const fields = parseFieldTable(content);
    if (fields.length === 0) continue;

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

**Step 3: 创建种子脚本**

```typescript
// server/scripts/seed-templates.ts
import { PrismaClient } from '@prisma/client';
import { parseAllForms } from './parse-vault-forms';

const prisma = new PrismaClient();

async function main() {
  const templates = parseAllForms();
  console.log(`解析到 ${templates.length} 个表单模板`);

  let upserted = 0;
  for (const t of templates) {
    const fieldsJson = {
      sections: [{
        title: '表单内容',
        fields: t.fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          ...(f.unit ? { unit: f.unit } : {}),
          ...(f.defaultValue ? { defaultValue: f.defaultValue } : {}),
        })),
      }],
    };

    await prisma.recordTemplate.upsert({
      where: { code: t.code },
      update: { name: t.name, fieldsJson },
      create: {
        code: t.code,
        name: t.name,
        fieldsJson,
        description: `${t.department} — ${path.basename(t.rawPath)}`,
        status: 'active',
      },
    });
    upserted++;
  }

  console.log(`导入完成，共 upsert ${upserted} 个模板`);
}

// path import
import * as path from 'path';
main().catch(console.error).finally(() => prisma.$disconnect());
```

**Step 4: 添加 package.json script**

在 `server/package.json` 的 `scripts` 中添加：

```json
"seed:templates": "ts-node -P tsconfig.json --skip-project scripts/seed-templates.ts"
```

**Step 5: 运行脚本验证**

```bash
cd server
npm run seed:templates
```

Expected: 输出 `解析到 N 个表单模板` 和 `导入完成，共 upsert N 个模板`，N ≥ 150

**Step 6: Commit**

```bash
cd ..
git add server/scripts/ server/package.json
git commit -m "feat: add vault form parse script, batch import 263 templates into RecordTemplate"
```

---

## Task 6：前端班次看板 — 开班/开产/换产/关产

**Files:**
- Create: `client/src/api/shift-instance.ts`
- Create: `client/src/api/production-run.ts`
- Create: `client/src/views/shift/ShiftDashboard.vue`
- Create: `client/src/views/shift/components/OpenShiftDialog.vue`
- Create: `client/src/views/shift/components/OpenRunDialog.vue`
- Modify: `client/src/router/index.ts`

**Step 1: 创建 API 层**

```typescript
// client/src/api/shift-instance.ts
import request from './request'

export const ShiftInstanceApi = {
  create: (data: { shift_type: string; shift_date: string; notes?: string }) =>
    request.post('/shift-instances', data),
  list: (date?: string) =>
    request.get('/shift-instances', { params: date ? { date } : {} }),
  findOne: (id: string) =>
    request.get(`/shift-instances/${id}`),
  close: (id: string, notes?: string) =>
    request.patch(`/shift-instances/${id}/close`, { notes }),
}
```

```typescript
// client/src/api/production-run.ts
import request from './request'

export const ProductionRunApi = {
  create: (data: {
    shift_instance_id: string
    production_line: string
    product_id: string
    recipe_id?: string
  }) => request.post('/production-runs', data),
  listByShift: (shiftInstanceId: string) =>
    request.get('/production-runs', { params: { shiftInstanceId } }),
  close: (id: string, data: { actual_yield?: number; yield_unit?: string; notes?: string }) =>
    request.patch(`/production-runs/${id}/close`, data),
}
```

**Step 2: 创建开班对话框**

```vue
<!-- client/src/views/shift/components/OpenShiftDialog.vue -->
<template>
  <el-dialog :model-value="modelValue" title="开班" width="420px" @close="$emit('update:modelValue', false)">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="班次类型" prop="shift_type">
        <el-radio-group v-model="form.shift_type">
          <el-radio value="白班">白班</el-radio>
          <el-radio value="夜班">夜班</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="开班日期" prop="shift_date">
        <el-date-picker v-model="form.shift_date" type="date" value-format="YYYY-MM-DD" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.notes" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开班</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { ShiftInstanceApi } from '@/api/shift-instance'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'created'])

const formRef = ref()
const loading = ref(false)
const today = new Date().toISOString().slice(0, 10)

const form = reactive({ shift_type: '白班', shift_date: today, notes: '' })
const rules = {
  shift_type: [{ required: true, message: '请选择班次类型' }],
  shift_date: [{ required: true, message: '请选择日期' }],
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await ShiftInstanceApi.create(form)
    ElMessage.success('开班成功')
    emit('update:modelValue', false)
    emit('created')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '开班失败')
  } finally {
    loading.value = false
  }
}
</script>
```

**Step 3: 创建开产对话框**

```vue
<!-- client/src/views/shift/components/OpenRunDialog.vue -->
<template>
  <el-dialog :model-value="modelValue" title="开产" width="480px" @close="$emit('update:modelValue', false)">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="产线" prop="production_line">
        <el-input v-model="form.production_line" placeholder="如：1号线" />
      </el-form-item>
      <el-form-item label="产品" prop="product_id">
        <el-select v-model="form.product_id" filterable placeholder="搜索产品" style="width:100%" @change="onProductChange">
          <el-option v-for="p in products" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="配方">
        <el-select v-model="form.recipe_id" clearable placeholder="使用激活配方">
          <el-option v-for="r in recipes" :key="r.id" :label="`v${r.version} ${r.status === 'active' ? '(激活)' : ''}`" :value="r.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开产</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ProductionRunApi } from '@/api/production-run'
import request from '@/api/request'

const props = defineProps<{ modelValue: boolean; shiftInstanceId: string }>()
const emit = defineEmits(['update:modelValue', 'created'])

const formRef = ref()
const loading = ref(false)
const products = ref<any[]>([])
const recipes = ref<any[]>([])
const form = reactive({ production_line: '', product_id: '', recipe_id: '' })
const rules = {
  production_line: [{ required: true, message: '请填写产线' }],
  product_id: [{ required: true, message: '请选择产品' }],
}

onMounted(async () => {
  products.value = await request.get('/products')
})

async function onProductChange(productId: string) {
  form.recipe_id = ''
  recipes.value = await request.get('/recipes', { params: { product_id: productId } })
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await ProductionRunApi.create({
      shift_instance_id: props.shiftInstanceId,
      production_line: form.production_line,
      product_id: form.product_id,
      recipe_id: form.recipe_id || undefined,
    })
    ElMessage.success('开产成功')
    emit('update:modelValue', false)
    emit('created')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '开产失败')
  } finally {
    loading.value = false
  }
}
</script>
```

**Step 4: 创建班次看板主页面**

```vue
<!-- client/src/views/shift/ShiftDashboard.vue -->
<template>
  <div class="shift-dashboard" style="padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">班次看板 — {{ today }}</h2>
      <el-button type="primary" @click="openShiftDialog = true">开班</el-button>
    </div>

    <el-empty v-if="shifts.length === 0" description="今日暂无班次，点击开班" />

    <el-card v-for="shift in shifts" :key="shift.id" style="margin-bottom:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>
            <el-tag :type="shift.status === 'open' ? 'success' : 'info'">{{ shift.status === 'open' ? '进行中' : '已关班' }}</el-tag>
            &nbsp;{{ shift.shift_type }} | {{ formatDate(shift.shift_date) }}
          </span>
          <div>
            <el-button
              v-if="shift.status === 'open'"
              size="small"
              @click="openRunFor(shift)"
            >+ 开产</el-button>
            <el-button
              v-if="shift.status === 'open'"
              size="small"
              type="danger"
              plain
              @click="closeShift(shift.id)"
            >关班</el-button>
          </div>
        </div>
      </template>

      <el-empty v-if="shift.production_runs.length === 0" description="暂无生产段" :image-size="60" />

      <el-table v-else :data="shift.production_runs" size="small">
        <el-table-column label="产线" prop="production_line" width="80" />
        <el-table-column label="产品" prop="product.name" />
        <el-table-column label="开始时间" :formatter="(r:any) => formatTime(r.started_at)" width="140" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '生产中' : '已关产' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'active'"
              size="small"
              type="warning"
              plain
              @click="closeRun(row.id)"
            >关产</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <OpenShiftDialog v-model="openShiftDialog" @created="loadShifts" />
    <OpenRunDialog
      v-if="selectedShiftId"
      v-model="openRunDialog"
      :shift-instance-id="selectedShiftId"
      @created="loadShifts"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ShiftInstanceApi } from '@/api/shift-instance'
import { ProductionRunApi } from '@/api/production-run'
import OpenShiftDialog from './components/OpenShiftDialog.vue'
import OpenRunDialog from './components/OpenRunDialog.vue'

const shifts = ref<any[]>([])
const openShiftDialog = ref(false)
const openRunDialog = ref(false)
const selectedShiftId = ref('')
const today = new Date().toISOString().slice(0, 10)

onMounted(loadShifts)

async function loadShifts() {
  shifts.value = await ShiftInstanceApi.list(today)
}

function formatDate(d: string) {
  return d ? d.slice(0, 10) : ''
}

function formatTime(d: string) {
  return d ? new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''
}

function openRunFor(shift: any) {
  selectedShiftId.value = shift.id
  openRunDialog.value = true
}

async function closeShift(id: string) {
  await ElMessageBox.confirm('确认关班？', '提示', { type: 'warning' })
  await ShiftInstanceApi.close(id)
  ElMessage.success('关班成功')
  await loadShifts()
}

async function closeRun(id: string) {
  await ElMessageBox.confirm('确认关产？', '提示', { type: 'warning' })
  await ProductionRunApi.close(id, {})
  ElMessage.success('关产成功')
  await loadShifts()
}
</script>
```

**Step 5: 注册路由**

在 `client/src/router/index.ts` 的路由数组中添加：

```typescript
{
  path: '/shift-dashboard',
  name: 'ShiftDashboard',
  component: () => import('@/views/shift/ShiftDashboard.vue'),
},
```

**Step 6: 启动前端开发服务器验证**

```bash
cd client
npm run dev
```

打开浏览器访问 `/shift-dashboard`，验证：
1. 页面正常加载，显示"今日暂无班次"
2. 点击"开班"弹出对话框，表单验证正常
3. 开班后列表刷新显示新班次

**Step 7: Commit**

```bash
cd ..
git add client/src/api/shift-instance.ts client/src/api/production-run.ts client/src/views/shift/ client/src/router/index.ts
git commit -m "feat: add shift dashboard with open/close shift and production run UI"
```

---

## Task 7：班次完成度看板

**Files:**
- Create: `server/src/modules/shift-instance/shift-completion.service.ts`
- Create: `server/src/modules/shift-instance/shift-completion.service.spec.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.controller.ts`
- Modify: `server/src/modules/shift-instance/shift-instance.module.ts`
- Create: `client/src/views/shift/components/ShiftCompletionBoard.vue`

**Step 1: 写失败测试**

```typescript
// server/src/modules/shift-instance/shift-completion.service.spec.ts
import { Test } from '@nestjs/testing';
import { ShiftCompletionService } from './shift-completion.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ShiftCompletionService', () => {
  let service: ShiftCompletionService;

  const mockPrisma = {
    productionRun: { findMany: jest.fn() },
    recordTemplate: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShiftCompletionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShiftCompletionService);
  });

  it('should return 100% when all mandatory templates are filled', async () => {
    mockPrisma.recordTemplate.findMany.mockResolvedValue([
      { code: 'TPL-A', name: 'Template A' },
    ]);
    mockPrisma.productionRun.findMany.mockResolvedValue([{
      id: 'r1',
      product: { name: 'ProductX' },
      production_line: '1',
      status: 'active',
      records: [{ template: { code: 'TPL-A' } }],
    }]);

    const result = await service.getCompletionStatus('shift1');
    expect(result[0].completion_rate).toBe('100.0');
    expect(result[0].missing_templates).toHaveLength(0);
  });

  it('should list missing templates when unfilled', async () => {
    mockPrisma.recordTemplate.findMany.mockResolvedValue([
      { code: 'TPL-A', name: 'A' },
      { code: 'TPL-B', name: 'B' },
    ]);
    mockPrisma.productionRun.findMany.mockResolvedValue([{
      id: 'r1',
      product: { name: 'X' },
      production_line: '1',
      status: 'active',
      records: [{ template: { code: 'TPL-A' } }],
    }]);

    const result = await service.getCompletionStatus('shift1');
    expect(result[0].completion_rate).toBe('50.0');
    expect(result[0].missing_templates[0].code).toBe('TPL-B');
  });
});
```

**Step 2: 运行确认失败**

```bash
cd server
npx jest shift-completion.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './shift-completion.service'`

**Step 3: 实现 Service**

```typescript
// server/src/modules/shift-instance/shift-completion.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletionStatus(shiftInstanceId: string) {
    const [runs, mandatoryTemplates] = await Promise.all([
      this.prisma.productionRun.findMany({
        where: { shift_instance_id: shiftInstanceId, company_id: '1' },
        include: {
          product: true,
          records: { include: { template: true } },
        },
      }),
      this.prisma.recordTemplate.findMany({
        where: { status: 'active', is_mandatory: true },
        select: { code: true, name: true },
      }),
    ]);

    return runs.map(run => {
      const filledCodes = new Set(run.records.map(r => r.template.code));
      const missing = mandatoryTemplates.filter(t => !filledCodes.has(t.code));
      const total = mandatoryTemplates.length;
      const filled = total - missing.length;

      return {
        run_id: run.id,
        product_name: run.product.name,
        production_line: run.production_line,
        status: run.status,
        total_mandatory: total,
        filled,
        missing_templates: missing,
        completion_rate: total > 0 ? ((filled / total) * 100).toFixed(1) : '100.0',
      };
    });
  }
}
```

**Step 4: 运行确认通过**

```bash
npx jest shift-completion.service.spec.ts --no-coverage
```

Expected: PASS — 2 tests passed

**Step 5: 注册到 ShiftInstanceModule 并添加 Controller 端点**

在 `shift-instance.module.ts` 的 providers 中添加 `ShiftCompletionService`。

在 `shift-instance.controller.ts` 中添加：

```typescript
@Get(':id/completion')
getCompletion(@Param('id') id: string) {
  return this.completionService.getCompletionStatus(id);
}
```

**Step 6: 前端完成度组件**

```vue
<!-- client/src/views/shift/components/ShiftCompletionBoard.vue -->
<template>
  <div>
    <div v-for="run in completions" :key="run.run_id" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>{{ run.product_name }} — {{ run.production_line }}号线</span>
        <span>{{ run.filled }}/{{ run.total_mandatory }}</span>
      </div>
      <el-progress
        :percentage="parseFloat(run.completion_rate)"
        :status="parseFloat(run.completion_rate) === 100 ? 'success' : parseFloat(run.completion_rate) < 50 ? 'exception' : ''"
      />
      <div v-if="run.missing_templates.length > 0" style="margin-top:4px">
        <el-tag
          v-for="t in run.missing_templates"
          :key="t.code"
          type="danger"
          size="small"
          style="margin-right:4px"
        >{{ t.name }}</el-tag>
      </div>
    </div>
    <el-empty v-if="completions.length === 0" description="暂无生产段数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import request from '@/api/request'

const props = defineProps<{ shiftInstanceId: string }>()
const completions = ref<any[]>([])

async function load() {
  completions.value = await request.get(`/shift-instances/${props.shiftInstanceId}/completion`)
}

onMounted(load)
const timer = setInterval(load, 5 * 60 * 1000)
onUnmounted(() => clearInterval(timer))
</script>
```

**Step 7: Commit**

```bash
cd ..
git add server/src/modules/shift-instance/ client/src/views/shift/components/ShiftCompletionBoard.vue
git commit -m "feat: add shift completion board with mandatory template tracking and unit tests"
```

---

## Task 8：文件生命周期管理

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/modules/document/document-lifecycle.service.ts`
- Create: `server/src/modules/document/document-lifecycle.service.spec.ts`
- Create: `server/src/modules/document/dto/document-lifecycle.dto.ts`
- Modify: `server/src/modules/document/document.controller.ts`
- Modify: `server/src/modules/document/document.module.ts`

**Step 1: 扩展 Document 模型**

在 schema.prisma 的 Document 模型 `updatedAt` 行后、现有软删除字段前添加：

```prisma
  effective_date   DateTime?
  review_due_date  DateTime?
  superseded_by_id String?
  superseded_by    Document?  @relation("DocumentSuperseded", fields: [superseded_by_id], references: [id], onDelete: SetNull)
  supersedes       Document[] @relation("DocumentSuperseded")
```

在 Document 模型末尾（`@@map` 前）添加：

```prisma
  read_confirmations DocumentReadConfirmation[]
```

新增模型（追加到文件末尾）：

```prisma
model DocumentReadConfirmation {
  id           String   @id @default(cuid())
  document_id  String
  document     Document @relation(fields: [document_id], references: [id], onDelete: Cascade)
  user_id      String
  confirmed_at DateTime @default(now())

  @@unique([document_id, user_id])
  @@map("document_read_confirmations")
}
```

**Step 2: 运行迁移**

```bash
cd server
npx prisma migrate dev --name extend_document_lifecycle
```

Expected: 迁移成功，新增 `document_read_confirmations` 表

**Step 3: 创建 DTO**

```typescript
// server/src/modules/document/dto/document-lifecycle.dto.ts
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class PublishDocumentDto {
  @IsOptional() @IsDateString()
  effective_date?: string;

  @IsOptional() @IsDateString()
  review_due_date?: string;
}
```

**Step 4: 写失败测试**

```typescript
// server/src/modules/document/document-lifecycle.service.spec.ts
import { Test } from '@nestjs/testing';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DocumentLifecycleService', () => {
  let service: DocumentLifecycleService;

  const mockPrisma = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    documentReadConfirmation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentLifecycleService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DocumentLifecycleService);
  });

  it('should throw NotFoundException when document not found', async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null);
    await expect(service.publish('bad-id', {})).rejects.toThrow(NotFoundException);
  });

  it('should set status to effective on publish', async () => {
    mockPrisma.document.findFirst.mockResolvedValue({ id: 'd1', status: 'approved' });
    mockPrisma.document.update.mockResolvedValue({ id: 'd1', status: 'effective' });
    const result = await service.publish('d1', {});
    expect(result.status).toBe('effective');
    expect(mockPrisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'effective' }) }),
    );
  });

  it('should record read confirmation', async () => {
    mockPrisma.documentReadConfirmation.upsert.mockResolvedValue({ id: 'c1' });
    await service.confirmRead('doc1', 'user1');
    expect(mockPrisma.documentReadConfirmation.upsert).toHaveBeenCalled();
  });

  it('should return documents expiring within 30 days', async () => {
    mockPrisma.document.findMany.mockResolvedValue([{ id: 'd1', review_due_date: new Date() }]);
    const result = await service.getDueSoon(30);
    expect(result).toHaveLength(1);
  });
});
```

**Step 5: 运行确认失败**

```bash
npx jest document-lifecycle.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './document-lifecycle.service'`

**Step 6: 实现 Service**

```typescript
// server/src/modules/document/document-lifecycle.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishDocumentDto } from './dto/document-lifecycle.dto';

@Injectable()
export class DocumentLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(id: string, dto: PublishDocumentDto) {
    const doc = await this.prisma.document.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('文件不存在');

    return this.prisma.document.update({
      where: { id },
      data: {
        status: 'effective',
        effective_date: dto.effective_date ? new Date(dto.effective_date) : new Date(),
        ...(dto.review_due_date ? { review_due_date: new Date(dto.review_due_date) } : {}),
      },
    });
  }

  async supersede(oldId: string, newId: string) {
    await this.prisma.document.update({
      where: { id: oldId },
      data: { status: 'superseded', superseded_by_id: newId },
    });
  }

  async confirmRead(documentId: string, userId: string) {
    return this.prisma.documentReadConfirmation.upsert({
      where: { document_id_user_id: { document_id: documentId, user_id: userId } },
      update: { confirmed_at: new Date() },
      create: { document_id: documentId, user_id: userId },
    });
  }

  async getReadStatus(documentId: string) {
    return this.prisma.documentReadConfirmation.findMany({
      where: { document_id: documentId },
      include: { user: true } as any,
    });
  }

  async getDueSoon(days = 30) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return this.prisma.document.findMany({
      where: {
        status: 'effective',
        review_due_date: { lte: deadline },
      },
      orderBy: { review_due_date: 'asc' },
    });
  }
}
```

**Step 7: 运行确认通过**

```bash
npx jest document-lifecycle.service.spec.ts --no-coverage
```

Expected: PASS — 4 tests passed

**Step 8: 注册到 DocumentModule，添加 Controller 端点**

在 `document.module.ts` providers/exports 中添加 `DocumentLifecycleService`。

在 `document.controller.ts` 中添加：

```typescript
@Patch(':id/publish')
publish(@Param('id') id: string, @Body() dto: PublishDocumentDto) {
  return this.lifecycleSvc.publish(id, dto);
}

@Post(':id/confirm-read')
confirmRead(@Param('id') id: string, @Req() req: any) {
  return this.lifecycleSvc.confirmRead(id, req.user?.id ?? 'system');
}

@Get('due-soon')
getDueSoon(@Query('days') days?: string) {
  return this.lifecycleSvc.getDueSoon(days ? parseInt(days) : 30);
}
```

**Step 9: Commit**

```bash
cd ..
git add server/src/prisma/ server/src/modules/document/
git commit -m "feat: add document lifecycle service with publish, supersede, read confirmation"
```

---

## Task 9：定期任务引擎（cron 驱动）

**Files:**
- Modify: `server/src/prisma/schema.prisma`（扩展 RecordTaskAssignment）
- Create: `server/src/modules/scheduled-task/scheduled-task.module.ts`
- Create: `server/src/modules/scheduled-task/scheduled-task.service.ts`
- Create: `server/src/modules/scheduled-task/scheduled-task.service.spec.ts`
- Create: `server/src/modules/scheduled-task/scheduled-task.scheduler.ts`
- Modify: `server/src/app.module.ts`

**Step 1: 安装 cron-parser**

```bash
cd server
npm install cron-parser
npm install --save-dev @types/cron-parser 2>/dev/null || true
```

Expected: `added N packages`

**Step 2: 扩展 RecordTaskAssignment 模型**

在 schema.prisma 的 RecordTaskAssignment 模型 `updatedAt` 行后、`@@index` 前添加：

```prisma
  cron_expression    String?
  source_document_id String?
  last_triggered_at  DateTime?
```

**Step 3: 运行迁移**

```bash
cd server
npx prisma migrate dev --name extend_record_task_assignment_cron
```

**Step 4: 写失败测试**

```typescript
// server/src/modules/scheduled-task/scheduled-task.service.spec.ts
import { Test } from '@nestjs/testing';
import { ScheduledTaskService } from './scheduled-task.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScheduledTaskService', () => {
  let service: ScheduledTaskService;

  const mockPrisma = {
    recordTaskAssignment: { findMany: jest.fn(), update: jest.fn() },
    recordTaskInstance: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ScheduledTaskService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ScheduledTaskService);
  });

  it('should create instance for a due cron rule', async () => {
    // cron "* * * * *" = every minute, always due
    mockPrisma.recordTaskAssignment.findMany.mockResolvedValue([{
      id: 'a1', isPeriodic: true, cron_expression: '* * * * *',
      title: 'Daily Check', templateId: 't1', departmentId: 'd1',
    }]);
    mockPrisma.recordTaskInstance.create.mockResolvedValue({ id: 'i1' });

    await service.triggerDueTasks();

    expect(mockPrisma.recordTaskInstance.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignmentId: 'a1' }) }),
    );
  });

  it('should skip assignments without cron_expression', async () => {
    mockPrisma.recordTaskAssignment.findMany.mockResolvedValue([{
      id: 'a2', isPeriodic: false, cron_expression: null, title: 'Manual',
    }]);

    await service.triggerDueTasks();

    expect(mockPrisma.recordTaskInstance.create).not.toHaveBeenCalled();
  });
});
```

**Step 5: 运行确认失败**

```bash
npx jest scheduled-task.service.spec.ts --no-coverage
```

Expected: FAIL

**Step 6: 实现 Service**

```typescript
// server/src/modules/scheduled-task/scheduled-task.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as cronParser from 'cron-parser';

@Injectable()
export class ScheduledTaskService {
  constructor(private readonly prisma: PrismaService) {}

  isCronDueNow(expression: string): boolean {
    try {
      const interval = cronParser.parseExpression(expression, { utc: false });
      const prev = interval.prev().toDate();
      const now = new Date();
      // 如果上次触发时间在过去60秒内，视为"今天该触发"
      return (now.getTime() - prev.getTime()) < 60 * 1000;
    } catch {
      return false;
    }
  }

  async triggerDueTasks() {
    const periodicRules = await this.prisma.recordTaskAssignment.findMany({
      where: { isPeriodic: true, status: 'active', cron_expression: { not: null } },
    });

    const triggered: string[] = [];
    for (const rule of periodicRules) {
      if (!rule.cron_expression) continue;
      if (!this.isCronDueNow(rule.cron_expression)) continue;

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 1);

      await this.prisma.recordTaskInstance.create({
        data: {
          assignmentId: rule.id,
          deadline,
          status: 'pending',
        },
      });

      await this.prisma.recordTaskAssignment.update({
        where: { id: rule.id },
        data: { last_triggered_at: new Date() },
      });

      triggered.push(rule.id);
    }
    return triggered;
  }
}
```

**Step 7: 运行确认通过**

```bash
npx jest scheduled-task.service.spec.ts --no-coverage
```

Expected: PASS — 2 tests passed

**Step 8: 创建 Scheduler（注册定时执行）**

```typescript
// server/src/modules/scheduled-task/scheduled-task.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';

@Injectable()
export class ScheduledTaskScheduler {
  constructor(private readonly svc: ScheduledTaskService) {}

  @Cron('0 8 * * *') // 每天8:00
  async dailyTrigger() {
    await this.svc.triggerDueTasks();
  }
}
```

**Step 9: 创建 Module 并注册到 AppModule**

```typescript
// server/src/modules/scheduled-task/scheduled-task.module.ts
import { Module } from '@nestjs/common';
import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskScheduler } from './scheduled-task.scheduler';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScheduledTaskService, ScheduledTaskScheduler],
  exports: [ScheduledTaskService],
})
export class ScheduledTaskModule {}
```

在 `app.module.ts` 添加 `ScheduledTaskModule`。

**Step 10: Commit**

```bash
cd ..
git add server/src/prisma/ server/src/modules/scheduled-task/ server/src/app.module.ts
git commit -m "feat: add cron-driven scheduled task engine using RecordTaskAssignment"
```

---

## Task 10：移动端适配 + 图片附件

**Files:**
- Create: `server/src/modules/upload/upload.module.ts`
- Create: `server/src/modules/upload/upload.controller.ts`
- Modify: `server/src/app.module.ts`
- Create: `client/src/composables/usePhotoUpload.ts`
- Modify: `client/src/views/record/RecordForm.vue`
- Create: `client/src/assets/styles/mobile.css`
- Modify: `client/src/main.ts`

**Step 1: 创建上传 Controller（multer 已安装）**

```typescript
// server/src/modules/upload/upload.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

@Controller('upload')
export class UploadController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${path.extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('只允许上传图片'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('未收到文件');
    return { url: `/uploads/${file.filename}` };
  }
}
```

```typescript
// server/src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({ controllers: [UploadController] })
export class UploadModule {}
```

在 `app.module.ts` 添加 `UploadModule`。

**Step 2: 在 main.ts 中添加静态文件服务**

在 `server/src/main.ts` 中，`app.listen` 之前添加：

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
// ...
const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useStaticAssets(path.join(__dirname, '..', 'uploads'), { prefix: '/uploads' });
```

**Step 3: 前端 usePhotoUpload composable**

```typescript
// client/src/composables/usePhotoUpload.ts
import { ref } from 'vue'
import axios from 'axios'

export function usePhotoUpload() {
  const uploading = ref(false)

  async function uploadPhoto(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('只允许上传图片文件')
    }
    uploading.value = true
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post('/api/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return (res.data as { url: string }).url
    } finally {
      uploading.value = false
    }
  }

  return { uploadPhoto, uploading }
}
```

**Step 4: 在 RecordForm.vue 中添加 photo 字段渲染**

找到字段类型渲染的 `v-if` 区块，添加 photo case：

```vue
<template v-else-if="field.type === 'photo'">
  <el-upload
    action="/api/upload/image"
    list-type="picture-card"
    :limit="3"
    accept="image/*"
    :on-success="(res: any) => { formData[field.name] = res.url }"
    :on-error="() => ElMessage.error('图片上传失败')"
  >
    <el-icon><Camera /></el-icon>
  </el-upload>
</template>
```

**Step 5: 创建移动端 CSS**

```css
/* client/src/assets/styles/mobile.css */
@media (max-width: 768px) {
  .page-container { padding: 12px; }
  .el-form-item { margin-bottom: 14px; }
  .el-form-item__label { font-size: 13px; }
  .el-table { font-size: 12px; }
  .page-header,
  .header-actions { flex-direction: column; gap: 8px; }
  .el-dialog { width: 95vw !important; margin: 4vh auto !important; }
  .el-button { min-height: 40px; font-size: 14px; }
  .el-input__inner { font-size: 16px; } /* 防止 iOS 自动缩放 */
}
```

在 `client/src/main.ts` 中添加：

```typescript
import '@/assets/styles/mobile.css'
```

**Step 6: 构建验证**

```bash
cd server && npx tsc --noEmit
cd ../client && npx vue-tsc --noEmit
```

Expected: 无错误

**Step 7: Commit**

```bash
cd ..
git add server/src/modules/upload/ server/src/main.ts client/src/composables/usePhotoUpload.ts client/src/assets/styles/mobile.css client/src/main.ts client/src/views/record/RecordForm.vue
git commit -m "feat: add image upload endpoint and mobile-responsive styles"
```

---

## Task 11：完整 CAPA 闭环 + 趋势分析

**Files:**
- Modify: `server/src/prisma/schema.prisma`
- Create: `server/src/modules/corrective-action/verification-record.service.ts`
- Create: `server/src/modules/corrective-action/verification-record.service.spec.ts`
- Create: `server/src/modules/corrective-action/capa-analytics.service.ts`
- Create: `server/src/modules/corrective-action/dto/create-verification.dto.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.controller.ts`
- Modify: `server/src/modules/corrective-action/corrective-action.module.ts`
- Create: `client/src/views/corrective-action/CapaDetail.vue`
- Create: `client/src/views/corrective-action/CapaAnalytics.vue`

**Step 1: 添加 VerificationRecord 模型**

在 schema.prisma 末尾追加（CorrectiveAction 模型后）：

```prisma
model VerificationRecord {
  id                   String           @id @default(cuid())
  company_id           String
  corrective_action_id String
  corrective_action    CorrectiveAction @relation(fields: [corrective_action_id], references: [id], onDelete: Cascade)
  verified_by          String
  verification_method  String
  result               String           // 'effective' | 'ineffective'
  notes                String?
  evidence_record_ids  String[]
  verified_at          DateTime         @default(now())
  created_at           DateTime         @default(now())

  @@index([corrective_action_id])
  @@map("verification_records")
}
```

在 CorrectiveAction 模型末尾 `@@map` 前添加：

```prisma
  verification_records VerificationRecord[]
```

**Step 2: 运行迁移**

```bash
cd server
npx prisma migrate dev --name add_verification_record
```

**Step 3: 创建 DTO**

```typescript
// server/src/modules/corrective-action/dto/create-verification.dto.ts
import { IsNotEmpty, IsString, IsIn, IsOptional, IsArray } from 'class-validator';

export class CreateVerificationDto {
  @IsNotEmpty() @IsString()
  verification_method: string;

  @IsNotEmpty() @IsIn(['effective', 'ineffective'])
  result: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  evidence_record_ids?: string[];
}
```

**Step 4: 写失败测试**

```typescript
// server/src/modules/corrective-action/verification-record.service.spec.ts
import { Test } from '@nestjs/testing';
import { VerificationRecordService } from './verification-record.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('VerificationRecordService', () => {
  let service: VerificationRecordService;

  const mockPrisma = {
    correctiveAction: { findFirst: jest.fn(), update: jest.fn() },
    verificationRecord: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        VerificationRecordService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(VerificationRecordService);
  });

  it('should throw NotFoundException when CAPA not found', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue(null);
    await expect(
      service.createVerification('bad-id', { verification_method: 'test', result: 'effective' }, 'u1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should close CAPA when verification is effective', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue({ id: 'c1', company_id: '1', status: 'pending_verification' });
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: 'v1', result: 'effective' });
    mockPrisma.correctiveAction.update.mockResolvedValue({ id: 'c1', status: 'closed' });

    await service.createVerification('c1', { verification_method: 'inspection', result: 'effective' }, 'u1');

    expect(mockPrisma.correctiveAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'closed' }) }),
    );
  });

  it('should reopen CAPA when verification is ineffective', async () => {
    mockPrisma.correctiveAction.findFirst.mockResolvedValue({ id: 'c1', company_id: '1', status: 'pending_verification' });
    mockPrisma.verificationRecord.create.mockResolvedValue({ id: 'v1', result: 'ineffective' });
    mockPrisma.correctiveAction.update.mockResolvedValue({ id: 'c1', status: 'implementing' });

    await service.createVerification('c1', { verification_method: 'test', result: 'ineffective' }, 'u1');

    expect(mockPrisma.correctiveAction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'implementing' }) }),
    );
  });
});
```

**Step 5: 运行确认失败**

```bash
npx jest verification-record.service.spec.ts --no-coverage
```

Expected: FAIL

**Step 6: 实现 Service**

```typescript
// server/src/modules/corrective-action/verification-record.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVerificationDto } from './dto/create-verification.dto';

@Injectable()
export class VerificationRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async createVerification(capaId: string, dto: CreateVerificationDto, userId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({
      where: { id: capaId, company_id: '1' },
    });
    if (!capa) throw new NotFoundException('纠正措施不存在');

    await this.prisma.verificationRecord.create({
      data: {
        company_id: '1',
        corrective_action_id: capaId,
        verified_by: userId,
        verification_method: dto.verification_method,
        result: dto.result,
        notes: dto.notes,
        evidence_record_ids: dto.evidence_record_ids ?? [],
      },
    });

    const newStatus = dto.result === 'effective' ? 'closed' : 'implementing';
    return this.prisma.correctiveAction.update({
      where: { id: capaId },
      data: {
        status: newStatus,
        ...(newStatus === 'closed' ? { closed_at: new Date(), verified_by: userId, verified_at: new Date() } : {}),
      },
    });
  }

  async listVerifications(capaId: string) {
    return this.prisma.verificationRecord.findMany({
      where: { corrective_action_id: capaId },
      orderBy: { created_at: 'desc' },
    });
  }
}
```

**Step 7: 运行确认通过**

```bash
npx jest verification-record.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests passed

**Step 8: 实现趋势分析 Service**

```typescript
// server/src/modules/corrective-action/capa-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CapaAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrends(months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const actions = await this.prisma.correctiveAction.findMany({
      where: { company_id: '1', created_at: { gte: since } },
      include: { verification_records: true },
    });

    const byStatus = actions.reduce((acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});

    const closed = actions.filter(a => a.status === 'closed' && a.closed_at);
    const avgCloseDays = closed.length > 0
      ? closed.reduce((sum, a) => {
          const days = (a.closed_at!.getTime() - a.created_at.getTime()) / 86400000;
          return sum + days;
        }, 0) / closed.length
      : 0;

    const monthly: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }
    for (const a of actions) {
      const key = `${a.created_at.getFullYear()}-${String(a.created_at.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthly) monthly[key]++;
    }

    return {
      total: actions.length,
      by_status: byStatus,
      avg_close_days: Math.round(avgCloseDays * 10) / 10,
      monthly_trend: Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count })),
    };
  }
}
```

**Step 9: 注册服务，添加 Controller 端点**

在 `corrective-action.module.ts` 中添加 `VerificationRecordService` 和 `CapaAnalyticsService` 到 providers。

在 `corrective-action.controller.ts` 中添加：

```typescript
@Post(':id/verifications')
createVerification(@Param('id') id: string, @Body() dto: CreateVerificationDto, @Req() req: any) {
  return this.verificationSvc.createVerification(id, dto, req.user?.id ?? 'system');
}

@Get(':id/verifications')
listVerifications(@Param('id') id: string) {
  return this.verificationSvc.listVerifications(id);
}

@Get('analytics/trends')
getTrends(@Query('months') months?: string) {
  return this.analyticsSvc.getTrends(months ? parseInt(months) : 6);
}
```

**Step 10: 创建 CapaDetail 前端页面**

```vue
<!-- client/src/views/corrective-action/CapaDetail.vue -->
<template>
  <div style="padding:20px">
    <el-page-header @back="$router.back()" :content="`CAPA — ${capa?.capa_no ?? ''}`" />

    <el-descriptions :column="2" border style="margin-top:16px">
      <el-descriptions-item label="状态">
        <el-tag :type="statusType(capa?.status)">{{ statusLabel(capa?.status) }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="截止日期">{{ capa?.due_date?.slice(0,10) }}</el-descriptions-item>
      <el-descriptions-item label="根本原因" :span="2">{{ capa?.root_cause ?? '—' }}</el-descriptions-item>
      <el-descriptions-item label="纠正措施" :span="2">{{ capa?.corrective_action ?? '—' }}</el-descriptions-item>
    </el-descriptions>

    <el-timeline style="margin-top:24px">
      <el-timeline-item timestamp="创建" placement="top">已建立纠正措施</el-timeline-item>
      <el-timeline-item timestamp="实施" placement="top" :type="capa?.status !== 'open' ? 'success' : ''">
        措施实施中
      </el-timeline-item>
      <el-timeline-item timestamp="验证" placement="top" :type="['pending_verification','closed'].includes(capa?.status) ? 'success' : ''">
        等待验证
      </el-timeline-item>
      <el-timeline-item timestamp="关闭" placement="top" :type="capa?.status === 'closed' ? 'success' : ''">
        已关闭
      </el-timeline-item>
    </el-timeline>

    <div style="margin-top:16px;display:flex;gap:8px">
      <el-button v-if="capa?.status === 'open'" type="primary" @click="advance('implementing')">开始实施</el-button>
      <el-button v-if="capa?.status === 'implementing'" type="warning" @click="advance('pending_verification')">提交验证</el-button>
      <el-button v-if="capa?.status === 'pending_verification'" type="success" @click="verifyDialog = true">记录验证结果</el-button>
    </div>

    <el-divider>验证记录</el-divider>
    <el-table :data="verifications" size="small">
      <el-table-column label="验证方法" prop="verification_method" />
      <el-table-column label="结论" width="80">
        <template #default="{ row }">
          <el-tag :type="row.result === 'effective' ? 'success' : 'danger'" size="small">
            {{ row.result === 'effective' ? '有效' : '无效' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="notes" />
      <el-table-column label="时间" :formatter="(r:any) => r.verified_at?.slice(0,10)" width="100" />
    </el-table>

    <!-- 验证对话框 -->
    <el-dialog v-model="verifyDialog" title="记录验证结果" width="420px">
      <el-form :model="verifyForm" label-width="80px">
        <el-form-item label="验证方法">
          <el-input v-model="verifyForm.verification_method" />
        </el-form-item>
        <el-form-item label="结论">
          <el-radio-group v-model="verifyForm.result">
            <el-radio value="effective">有效</el-radio>
            <el-radio value="ineffective">无效，需重新实施</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="verifyForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="verifyDialog = false">取消</el-button>
        <el-button type="primary" :loading="verifyLoading" @click="submitVerification">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const route = useRoute()
const capaId = route.params.id as string
const capa = ref<any>(null)
const verifications = ref<any[]>([])
const verifyDialog = ref(false)
const verifyLoading = ref(false)
const verifyForm = reactive({ verification_method: '', result: 'effective', notes: '' })

onMounted(async () => {
  capa.value = await request.get(`/corrective-actions/${capaId}`)
  verifications.value = await request.get(`/corrective-actions/${capaId}/verifications`)
})

function statusLabel(s?: string) {
  return { open: '待处理', implementing: '实施中', pending_verification: '待验证', closed: '已关闭' }[s ?? ''] ?? s
}

function statusType(s?: string) {
  return { open: 'danger', implementing: 'warning', pending_verification: 'primary', closed: 'success' }[s ?? ''] ?? ''
}

async function advance(newStatus: string) {
  await request.patch(`/corrective-actions/${capaId}`, { status: newStatus })
  capa.value = await request.get(`/corrective-actions/${capaId}`)
}

async function submitVerification() {
  verifyLoading.value = true
  try {
    await request.post(`/corrective-actions/${capaId}/verifications`, verifyForm)
    ElMessage.success('验证记录已提交')
    verifyDialog.value = false
    capa.value = await request.get(`/corrective-actions/${capaId}`)
    verifications.value = await request.get(`/corrective-actions/${capaId}/verifications`)
  } catch {
    ElMessage.error('提交失败')
  } finally {
    verifyLoading.value = false
  }
}
</script>
```

**Step 11: 注册路由**

```typescript
{ path: '/corrective-actions/:id', name: 'CapaDetail', component: () => import('@/views/corrective-action/CapaDetail.vue') },
{ path: '/corrective-actions/analytics', name: 'CapaAnalytics', component: () => import('@/views/corrective-action/CapaAnalytics.vue') },
```

**Step 12: Commit**

```bash
cd ..
git add server/src/prisma/ server/src/modules/corrective-action/ client/src/views/corrective-action/ client/src/router/index.ts
git commit -m "feat: complete CAPA loop with VerificationRecord, state machine, trend analytics, and detail UI"
```

---

## Task 12：管理层仪表盘 + BRCGS 准备度 + 批次追溯 PDF

**Files:**
- Create: `server/src/modules/statistics/management-dashboard.service.ts`
- Create: `server/src/modules/statistics/management-dashboard.service.spec.ts`
- Create: `server/src/modules/statistics/traceability-export.service.ts`
- Modify: `server/src/modules/statistics/statistics.module.ts`
- Modify: `server/src/modules/statistics/statistics.controller.ts`
- Create: `client/src/views/dashboard/ManagementDashboard.vue`

**Step 1: 写失败测试**

```typescript
// server/src/modules/statistics/management-dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { ManagementDashboardService } from './management-dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ManagementDashboardService', () => {
  let service: ManagementDashboardService;

  const mockPrisma = {
    nonConformance: { count: jest.fn() },
    correctiveAction: { count: jest.fn() },
    record: { count: jest.fn() },
    trainingRecord: { count: jest.fn() },
    document: { count: jest.fn(), findMany: jest.fn() },
    shiftInstance: { findMany: jest.fn() },
    recordTemplate: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.values(mockPrisma).forEach(m => {
      if (typeof m.count === 'function') m.count.mockResolvedValue(0);
      if (typeof m.findMany === 'function') m.findMany.mockResolvedValue([]);
    });
    const module = await Test.createTestingModule({
      providers: [
        ManagementDashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ManagementDashboardService);
  });

  it('should return KPIs with numeric values', async () => {
    mockPrisma.nonConformance.count.mockResolvedValue(5);
    mockPrisma.correctiveAction.count.mockResolvedValue(2);

    const kpis = await service.getKpis();

    expect(kpis.nc_count_this_month).toBe(5);
    expect(kpis.capa_overdue_count).toBe(2);
    expect(typeof kpis.docs_expiring_soon).toBe('number');
  });

  it('should list documents expiring within 30 days', async () => {
    mockPrisma.document.findMany.mockResolvedValue([
      { id: 'd1', title: 'SOP-01', review_due_date: new Date() },
    ]);

    const docs = await service.getBrcgsReadiness();
    expect(docs.expiring_docs).toHaveLength(1);
  });
});
```

**Step 2: 运行确认失败**

```bash
cd server
npx jest management-dashboard.service.spec.ts --no-coverage
```

Expected: FAIL

**Step 3: 实现 ManagementDashboardService**

```typescript
// server/src/modules/statistics/management-dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ManagementDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [ncCount, capaOverdue, ccpRecords, docsExpiringSoon] = await Promise.all([
      this.prisma.nonConformance.count({
        where: { company_id: '1', created_at: { gte: monthStart } },
      }),
      this.prisma.correctiveAction.count({
        where: { company_id: '1', status: { not: 'closed' }, due_date: { lt: now } },
      }),
      this.prisma.record.count({
        where: { template: { code: { contains: 'CCP' } }, createdAt: { gte: monthStart } },
      }),
      this.prisma.document.count({
        where: {
          status: 'effective',
          review_due_date: { lte: new Date(now.getTime() + 30 * 86400000) },
        },
      }),
    ]);

    return {
      nc_count_this_month: ncCount,
      capa_overdue_count: capaOverdue,
      ccp_records_this_month: ccpRecords,
      docs_expiring_soon: docsExpiringSoon,
    };
  }

  async getBrcgsReadiness() {
    const now = new Date();

    const [expiringDocs, overdueCapas] = await Promise.all([
      this.prisma.document.findMany({
        where: {
          status: 'effective',
          review_due_date: { lte: new Date(now.getTime() + 30 * 86400000) },
        },
        select: { id: true, title: true, number: true, review_due_date: true },
        orderBy: { review_due_date: 'asc' },
      }),
      this.prisma.correctiveAction.findMany({
        where: { company_id: '1', status: { not: 'closed' }, due_date: { lt: now } },
        select: { id: true, capa_no: true, description: true, due_date: true },
        orderBy: { due_date: 'asc' },
      }),
    ]);

    return { expiring_docs: expiringDocs, overdue_capas: overdueCapas };
  }
}
```

**Step 4: 运行确认通过**

```bash
npx jest management-dashboard.service.spec.ts --no-coverage
```

Expected: PASS — 2 tests passed

**Step 5: 实现批次追溯 PDF Service（pdfkit 已安装）**

```typescript
// server/src/modules/statistics/traceability-export.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class TraceabilityExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportBatchPdf(finishedGoodsBatchId: string): Promise<Buffer> {
    const batch = await this.prisma.finishedGoodsBatch.findFirst({
      where: { id: finishedGoodsBatchId },
      include: {
        records: { include: { template: true } },
      },
    });
    if (!batch) throw new NotFoundException('成品批次不存在');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 封面
      doc.fontSize(20).text('成品批次追溯报告', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`批次号: ${(batch as any).batch_no ?? batch.id}`);
      doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
      doc.moveDown();

      // 关联记录清单
      doc.fontSize(14).text('关联表单记录');
      doc.moveDown(0.5);
      for (const record of (batch as any).records ?? []) {
        doc.fontSize(10).text(`• ${record.template.name} — ${record.document_no ?? record.number}`);
      }

      doc.end();
    });
  }
}
```

**Step 6: 注册服务并添加 Controller 端点**

在 `statistics.module.ts` 中添加两个新 service 到 providers。

在 `statistics.controller.ts` 中添加：

```typescript
@Get('dashboard/kpis')
getKpis() { return this.dashboardSvc.getKpis(); }

@Get('dashboard/brcgs-readiness')
getBrcgsReadiness() { return this.dashboardSvc.getBrcgsReadiness(); }

@Get('traceability/:batchId/pdf')
@Header('Content-Type', 'application/pdf')
@Header('Content-Disposition', 'attachment; filename="traceability.pdf"')
async exportPdf(@Param('batchId') batchId: string, @Res() res: Response) {
  const buffer = await this.exportSvc.exportBatchPdf(batchId);
  (res as any).end(buffer);
}
```

**Step 7: 创建管理仪表盘前端**

```vue
<!-- client/src/views/dashboard/ManagementDashboard.vue -->
<template>
  <div style="padding:20px">
    <h2>管理层仪表盘</h2>

    <el-row :gutter="16" style="margin-bottom:24px">
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="本月不合格品" :value="kpis.nc_count_this_month">
            <template #suffix><span style="color:#f56c6c">件</span></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="超期未关闭CAPA" :value="kpis.capa_overdue_count">
            <template #suffix><span :style="{color: kpis.capa_overdue_count > 0 ? '#f56c6c' : '#67c23a'}">项</span></template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="本月CCP记录" :value="kpis.ccp_records_this_month" />
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card>
          <el-statistic title="即将过期文件" :value="kpis.docs_expiring_soon">
            <template #suffix><span :style="{color: kpis.docs_expiring_soon > 0 ? '#e6a23c' : '#67c23a'}">份</span></template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :sm="12">
        <el-card header="即将过期体系文件（30天内）">
          <el-empty v-if="readiness.expiring_docs.length === 0" description="无即将过期文件" />
          <el-table v-else :data="readiness.expiring_docs" size="small">
            <el-table-column label="文件编号" prop="number" width="140" />
            <el-table-column label="文件名称" prop="title" />
            <el-table-column label="评审日期" :formatter="(r:any) => r.review_due_date?.slice(0,10)" width="110">
              <template #default="{ row }">
                <span :style="{ color: isUrgent(row.review_due_date) ? '#f56c6c' : '#e6a23c' }">
                  {{ row.review_due_date?.slice(0, 10) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :sm="12">
        <el-card header="超期未关闭CAPA">
          <el-empty v-if="readiness.overdue_capas.length === 0" description="无超期CAPA" />
          <el-table v-else :data="readiness.overdue_capas" size="small">
            <el-table-column label="编号" prop="capa_no" width="120" />
            <el-table-column label="描述" prop="description" />
            <el-table-column label="截止" :formatter="(r:any) => r.due_date?.slice(0,10)" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'

const kpis = ref({ nc_count_this_month: 0, capa_overdue_count: 0, ccp_records_this_month: 0, docs_expiring_soon: 0 })
const readiness = ref<{ expiring_docs: any[]; overdue_capas: any[] }>({ expiring_docs: [], overdue_capas: [] })

onMounted(async () => {
  [kpis.value, readiness.value] = await Promise.all([
    request.get('/statistics/dashboard/kpis'),
    request.get('/statistics/dashboard/brcgs-readiness'),
  ])
})

function isUrgent(dateStr: string) {
  return new Date(dateStr).getTime() - Date.now() < 7 * 86400000
}
</script>
```

**Step 8: 注册路由**

```typescript
{ path: '/management-dashboard', name: 'ManagementDashboard', component: () => import('@/views/dashboard/ManagementDashboard.vue') },
```

**Step 9: 构建验证**

```bash
cd server && npx tsc --noEmit
cd ../client && npx vue-tsc --noEmit
```

Expected: 无错误

**Step 10: Commit**

```bash
cd ..
git add server/src/modules/statistics/ client/src/views/dashboard/ client/src/router/index.ts
git commit -m "feat: add management dashboard, BRCGS readiness view, and batch traceability PDF export"
```

---

## 实施顺序与依赖

| Task | 内容 | 依赖 | 预计工时 |
|------|------|------|---------|
| 1 | Prisma Schema | — | 30 min |
| 2 | ShiftInstance 后端 | Task 1 | 45 min |
| 3 | ProductionRun 后端 | Task 1, 2 | 45 min |
| 4 | fieldsJson 升级 + 单据号 | Task 1 | 30 min |
| 5 | 263 张表单解析脚本 | Task 4 | 30 min |
| 6 | 前端班次看板 | Task 2, 3 | 60 min |
| 7 | 班次完成度看板 | Task 6 | 30 min |
| 8 | 文件生命周期 | — | 45 min |
| 9 | 定期任务引擎 | — | 30 min |
| 10 | 移动端 + 图片附件 | — | 30 min |
| 11 | CAPA 闭环 + 趋势 | — | 60 min |
| 12 | 管理仪表盘 + PDF | Task 11 | 60 min |

---

## 执行方式

**Plan complete and saved to `docs/plans/2026-04-22-form-system-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - 我逐 Task 派发新 subagent，每完成一个做 spec 合规 + 代码质量两轮审查，快速迭代

**2. Parallel Session (separate)** - 开新 session，加载本计划文件，使用 `superpowers:executing-plans` 逐步执行

选哪个？
