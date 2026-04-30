# Staging Area Mixing Product Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立“配料区正式投料入口 -> 配料执行记录 -> 包装/入库确认产品批次 -> 产品批次归集配料投入池 -> 追溯查询”的完整闭环，并统一业务术语为“产品批次”。系统不再把 `FinishedGoodsBatch` 作为独立核心批次模型。

**Architecture:** 后端以独立业务表承载配料区库存、配料执行、产品批次和归集关系；动态表单只作为记录表单入口，不承载核心追溯事实。`ProductionBatch` 承担“产品批次”，`BatchMixingAggregation` 承担产品批次与一次或多次配料执行的多对多归集。`BatchMaterialUsage` 保留为兼容旧接口，不作为新配料入口。

**Tech Stack:** NestJS + Prisma + PostgreSQL + Vue 3 + Element Plus + Vitest/Jest + npm workspaces.

---

## 0. Scope Guard

- 本计划覆盖配料区库存、班组/班次主数据、配料执行、产品批次确认、归集确认、追溯查询、`FinishedGoodsBatch` 剔除。
- 本计划不处理“提前生产未来日期导致两套生产数据”的方案，该主题已明确暂不讨论。
- 本计划保留现有 `ProductionBatch` 表名，因为当前项目已经大量使用它；业务显示统一叫“产品批次”。
- 本计划不把供应商证照、外检 PDF、证照有效期放入本模块，它们归供应商管理、检验模块或文控附件有效期机制。
- `FinishedGoodsBatch` 是迁移式剔除对象：必须先迁移追溯查询、记录关联、统计导出、前端查询入口和历史数据，再删除 schema；不允许直接粗暴删除 Prisma model 或数据库表。

---

## 1. Prisma Schema And Migration Foundation

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/migrations/20260430000000_staging_area_mixing_product_batch/migration.sql`

### Steps

- [ ] Add team and shift master data models after `WorkshopArea`.

```prisma
model Team {
  id          String              @id @default(cuid())
  code        String              @unique
  name        String
  active      Boolean             @default(true)
  members     TeamMember[]
  schedules   TeamShiftSchedule[]
  batches     ProductionBatch[]
  created_at  DateTime            @default(now())
  updated_at  DateTime            @updatedAt

  @@map("teams")
}

model TeamMember {
  id          String   @id @default(cuid())
  team_id     String
  employee_id String
  role        String?
  active      Boolean  @default(true)
  joined_at   DateTime @default(now())
  left_at     DateTime?
  team        Team     @relation(fields: [team_id], references: [id], onDelete: Cascade)

  @@unique([team_id, employee_id])
  @@map("team_members")
}

model ShiftType {
  id          String              @id @default(cuid())
  code        String              @unique
  name        String
  start_time  String
  end_time    String
  crosses_day Boolean             @default(false)
  active      Boolean             @default(true)
  schedules   TeamShiftSchedule[]
  batches     ProductionBatch[]
  records     StagingAreaStocktake[]
  created_at  DateTime            @default(now())
  updated_at  DateTime            @updatedAt

  @@map("shift_types")
}

model TeamShiftSchedule {
  id            String    @id @default(cuid())
  team_id       String
  shift_type_id String
  work_date     DateTime  @db.Date
  team          Team      @relation(fields: [team_id], references: [id])
  shift_type    ShiftType @relation(fields: [shift_type_id], references: [id])
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@unique([team_id, shift_type_id, work_date])
  @@index([work_date])
  @@map("team_shift_schedules")
}
```

- [ ] Replace string-only staging area stock identity with area-linked identity while keeping legacy `location` for one migration window.

```prisma
model StagingAreaStock {
  id          String          @id @default(cuid())
  batchId     String
  area_id     String?
  location    String?
  quantity    Float
  batch       MaterialBatch   @relation(fields: [batchId], references: [id])
  area        WorkshopArea?   @relation(fields: [area_id], references: [id])
  movements   StagingAreaRecord[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([batchId, area_id])
  @@index([area_id])
}
```

- [ ] Add stocktake model. This is separate from movement records because班前、班后、接班盘点是“库存事实确认”，not material movement.

```prisma
enum StagingStocktakeKind {
  shift_start
  shift_end
  handover
}

enum StagingStocktakeStatus {
  draft
  confirmed
  exception
  closed
}

model StagingAreaStocktake {
  id             String                 @id @default(cuid())
  area_id        String
  batchId        String
  kind           StagingStocktakeKind
  status         StagingStocktakeStatus @default(draft)
  book_quantity  Float
  actual_quantity Float
  difference     Float
  work_date      DateTime               @db.Date
  shift_type_id  String
  team_id        String?
  operatorId     String?
  confirmed_at   DateTime?
  note           String?
  area           WorkshopArea           @relation(fields: [area_id], references: [id])
  batch          MaterialBatch          @relation(fields: [batchId], references: [id])
  shift_type     ShiftType              @relation(fields: [shift_type_id], references: [id])
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  @@index([area_id, work_date, shift_type_id])
  @@index([batchId])
  @@map("staging_area_stocktakes")
}
```

- [ ] Add mixing execution and aggregation models.

```prisma
enum MixingExecutionStatus {
  draft
  confirmed
  voided
}

enum BatchMixingAggregationStatus {
  draft
  confirmed
}

model MixingExecution {
  id             String                 @id @default(cuid())
  executionNo    String                 @unique
  recipeId       String
  productId      String
  area_id        String
  work_date      DateTime               @db.Date
  shift_type_id  String?
  team_id        String?
  planned_weight Float?
  actual_weight  Float
  status         MixingExecutionStatus  @default(draft)
  operatorId     String?
  confirmedAt    DateTime?
  note           String?
  recipe         Recipe                 @relation(fields: [recipeId], references: [id])
  product        Product                @relation(fields: [productId], references: [id])
  area           WorkshopArea           @relation(fields: [area_id], references: [id])
  lines          MixingExecutionLine[]
  aggregations   BatchMixingAggregation[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt

  @@index([work_date, area_id])
  @@index([recipeId])
  @@map("mixing_executions")
}

model MixingExecutionLine {
  id                  String          @id @default(cuid())
  executionId         String
  recipeLineId        String
  materialId          String
  materialBatchId     String
  stagingAreaStockId  String
  plannedQuantity     Float?
  actualQuantity      Float
  fifoSuggested       Boolean         @default(true)
  manualOverride      Boolean         @default(false)
  overrideReason      String?
  execution           MixingExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  recipeLine          RecipeLine      @relation(fields: [recipeLineId], references: [id])
  material            Material        @relation(fields: [materialId], references: [id])
  materialBatch       MaterialBatch   @relation(fields: [materialBatchId], references: [id])
  stagingAreaStock    StagingAreaStock @relation(fields: [stagingAreaStockId], references: [id])
  createdAt           DateTime        @default(now())

  @@index([materialBatchId])
  @@index([recipeLineId])
  @@map("mixing_execution_lines")
}

model BatchMixingAggregation {
  id                String                       @id @default(cuid())
  productionBatchId String
  mixingExecutionId String
  status            BatchMixingAggregationStatus @default(draft)
  confirmedBy       String?
  confirmedAt       DateTime?
  note              String?
  productionBatch   ProductionBatch              @relation(fields: [productionBatchId], references: [id], onDelete: Cascade)
  mixingExecution   MixingExecution              @relation(fields: [mixingExecutionId], references: [id], onDelete: Cascade)
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt

  @@unique([productionBatchId, mixingExecutionId])
  @@index([mixingExecutionId])
  @@map("batch_mixing_aggregations")
}
```

- [ ] Extend `ProductionBatch` instead of introducing another finished-goods batch model.

```prisma
model ProductionBatch {
  id               String    @id @default(cuid())
  batchNumber      String    @unique
  productId        String
  productName      String
  recipeId         String?
  recipeName       String?
  plannedQuantity  Float?
  actualQuantity   Float?
  productionDate   DateTime
  packagedAt       DateTime?
  warehousedAt     DateTime?
  packageMachine   String?
  packagingLine    String?
  team_id          String?
  shift_type_id    String?
  leader_id        String?
  unit             String?
  status           BatchStatus @default(planned)
  team             Team?       @relation(fields: [team_id], references: [id])
  shift_type       ShiftType?  @relation(fields: [shift_type_id], references: [id])
  materialUsages   BatchMaterialUsage[]
  materialBalances MaterialBalance[]
  relatedRecords   Record[]
  aggregations     BatchMixingAggregation[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

- [ ] Run migration and generate client.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run prisma:generate -w server
npx prisma migrate dev --schema server/src/prisma/schema.prisma --name staging_area_mixing_product_batch
```

Expected:

```text
Generated Prisma Client
The following migration(s) have been created and applied
```

---

## 2. Team And Shift Master Data Backend

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/team-shift/team-shift.module.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/team-shift/team-shift.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/team-shift/team-shift.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/team-shift/dto/team-shift.dto.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/team-shift/team-shift.service.spec.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/app.module.ts`

### Steps

- [ ] Write the service spec first.

```ts
describe('TeamShiftService', () => {
  it('creates a shift type that can cross midnight', async () => {
    prisma.shiftType.create.mockResolvedValue({
      id: 'shift-night',
      code: 'night',
      name: '夜班',
      start_time: '20:00',
      end_time: '08:00',
      crosses_day: true,
      active: true,
      created_at: new Date('2026-04-30T00:00:00.000Z'),
      updated_at: new Date('2026-04-30T00:00:00.000Z'),
    });

    const result = await service.createShiftType({
      code: 'night',
      name: '夜班',
      startTime: '20:00',
      endTime: '08:00',
      crossesDay: true,
    });

    expect(result.code).toBe('night');
    expect(prisma.shiftType.create).toHaveBeenCalledWith({
      data: {
        code: 'night',
        name: '夜班',
        start_time: '20:00',
        end_time: '08:00',
        crosses_day: true,
      },
    });
  });

  it('prevents duplicate team schedule for the same team, shift and date', async () => {
    prisma.teamShiftSchedule.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createSchedule({
        teamId: 'team-a',
        shiftTypeId: 'shift-night',
        workDate: '2026-04-30',
      }),
    ).rejects.toThrow('该班组当天班次已排班');
  });
});
```

- [ ] Implement DTO validation.

```ts
export class CreateShiftTypeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsBoolean()
  crossesDay!: boolean;
}

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateTeamScheduleDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsNotEmpty()
  shiftTypeId!: string;

  @IsDateString()
  workDate!: string;
}
```

- [ ] Implement guarded controller.

```ts
@Controller('team-shifts')
@UseGuards(JwtAuthGuard)
export class TeamShiftController {
  constructor(private readonly service: TeamShiftService) {}

  @Get('teams')
  listTeams() {
    return this.service.listTeams();
  }

  @Post('teams')
  createTeam(@Body() dto: CreateTeamDto) {
    return this.service.createTeam(dto);
  }

  @Get('shift-types')
  listShiftTypes() {
    return this.service.listShiftTypes();
  }

  @Post('shift-types')
  createShiftType(@Body() dto: CreateShiftTypeDto) {
    return this.service.createShiftType(dto);
  }

  @Post('schedules')
  createSchedule(@Body() dto: CreateTeamScheduleDto) {
    return this.service.createSchedule(dto);
  }
}
```

- [ ] Register `TeamShiftModule` in `AppModule`.

```ts
import { TeamShiftModule } from './modules/team-shift/team-shift.module';

@Module({
  imports: [
    TeamShiftModule,
  ],
})
export class AppModule {}
```

- [ ] Run test.

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run test -w server -- team-shift.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/team-shift/team-shift.service.spec.ts
```

---

## 3. Staging Area Stock And Stocktake Backend

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/staging-area.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/staging-area.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/dto/staging-area.dto.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/warehouse/staging-area.service.spec.ts`

### Steps

- [ ] Replace hard-coded zone input with `areaId`, while accepting existing `location` only for read migration.

```ts
export class StageMaterialToAreaDto {
  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  operatorId?: string;
}

export class ConfirmStocktakeDto {
  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsString()
  @IsNotEmpty()
  batchId!: string;

  @IsEnum(StagingStocktakeKind)
  kind!: StagingStocktakeKind;

  @IsDateString()
  workDate!: string;

  @IsString()
  @IsNotEmpty()
  shiftTypeId!: string;

  @IsNumber()
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
```

- [ ] Add FIFO stock query by material and area.

```ts
async listAvailableStocks(params: { areaId: string; materialId: string }) {
  return this.prisma.stagingAreaStock.findMany({
    where: {
      area_id: params.areaId,
      quantity: { gt: 0 },
      batch: { materialId: params.materialId },
    },
    include: {
      batch: true,
      area: true,
    },
    orderBy: [
      { batch: { productionDate: 'asc' } },
      { createdAt: 'asc' },
    ],
  });
}
```

- [ ] Ensure staging to area updates `StagingAreaStock` by `(batchId, area_id)`.

```ts
async stageToArea(dto: StageMaterialToAreaDto) {
  const area = await this.prisma.workshopArea.findFirst({
    where: { id: dto.areaId, active: true },
  });
  if (!area) {
    throw new BadRequestException('配料区不存在或已停用');
  }

  return this.prisma.$transaction(async (tx) => {
    const stock = await tx.stagingAreaStock.upsert({
      where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
      create: {
        batchId: dto.batchId,
        area_id: dto.areaId,
        location: area.name,
        quantity: dto.quantity,
      },
      update: {
        quantity: { increment: dto.quantity },
        location: area.name,
      },
      include: { batch: true, area: true },
    });

    await tx.stagingAreaRecord.create({
      data: {
        batchId: dto.batchId,
        recordType: 'staging',
        quantity: dto.quantity,
        operatorId: dto.operatorId,
        shiftDate: new Date(),
      },
    });

    return stock;
  });
}
```

- [ ] Add stocktake confirmation logic. Difference is an exception signal, not a normal adjustment.

```ts
async confirmStocktake(dto: ConfirmStocktakeDto) {
  const stock = await this.prisma.stagingAreaStock.findUnique({
    where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
  });
  if (!stock) {
    throw new BadRequestException('配料区没有该原辅料批次库存');
  }

  const difference = dto.actualQuantity - stock.quantity;

  return this.prisma.stagingAreaStocktake.create({
    data: {
      area_id: dto.areaId,
      batchId: dto.batchId,
      kind: dto.kind,
      status: difference === 0 ? 'confirmed' : 'exception',
      book_quantity: stock.quantity,
      actual_quantity: dto.actualQuantity,
      difference,
      work_date: new Date(dto.workDate),
      shift_type_id: dto.shiftTypeId,
      team_id: dto.teamId,
      confirmed_at: new Date(),
      note: dto.note,
    },
  });
}
```

- [ ] Update controller endpoints.

```ts
@Get('stock')
listStock(@Query('areaId') areaId?: string, @Query('materialId') materialId?: string) {
  if (areaId && materialId) {
    return this.stagingAreaService.listAvailableStocks({ areaId, materialId });
  }
  return this.stagingAreaService.listStock({ areaId });
}

@Post('stage')
stageToArea(@Body() dto: StageMaterialToAreaDto) {
  return this.stagingAreaService.stageToArea(dto);
}

@Post('stocktakes')
confirmStocktake(@Body() dto: ConfirmStocktakeDto) {
  return this.stagingAreaService.confirmStocktake(dto);
}
```

- [ ] Update specs for FIFO ordering and stocktake exception.

```ts
it('returns FIFO stocks by material and area', async () => {
  await service.listAvailableStocks({ areaId: 'area-small', materialId: 'mat-sugar' });

  expect(prisma.stagingAreaStock.findMany).toHaveBeenCalledWith({
    where: {
      area_id: 'area-small',
      quantity: { gt: 0 },
      batch: { materialId: 'mat-sugar' },
    },
    include: { batch: true, area: true },
    orderBy: [{ batch: { productionDate: 'asc' } }, { createdAt: 'asc' }],
  });
});

it('marks stocktake as exception when actual quantity differs from book quantity', async () => {
  prisma.stagingAreaStock.findUnique.mockResolvedValue({ quantity: 100 });
  prisma.stagingAreaStocktake.create.mockResolvedValue({ status: 'exception', difference: -2 });

  const result = await service.confirmStocktake({
    areaId: 'area-small',
    batchId: 'mb-1',
    kind: 'shift_end',
    workDate: '2026-04-30',
    shiftTypeId: 'shift-night',
    actualQuantity: 98,
  });

  expect(result.status).toBe('exception');
});
```

- [ ] Run test.

```bash
npm run test -w server -- staging-area.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/warehouse/staging-area.service.spec.ts
```

---

## 4. Mixing Execution Backend

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/mixing/mixing.module.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/mixing/mixing.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/mixing/mixing.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/mixing/dto/mixing.dto.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/mixing/mixing.service.spec.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/app.module.ts`

### Steps

- [ ] Create DTOs for FIFO recommendation and execution confirmation.

```ts
export class RecommendMaterialBatchDto {
  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsNumber()
  @Min(0.000001)
  requiredQuantity!: number;
}

export class MixingLineInputDto {
  @IsString()
  @IsNotEmpty()
  recipeLineId!: string;

  @IsString()
  @IsNotEmpty()
  materialBatchId!: string;

  @IsNumber()
  @Min(0.000001)
  actualQuantity!: number;

  @IsBoolean()
  manualOverride!: boolean;

  @ValidateIf((value) => value.manualOverride === true)
  @IsString()
  @IsNotEmpty()
  overrideReason?: string;
}

export class CreateMixingExecutionDto {
  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  areaId!: string;

  @IsDateString()
  workDate!: string;

  @IsNumber()
  @Min(0.000001)
  actualWeight!: number;

  @ValidateNested({ each: true })
  @Type(() => MixingLineInputDto)
  lines!: MixingLineInputDto[];
}
```

- [ ] Implement FIFO recommendation from `StagingAreaStock`.

```ts
async recommendMaterialBatches(dto: RecommendMaterialBatchDto) {
  const stocks = await this.prisma.stagingAreaStock.findMany({
    where: {
      area_id: dto.areaId,
      quantity: { gt: 0 },
      batch: { materialId: dto.materialId },
    },
    include: { batch: true },
    orderBy: [{ batch: { productionDate: 'asc' } }, { createdAt: 'asc' }],
  });

  let remaining = dto.requiredQuantity;
  const recommendations = [];

  for (const stock of stocks) {
    if (remaining <= 0) {
      break;
    }
    const quantity = Math.min(stock.quantity, remaining);
    recommendations.push({
      stagingAreaStockId: stock.id,
      materialBatchId: stock.batchId,
      quantity,
      availableQuantity: stock.quantity,
    });
    remaining -= quantity;
  }

  return {
    recommendations,
    shortage: remaining,
  };
}
```

- [ ] Implement create execution with stock deduction in one transaction.

```ts
async createExecution(dto: CreateMixingExecutionDto) {
  const recipeLines = await this.prisma.recipeLine.findMany({
    where: { recipe_id: dto.recipeId },
  });
  const recipeLineById = new Map(recipeLines.map((line) => [line.id, line]));

  return this.prisma.$transaction(async (tx) => {
    const execution = await tx.mixingExecution.create({
      data: {
        executionNo: await this.generateExecutionNo(tx),
        recipeId: dto.recipeId,
        productId: dto.productId,
        area_id: dto.areaId,
        work_date: new Date(dto.workDate),
        actual_weight: dto.actualWeight,
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    for (const input of dto.lines) {
      const recipeLine = recipeLineById.get(input.recipeLineId);
      if (!recipeLine) {
        throw new BadRequestException('配方明细不存在');
      }

      const stock = await tx.stagingAreaStock.findFirst({
        where: {
          area_id: dto.areaId,
          batchId: input.materialBatchId,
          quantity: { gte: input.actualQuantity },
        },
        include: { batch: true },
      });
      if (!stock) {
        throw new BadRequestException('配料区库存不足');
      }
      if (stock.batch.materialId !== recipeLine.material_id) {
        throw new BadRequestException('原辅料批次与配方物料不一致');
      }

      await tx.stagingAreaStock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: input.actualQuantity } },
      });

      await tx.mixingExecutionLine.create({
        data: {
          executionId: execution.id,
          recipeLineId: input.recipeLineId,
          materialId: recipeLine.material_id,
          materialBatchId: input.materialBatchId,
          stagingAreaStockId: stock.id,
          plannedQuantity: recipeLine.quantity,
          actualQuantity: input.actualQuantity,
          fifoSuggested: input.manualOverride === false,
          manualOverride: input.manualOverride,
          overrideReason: input.overrideReason,
        },
      });
    }

    return tx.mixingExecution.findUnique({
      where: { id: execution.id },
      include: { lines: true },
    });
  });
}
```

- [ ] Guard controller with `JwtAuthGuard`.

```ts
@Controller('mixing')
@UseGuards(JwtAuthGuard)
export class MixingController {
  constructor(private readonly service: MixingService) {}

  @Post('recommend-material-batches')
  recommend(@Body() dto: RecommendMaterialBatchDto) {
    return this.service.recommendMaterialBatches(dto);
  }

  @Post('executions')
  createExecution(@Body() dto: CreateMixingExecutionDto) {
    return this.service.createExecution(dto);
  }
}
```

- [ ] Add tests for FIFO, manual override reason, and insufficient stock.

```ts
it('deducts stock and records material batch usage when creating execution', async () => {
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  prisma.recipeLine.findMany.mockResolvedValue([
    { id: 'line-flour', material_id: 'mat-flour', quantity: 50 },
  ]);
  prisma.stagingAreaStock.findFirst.mockResolvedValue({
    id: 'stock-1',
    batchId: 'mb-old',
    quantity: 80,
    batch: { materialId: 'mat-flour' },
  });
  prisma.mixingExecution.create.mockResolvedValue({ id: 'mix-1' });
  prisma.mixingExecution.findUnique.mockResolvedValue({ id: 'mix-1', lines: [] });

  await service.createExecution({
    recipeId: 'recipe-1',
    productId: 'product-1',
    areaId: 'area-small',
    workDate: '2026-04-30',
    actualWeight: 50,
    lines: [
      {
        recipeLineId: 'line-flour',
        materialBatchId: 'mb-old',
        actualQuantity: 50,
        manualOverride: false,
      },
    ],
  });

  expect(prisma.stagingAreaStock.update).toHaveBeenCalledWith({
    where: { id: 'stock-1' },
    data: { quantity: { decrement: 50 } },
  });
});
```

- [ ] Run test.

```bash
npm run test -w server -- mixing.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/mixing/mixing.service.spec.ts
```

---

## 5. Product Batch Packaging Confirmation Backend

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/dto/production-batch.dto.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/services/production-batch.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/controllers/production-batch.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/services/production-batch.service.spec.ts`

### Steps

- [ ] Add explicit product batch confirmation DTO. The user enters packaging-machine batch number; system stores product/team/shift context.

```ts
export class ConfirmProductBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @IsNumber()
  @Min(0.000001)
  actualQuantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsDateString()
  productionDate!: string;

  @IsDateString()
  packagedAt!: string;

  @IsDateString()
  warehousedAt!: string;

  @IsString()
  @IsNotEmpty()
  packageMachine!: string;

  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsNotEmpty()
  shiftTypeId!: string;
}
```

- [ ] Implement confirmation service with duplicate batch number protection.

```ts
async confirmProductBatch(dto: ConfirmProductBatchDto) {
  const existing = await this.prisma.productionBatch.findUnique({
    where: { batchNumber: dto.batchNumber },
  });
  if (existing) {
    throw new ConflictException('产品批次号已存在');
  }

  const product = await this.prisma.product.findUnique({
    where: { id: dto.productId },
  });
  if (!product) {
    throw new BadRequestException('产品不存在');
  }

  const recipe = await this.prisma.recipe.findFirst({
    where: { id: dto.recipeId, product_id: dto.productId, status: 'active' },
  });
  if (!recipe) {
    throw new BadRequestException('产品配方不存在或未启用');
  }

  return this.prisma.productionBatch.create({
    data: {
      batchNumber: dto.batchNumber,
      productId: dto.productId,
      productName: product.name,
      recipeId: dto.recipeId,
      recipeName: recipe.name,
      actualQuantity: dto.actualQuantity,
      unit: dto.unit,
      productionDate: new Date(dto.productionDate),
      packagedAt: new Date(dto.packagedAt),
      warehousedAt: new Date(dto.warehousedAt),
      packageMachine: dto.packageMachine,
      team_id: dto.teamId,
      shift_type_id: dto.shiftTypeId,
      status: 'completed',
    },
  });
}
```

- [ ] Add endpoint.

```ts
@Post('confirm')
confirmProductBatch(@Body() dto: ConfirmProductBatchDto) {
  return this.productionBatchService.confirmProductBatch(dto);
}
```

- [ ] Update `findOne` include from finished goods to aggregations.

```ts
return this.prisma.productionBatch.findUnique({
  where: { id },
  include: {
    materialUsages: true,
    materialBalances: true,
    relatedRecords: true,
    aggregations: {
      include: {
        mixingExecution: {
          include: {
            lines: {
              include: {
                materialBatch: true,
                material: true,
              },
            },
          },
        },
      },
    },
  },
});
```

- [ ] Add tests.

```ts
it('confirms product batch with packaging context', async () => {
  prisma.productionBatch.findUnique.mockResolvedValue(null);
  prisma.product.findUnique.mockResolvedValue({ id: 'product-1', name: '香蕉蒸蛋糕' });
  prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1', name: '标准配方' });
  prisma.productionBatch.create.mockResolvedValue({ id: 'pb-1', batchNumber: '20260430' });

  const result = await service.confirmProductBatch({
    batchNumber: '20260430',
    productId: 'product-1',
    recipeId: 'recipe-1',
    actualQuantity: 120,
    unit: '箱',
    productionDate: '2026-04-30',
    packagedAt: '2026-04-30T23:40:00+08:00',
    warehousedAt: '2026-04-30T23:55:00+08:00',
    packageMachine: '1号包装机',
    teamId: 'team-a',
    shiftTypeId: 'shift-night',
  });

  expect(result.batchNumber).toBe('20260430');
});
```

- [ ] Run test.

```bash
npm run test -w server -- production-batch.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/batch-trace/services/production-batch.service.spec.ts
```

---

## 6. Batch Mixing Aggregation Backend

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/dto/batch-mixing-aggregation.dto.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/services/batch-mixing-aggregation.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/controllers/batch-mixing-aggregation.controller.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/services/batch-mixing-aggregation.service.spec.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/batch-trace.module.ts`

### Steps

- [ ] Add DTOs.

```ts
export class CreateBatchMixingAggregationDto {
  @IsString()
  @IsNotEmpty()
  productionBatchId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  mixingExecutionIds!: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmBatchMixingAggregationDto {
  @IsString()
  @IsNotEmpty()
  productionBatchId!: string;

  @IsString()
  @IsNotEmpty()
  confirmedBy!: string;
}
```

- [ ] Implement creation with product/recipe consistency check.

```ts
async create(dto: CreateBatchMixingAggregationDto) {
  const batch = await this.prisma.productionBatch.findUnique({
    where: { id: dto.productionBatchId },
  });
  if (!batch) {
    throw new BadRequestException('产品批次不存在');
  }

  const executions = await this.prisma.mixingExecution.findMany({
    where: { id: { in: dto.mixingExecutionIds }, status: 'confirmed' },
  });
  if (executions.length !== dto.mixingExecutionIds.length) {
    throw new BadRequestException('存在未确认或不存在的配料执行');
  }

  const mismatch = executions.find(
    (execution) => execution.productId !== batch.productId || execution.recipeId !== batch.recipeId,
  );
  if (mismatch) {
    throw new BadRequestException('配料执行与产品批次的产品或配方不一致');
  }

  return this.prisma.$transaction(
    dto.mixingExecutionIds.map((mixingExecutionId) =>
      this.prisma.batchMixingAggregation.upsert({
        where: {
          productionBatchId_mixingExecutionId: {
            productionBatchId: dto.productionBatchId,
            mixingExecutionId,
          },
        },
        create: {
          productionBatchId: dto.productionBatchId,
          mixingExecutionId,
          status: 'draft',
          note: dto.note,
        },
        update: {
          note: dto.note,
        },
      }),
    ),
  );
}
```

- [ ] Implement confirmation as production-side归集确认.

```ts
async confirm(dto: ConfirmBatchMixingAggregationDto) {
  const result = await this.prisma.batchMixingAggregation.updateMany({
    where: { productionBatchId: dto.productionBatchId },
    data: {
      status: 'confirmed',
      confirmedBy: dto.confirmedBy,
      confirmedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new BadRequestException('产品批次尚未归集配料执行');
  }

  return this.findByProductBatch(dto.productionBatchId);
}
```

- [ ] Add guarded controller and register service/controller in `BatchTraceModule`.

```ts
@Controller('batch-trace/batch-mixing-aggregations')
@UseGuards(JwtAuthGuard)
export class BatchMixingAggregationController {
  constructor(private readonly service: BatchMixingAggregationService) {}

  @Post()
  create(@Body() dto: CreateBatchMixingAggregationDto) {
    return this.service.create(dto);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmBatchMixingAggregationDto) {
    return this.service.confirm(dto);
  }

  @Get('by-product-batch/:productionBatchId')
  findByProductBatch(@Param('productionBatchId') productionBatchId: string) {
    return this.service.findByProductBatch(productionBatchId);
  }
}
```

- [ ] Add tests for cross-midnight scenario: same shift can confirm two product batches using different aggregation rows.

```ts
it('allows one night shift to aggregate different executions into two product batches', async () => {
  prisma.productionBatch.findUnique.mockResolvedValue({
    id: 'pb-20260430',
    productId: 'product-1',
    recipeId: 'recipe-1',
  });
  prisma.mixingExecution.findMany.mockResolvedValue([
    { id: 'mix-2330', productId: 'product-1', recipeId: 'recipe-1', status: 'confirmed' },
  ]);
  prisma.$transaction.mockResolvedValue([{ id: 'agg-1' }]);

  const result = await service.create({
    productionBatchId: 'pb-20260430',
    mixingExecutionIds: ['mix-2330'],
  });

  expect(result).toHaveLength(1);
});
```

- [ ] Run test.

```bash
npm run test -w server -- batch-mixing-aggregation.service.spec.ts --runInBand
```

Expected:

```text
PASS src/modules/batch-trace/services/batch-mixing-aggregation.service.spec.ts
```

---

## 7. Traceability Migration Away From FinishedGoodsBatch

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/batch-trace/services/traceability.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/trace/trace.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability-query/traceability-query.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/traceability-query/traceability-contract.mapper.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/statistics/traceability-export.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/modules/record/record.service.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/components/ObjectTraceQueryPanel.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/traceability/TraceLedgerView.vue`

### Steps

- [ ] Replace “finished goods batch” query option with “product batch”.

```ts
export type TraceObjectType =
  | 'materialBatch'
  | 'productionBatch'
  | 'product'
  | 'supplier'
  | 'customer';
```

- [ ] Update trace query mapper to load product batch aggregation graph.

```ts
const productionBatch = await this.prisma.productionBatch.findUnique({
  where: { id: objectId },
  include: {
    product: true,
    aggregations: {
      include: {
        mixingExecution: {
          include: {
            area: true,
            lines: {
              include: {
                material: true,
                materialBatch: true,
              },
            },
          },
        },
      },
    },
  },
});
```

- [ ] Update record association so `finished_goods` input maps to product batch for compatibility during rollout.

```ts
if (batchType === 'finished_goods' || batchType === 'production') {
  const productionBatch = await this.prisma.productionBatch.findUnique({
    where: { batchNumber },
  });
  if (!productionBatch) {
    throw new NotFoundException('产品批次不存在');
  }
  return this.prisma.record.update({
    where: { id: recordId },
    data: { productionBatchId: productionBatch.id },
  });
}
```

- [ ] Update frontend labels.

```ts
const objectTypeOptions = [
  { label: '原辅料批次', value: 'materialBatch' },
  { label: '产品批次', value: 'productionBatch' },
  { label: '产品', value: 'product' },
  { label: '供应商', value: 'supplier' },
  { label: '客户', value: 'customer' },
];
```

- [ ] Add regression test that product batch trace returns material batches through aggregation.

```ts
it('traces product batch to material batches through mixing aggregations', async () => {
  prisma.productionBatch.findUnique.mockResolvedValue({
    id: 'pb-1',
    batchNumber: '20260430',
    aggregations: [
      {
        mixingExecution: {
          lines: [
            {
              material: { name: '面粉' },
              materialBatch: { batchNumber: 'MF20260401' },
            },
          ],
        },
      },
    ],
  });

  const result = await service.traceProductionBatch('pb-1');

  expect(result.nodes.some((node) => node.label.includes('MF20260401'))).toBe(true);
});
```

- [ ] Run targeted tests.

```bash
npm run test -w server -- traceability --runInBand
npm run test -w server -- record.service.spec.ts --runInBand
```

Expected:

```text
PASS
```

---

## 8. Frontend Workflows

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/team-shift.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/mixing.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/warehouse.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/api/batch.ts`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/warehouse/StagingArea.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/mixing/MixingWorkbench.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/BatchList.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/views/batch-trace/BatchDetail.vue`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/client/src/router/index.ts`

### Steps

- [ ] Fix warehouse API to match backend endpoints.

```ts
export const stagingAreaApi = {
  getStock(params?: { areaId?: string; materialId?: string }) {
    return request.get('/warehouse/staging-area/stock', { params });
  },

  stageToArea(data: { batchId: string; areaId: string; quantity: number; operatorId?: string }) {
    return request.post('/warehouse/staging-area/stage', data);
  },

  confirmStocktake(data: {
    areaId: string;
    batchId: string;
    kind: 'shift_start' | 'shift_end' | 'handover';
    workDate: string;
    shiftTypeId: string;
    actualQuantity: number;
    teamId?: string;
    note?: string;
  }) {
    return request.post('/warehouse/staging-area/stocktakes', data);
  },
};
```

- [ ] Add mixing API.

```ts
export const mixingApi = {
  recommendMaterialBatches(data: {
    areaId: string;
    materialId: string;
    requiredQuantity: number;
  }) {
    return request.post('/mixing/recommend-material-batches', data);
  },

  createExecution(data: CreateMixingExecutionPayload) {
    return request.post('/mixing/executions', data);
  },
};
```

- [ ] Add batch aggregation API.

```ts
export const batchMixingAggregationApi = {
  create(data: { productionBatchId: string; mixingExecutionIds: string[]; note?: string }) {
    return request.post('/batch-trace/batch-mixing-aggregations', data);
  },

  confirm(data: { productionBatchId: string; confirmedBy: string }) {
    return request.post('/batch-trace/batch-mixing-aggregations/confirm', data);
  },
};
```

- [ ] Replace hand-filled material batch ID in the mixing UI with FIFO recommendation plus manual override.

```vue
<el-select v-model="line.materialBatchId" filterable placeholder="选择原辅料批次">
  <el-option
    v-for="stock in line.recommendedStocks"
    :key="stock.materialBatchId"
    :label="`${stock.batchNumber} / 剩余 ${stock.availableQuantity}`"
    :value="stock.materialBatchId"
  />
</el-select>

<el-checkbox v-model="line.manualOverride">人工改选批次</el-checkbox>
<el-input
  v-if="line.manualOverride"
  v-model="line.overrideReason"
  placeholder="填写人工改选原因"
/>
```

- [ ] Redesign `StagingArea.vue` into a 配料区库存与盘点工作台 with three tabs:
  - `库存` shows area/material/batch/quantity.
  - `班前盘点` submits `kind=shift_start`.
  - `班后/交班盘点` submits `kind=shift_end` or `kind=handover`.

```vue
<el-tabs v-model="activeTab">
  <el-tab-pane label="库存" name="stock" />
  <el-tab-pane label="班前盘点" name="start" />
  <el-tab-pane label="班后/交班盘点" name="handover" />
</el-tabs>
```

- [ ] Add `MixingWorkbench.vue` as the formal mixing entry. It must require product, active recipe, workshop area, work date, and recipe lines before submission.

```ts
const submitExecution = async () => {
  if (!form.recipeId || !form.productId || !form.areaId) {
    ElMessage.error('请选择产品、配方和配料区');
    return;
  }
  if (form.lines.some((line) => !line.materialBatchId || line.actualQuantity <= 0)) {
    ElMessage.error('请完成每一项原辅料批次和实际用量');
    return;
  }
  if (form.lines.some((line) => line.manualOverride && !line.overrideReason)) {
    ElMessage.error('人工改选批次必须填写原因');
    return;
  }
  await mixingApi.createExecution(form);
};
```

- [ ] Modify product batch creation UI to confirm actual packaging/inbound facts instead of only planned batch facts.

```ts
const confirmProductBatch = async () => {
  if (!form.batchNumber || !form.productId || !form.recipeId || !form.teamId || !form.shiftTypeId) {
    ElMessage.error('请填写产品批次号、产品、配方、班组和班次');
    return;
  }
  await productionBatchApi.confirm(form);
};
```

- [ ] Add aggregation panel in `BatchDetail.vue`: list candidate mixing executions by product/recipe/work date and allow linking multiple executions to one product batch.

```vue
<el-table :data="candidateMixingExecutions" row-key="id" @selection-change="selectedExecutions = $event">
  <el-table-column type="selection" width="48" />
  <el-table-column prop="executionNo" label="配料执行号" />
  <el-table-column prop="area.name" label="配料区" />
  <el-table-column prop="actual_weight" label="实际配料重量" />
  <el-table-column prop="work_date" label="配料日期" />
</el-table>
```

- [ ] Register route and menu entry for `MixingWorkbench.vue`.

```ts
{
  path: '/mixing/workbench',
  name: 'MixingWorkbench',
  component: () => import('@/views/mixing/MixingWorkbench.vue'),
  meta: { title: '配料执行' },
}
```

- [ ] Run client tests and build.

```bash
npm run test -w client -- --run
npm run build -w client
```

Expected:

```text
✓
built in
```

---

## 9. Remove FinishedGoodsBatch As A Core Model

This section is a migration refactor, not a direct schema deletion. Implement Task 7 first, run the targeted tests, migrate existing data, and only then remove `FinishedGoodsBatch` from Prisma.

### Files

- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/schema.prisma`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/server/src/prisma/migrations/20260430001000_remove_finished_goods_batch/migration.sql`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`
- `/Users/jiashenglin/Desktop/好玩的项目/noidear/CONTEXT.md`

### Steps

- [ ] Before schema removal, add a data migration that maps existing finished-goods rows to product batch facts.

```sql
UPDATE records r
SET production_batch_id = fgb.production_batch_id
FROM finished_goods_batches fgb
WHERE r.finished_goods_batch_id = fgb.id
  AND r.production_batch_id IS NULL;
```

- [ ] Remove `FinishedGoodsBatch` model and relation fields from Prisma after all TypeScript references are migrated.

```prisma
model ProductionBatch {
  id               String    @id @default(cuid())
  batchNumber      String    @unique
  productId        String
  productName      String
  recipeId         String?
  recipeName       String?
  plannedQuantity  Float?
  actualQuantity   Float?
  productionDate   DateTime
  packagedAt       DateTime?
  warehousedAt     DateTime?
  packageMachine   String?
  packagingLine    String?
  team_id          String?
  shift_type_id    String?
  leader_id        String?
  unit             String?
  status           BatchStatus @default(planned)
  materialUsages   BatchMaterialUsage[]
  materialBalances MaterialBalance[]
  relatedRecords   Record[]
  aggregations     BatchMixingAggregation[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

- [ ] Update `MASTER_DATA_AND_TRACEABILITY_MODEL.md` to show the new chain.

```md
Product -> Recipe -> RecipeLine -> Material
WorkshopArea -> StagingAreaStock -> MixingExecution -> MixingExecutionLine -> MaterialBatch
ProductionBatch -> BatchMixingAggregation -> MixingExecution
```

- [ ] Update `CONTEXT.md` so `FinishedGoodsBatch` is documented as removed rather than ambiguous.

```md
## Removed Term

- `FinishedGoodsBatch`: removed as a core business batch. Use `ProductionBatch` for 产品批次.
```

- [ ] Run generated Prisma and full TypeScript verification.

```bash
npm run prisma:generate -w server
npm run build:server
npm run build:client
```

Expected:

```text
Generated Prisma Client
Found 0 errors
built in
```

---

## 10. End-To-End Verification

### Backend Commands

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run test -w server -- staging-area.service.spec.ts --runInBand
npm run test -w server -- mixing.service.spec.ts --runInBand
npm run test -w server -- production-batch.service.spec.ts --runInBand
npm run test -w server -- batch-mixing-aggregation.service.spec.ts --runInBand
npm run build:server
```

Expected:

```text
PASS
Found 0 errors
```

### Frontend Commands

```bash
npm run test -w client -- --run
npm run build:client
```

Expected:

```text
✓
built in
```

### Manual Smoke Flow

- [ ] Create or verify `日班` and `夜班` shift types.
- [ ] Create or verify one班组, then schedule it to night shift.
- [ ] Move an existing material batch into a workshop area.
- [ ] Confirm shift-start stocktake with zero difference.
- [ ] Create a mixing execution from recipe lines and FIFO-selected material batches.
- [ ] Confirm a product batch from packaging/inbound facts:
  - 产品: 香蕉蒸蛋糕
  - 产品批次号: `20260430`
  - 班次: 夜班
  - 包装机: 1号包装机
  - 入库数量: actual quantity and unit
- [ ] Aggregate the mixing execution to the product batch.
- [ ] Query product batch trace and verify it shows:
  - 产品批次
  - 班组/班次/包装机/入库时间
  - 配料执行
  - 配料区
  - 原辅料批次
- [ ] Confirm shift-end stocktake. If actual quantity differs from book quantity, the stocktake status must be `exception`.

---

## 11. Git Discipline

- [ ] Keep unrelated dirty files out of this work.
- [ ] Commit schema/backend changes separately from frontend changes if implementation spans multiple days.
- [ ] Commit docs updates with the schema change that makes the terminology true.
- [ ] Do not force push.
- [ ] Before PR creation, run:

```bash
git status --short
git diff --stat origin/master...HEAD
npm run build:server
npm run build:client
```

Expected:

```text
Only intended files changed
Found 0 errors
built in
```

---

## 12. Self-Review Checklist

- [ ] No new business concept named “成品批次” remains in UI, API payloads, docs, or trace labels.
- [ ] `ProductionBatch.batchNumber` is treated as 产品批次号.
- [ ] Night shift crossing midnight is represented as one shift/team producing two product batches, not as a second batch model.
- [ ] 配料区库存 uses real `WorkshopArea` identity, not hard-coded zone strings.
- [ ] FIFO is the default material batch recommendation.
- [ ] Manual material batch override requires a reason.
- [ ] 班前、班后、交班盘点 differences are exceptions, not routine adjustments.
- [ ] Product batch trace reaches original material batches through `BatchMixingAggregation -> MixingExecutionLine -> MaterialBatch`.
- [ ] `FinishedGoodsBatch` is removed from the core chain and compatibility references are migrated.
