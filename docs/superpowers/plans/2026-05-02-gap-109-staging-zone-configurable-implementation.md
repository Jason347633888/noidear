# GAP-109 Staging Zone Configurable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution must happen in an 独立 worktree or Multica 隔离工作目录, never in the main checkout.

**Goal:** Replace hard-coded staging zone validation with `WorkshopArea`-backed runtime configuration.

**Architecture:** Keep the existing warehouse staging endpoints, but route all zone validation through active `WorkshopArea` records. New and updated `StagingAreaStock` rows store `area_id` as the relationship and keep `location` only as the `WorkshopArea.name` display snapshot.

**Tech Stack:** NestJS, Prisma, Jest.

---

## Superpower 与 grill-me 校准记录

- 已使用 `brainstorming` 形成轻量 spec：`docs/superpowers/specs/2026-05-02-gap-109-staging-zone-configurable-design.md`。
- 已使用 `grill-with-docs` 对齐 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md` 与 `docs/module-usage/05-warehouse-inventory.md`：区域必须复用 `WorkshopArea`，不能继续在仓储服务维护硬编码 zone 事实源。
- issue 标题/描述将 GAP-109 写成 FIFO 推荐，但项目分诊和 manifest 中 GAP-109 是配料区 zone 配置化；FIFO 推荐属于 GAP-110。本 plan 按项目文档的 GAP-109 执行。
- 执行 agent 只允许使用 `superpowers:executing-plans`，不得使用 `brainstorming`、`writing-plans` 或直接扩 scope。
- 执行前必须运行 `git worktree list --porcelain && pwd && git branch --show-current && git status --short --branch`。如果 `pwd` 是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须停止并回报。
- 停止条件：如果执行时发现当前代码已经删除 `stageToZone/transferZone`，或 `WorkshopArea` schema/API 与本文档不一致，必须停止并回报，不得自行改 schema 或迁移。

## Files

- Modify: `server/src/modules/warehouse/staging-area.service.ts`
- Modify: `server/src/modules/warehouse/staging-area.service.spec.ts`
- Optional Modify: `client/src/api/warehouse.ts`
- Optional Modify: `client/src/views/warehouse/StagingArea.vue`

## Task 1: Add failing tests for WorkshopArea-backed staging zones

- [ ] **Step 1: Extend Prisma mock**

In `server/src/modules/warehouse/staging-area.service.spec.ts`, add `workshopArea.findFirst` to the Prisma mock in the first `beforeEach`:

```ts
workshopArea: {
  findFirst: jest.fn(),
},
```

- [ ] **Step 2: Add stageToZone tests**

Append these tests inside the first `describe('StagingAreaService', () => { ... })` block:

```ts
describe('stageToZone', () => {
  it('uses active WorkshopArea as the zone source and writes area_id', async () => {
    const area = { id: 'area-small', name: '小料房', status: 'active' };
    const batch = { id: 'batch-1', material: { id: 'mat-1', name: '白糖' } };
    const created = { id: 'stock-1', batchId: 'batch-1', area_id: 'area-small', location: '小料房', quantity: 10 };

    jest.spyOn((prisma as any).workshopArea, 'findFirst').mockResolvedValue(area);
    jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(batch as any);
    jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(null);
    jest.spyOn(prisma.stagingAreaStock, 'create').mockResolvedValue(created as any);

    const result = await service.stageToZone({
      batchId: 'batch-1',
      quantity: 10,
      areaId: 'area-small',
      operatorId: 'user-1',
    });

    expect(result).toEqual(created);
    expect((prisma as any).workshopArea.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-small', status: 'active', deleted_at: null },
    });
    expect(prisma.stagingAreaStock.create).toHaveBeenCalledWith({
      data: {
        batchId: 'batch-1',
        quantity: 10,
        area_id: 'area-small',
        location: '小料房',
      },
      include: { batch: { include: { material: true } }, area: true },
    });
  });

  it('keeps legacy zone name compatibility through active WorkshopArea lookup', async () => {
    const area = { id: 'area-oil', name: '称油间', status: 'active' };
    const batch = { id: 'batch-1', material: { id: 'mat-1' } };
    const existing = { id: 'stock-1', batchId: 'batch-1', area_id: 'area-oil', quantity: 4 };

    jest.spyOn((prisma as any).workshopArea, 'findFirst').mockResolvedValue(area);
    jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(batch as any);
    jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(existing as any);
    jest.spyOn(prisma.stagingAreaStock, 'update').mockResolvedValue({ ...existing, quantity: 7, location: '称油间' } as any);

    await service.stageToZone({
      batchId: 'batch-1',
      quantity: 3,
      zone: '称油间',
      operatorId: 'user-1',
    });

    expect((prisma as any).workshopArea.findFirst).toHaveBeenCalledWith({
      where: { name: '称油间', status: 'active', deleted_at: null },
    });
    expect(prisma.stagingAreaStock.findFirst).toHaveBeenCalledWith({
      where: { batchId: 'batch-1', area_id: 'area-oil' },
    });
  });

  it('rejects missing or inactive WorkshopArea', async () => {
    jest.spyOn((prisma as any).workshopArea, 'findFirst').mockResolvedValue(null);

    await expect(service.stageToZone({
      batchId: 'batch-1',
      quantity: 1,
      areaId: 'inactive-area',
      operatorId: 'user-1',
    })).rejects.toThrow(BadRequestException);

    expect(prisma.stagingAreaStock.create).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run targeted test and confirm failure**

```bash
npm run test --workspace server -- staging-area.service.spec.ts --runInBand
```

Expected: FAIL because `stageToZone` still requires the hard-coded `WORKSHOP_ZONES` list and does not query `workshopArea`.

## Task 2: Replace hard-coded zone validation in StagingAreaService

- [ ] **Step 1: Remove hard-coded zone export**

In `server/src/modules/warehouse/staging-area.service.ts`, delete:

```ts
export const WORKSHOP_ZONES = ['筛粉间', '称油间', '小料房'] as const;
export type WorkshopZone = typeof WORKSHOP_ZONES[number];
```

- [ ] **Step 2: Add area resolver helper**

Inside `StagingAreaService`, below the constructor, add:

```ts
  private async resolveActiveArea(input: { areaId?: string; zone?: string }) {
    if (!input.areaId && !input.zone) {
      throw new BadRequestException('配料区不能为空');
    }

    const area = await this.prisma.workshopArea.findFirst({
      where: input.areaId
        ? { id: input.areaId, status: 'active', deleted_at: null }
        : { name: input.zone, status: 'active', deleted_at: null },
    });

    if (!area) {
      throw new BadRequestException('配料区不存在或已停用');
    }

    return area;
  }
```

- [ ] **Step 3: Update stageToZone signature and implementation**

Replace the full `stageToZone` method with:

```ts
  async stageToZone(dto: {
    batchId: string;
    quantity: number;
    areaId?: string;
    zone?: string;
    operatorId: string;
    note?: string;
  }) {
    const area = await this.resolveActiveArea({ areaId: dto.areaId, zone: dto.zone });

    const batch = await this.prisma.materialBatch.findUnique({
      where: { id: dto.batchId },
      include: { material: true },
    });
    if (!batch) throw new NotFoundException('批次不存在');
    if (dto.quantity <= 0) throw new BadRequestException('数量必须大于 0');

    const existing = await this.prisma.stagingAreaStock.findFirst({
      where: { batchId: dto.batchId, area_id: area.id },
    });

    if (existing) {
      return this.prisma.stagingAreaStock.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + dto.quantity,
          area_id: area.id,
          location: area.name,
        },
        include: { batch: { include: { material: true } }, area: true },
      });
    }

    return this.prisma.stagingAreaStock.create({
      data: {
        batchId: dto.batchId,
        quantity: dto.quantity,
        area_id: area.id,
        location: area.name,
      },
      include: { batch: { include: { material: true } }, area: true },
    });
  }
```

- [ ] **Step 4: Run targeted test**

```bash
npm run test --workspace server -- staging-area.service.spec.ts --runInBand
```

Expected: PASS for the new `stageToZone` tests. Existing unrelated tests in the same file must remain PASS.

## Task 3: Convert transferZone to WorkshopArea lookup

- [ ] **Step 1: Add transferZone test**

In `server/src/modules/warehouse/staging-area.service.spec.ts`, add:

```ts
describe('transferZone', () => {
  it('moves stock to an active WorkshopArea target and merges by batchId + area_id', async () => {
    const source = { id: 'stock-source', batchId: 'batch-1', area_id: 'area-a', location: '筛粉间', quantity: 8 };
    const targetArea = { id: 'area-b', name: '小料房', status: 'active' };
    const target = { id: 'stock-target', batchId: 'batch-1', area_id: 'area-b', quantity: 2 };
    const transferLog = { id: 'transfer-1', fromZone: '筛粉间', toZone: '小料房', quantity: 3 };

    jest.spyOn((prisma as any).workshopArea, 'findFirst').mockResolvedValue(targetArea);
    jest.spyOn(prisma.stagingAreaStock, 'findUnique').mockResolvedValue(source as any);
    jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback({
      stagingAreaStock: {
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(target),
        create: jest.fn(),
      },
      stagingAreaTransfer: {
        create: jest.fn().mockResolvedValue(transferLog),
      },
    }));

    const result = await service.transferZone({
      stockId: 'stock-source',
      toAreaId: 'area-b',
      quantity: 3,
      operatorId: 'user-1',
    });

    expect(result).toEqual(transferLog);
    expect((prisma as any).workshopArea.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-b', status: 'active', deleted_at: null },
    });
  });
});
```

- [ ] **Step 2: Update transferZone signature and implementation**

In `server/src/modules/warehouse/staging-area.service.ts`, replace the hard-coded target zone validation and target lookup in `transferZone` with `resolveActiveArea`. The final method must use this shape:

```ts
  async transferZone(dto: {
    stockId: string;
    toAreaId?: string;
    toZone?: string;
    quantity: number;
    operatorId: string;
    note?: string;
  }) {
    const toArea = await this.resolveActiveArea({ areaId: dto.toAreaId, zone: dto.toZone });

    const stock = await this.prisma.stagingAreaStock.findUnique({
      where: { id: dto.stockId },
    });
    if (!stock) throw new NotFoundException('暂存记录不存在');
    if (stock.area_id === toArea.id) throw new BadRequestException('来源区域与目标区域相同');
    if (dto.quantity <= 0 || dto.quantity > stock.quantity) {
      throw new BadRequestException(`迁移数量无效，当前库存：${stock.quantity}`);
    }

    const fromZone = stock.location ?? stock.area_id ?? '';

    return this.prisma.$transaction(async (tx) => {
      await tx.stagingAreaStock.update({
        where: { id: dto.stockId },
        data: { quantity: stock.quantity - dto.quantity },
      });

      const target = await tx.stagingAreaStock.findFirst({
        where: { batchId: stock.batchId, area_id: toArea.id },
      });
      if (target) {
        await tx.stagingAreaStock.update({
          where: { id: target.id },
          data: {
            quantity: target.quantity + dto.quantity,
            location: toArea.name,
          },
        });
      } else {
        await tx.stagingAreaStock.create({
          data: {
            batchId: stock.batchId,
            quantity: dto.quantity,
            area_id: toArea.id,
            location: toArea.name,
          },
        });
      }

      return tx.stagingAreaTransfer.create({
        data: {
          stockId: dto.stockId,
          batchId: stock.batchId,
          fromZone,
          toZone: toArea.name,
          quantity: dto.quantity,
          operatorId: dto.operatorId,
          note: dto.note,
        },
      });
    });
  }
```

- [ ] **Step 3: Run targeted service test**

```bash
npm run test --workspace server -- staging-area.service.spec.ts --runInBand
```

Expected: PASS.

## Task 4: Update optional client contract if legacy calls remain

- [ ] **Step 1: Search for legacy fields**

```bash
rg -n "stage\\(|transfer\\(|toZone|zone:" client/src server/src/modules/warehouse
```

Expected: any active client call to `/warehouse/staging-area/stage` or `/warehouse/staging-area/transfer` is visible.

- [ ] **Step 2: If `client/src/api/warehouse.ts` exposes legacy methods, prefer area IDs**

If `client/src/api/warehouse.ts` contains `zone` or `toZone` payload types for staging calls, change them to:

```ts
stage(data: { batchId: string; areaId: string; quantity: number; operatorId?: string }) {
  return request.post('/warehouse/staging-area/stage', data);
},
transfer(data: { stockId: string; toAreaId: string; quantity: number; operatorId?: string; note?: string }) {
  return request.post('/warehouse/staging-area/transfer', data);
},
```

If those methods do not exist, make no client edit.

- [ ] **Step 3: If `StagingArea.vue` calls legacy zone APIs, pass IDs**

If `client/src/views/warehouse/StagingArea.vue` calls legacy `stage` or `transfer`, change its form state from zone name to `areaId/toAreaId` and use existing `workshopAreaApi.getList()` options. If it only uses `areaId` stocktake APIs, make no page edit.

## Task 5: Verify and commit

- [ ] **Step 1: Run server targeted test**

```bash
npm run test --workspace server -- staging-area.service.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run server build**

```bash
npm run build --workspace server
```

Expected: PASS.

- [ ] **Step 3: Run whitespace check**

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/warehouse/staging-area.service.ts server/src/modules/warehouse/staging-area.service.spec.ts client/src/api/warehouse.ts client/src/views/warehouse/StagingArea.vue
git commit -m "fix: use workshop areas for staging zones"
```

If no client files changed, omit them from `git add`.
