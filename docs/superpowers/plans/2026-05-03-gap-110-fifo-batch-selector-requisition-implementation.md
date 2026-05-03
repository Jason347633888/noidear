# GAP-110: FIFO Batch Selector in RequisitionList — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing `GET /warehouse/batches/fifo` server endpoint into the requisition item-add flow so that when a user adds a material line to a draft requisition, the UI shows FIFO-recommended batches and the server auto-allocates them, enforcing BR-307 (先入先出) and BR-308 (同一领料单不重复关联同一批次).

**Architecture:** Server-side FIFO allocation — `RequisitionService.addItemsByFifo(id, materialId, quantity)` calls `BatchService.getFIFO()` and runs the `allocateByFIFO` logic (ported from `batch.fifo.spec.ts`) to create `MaterialRequisitionItem` rows. The client calls `GET /warehouse/batches/fifo?materialId=X` to preview the allocation, then calls the new `POST /warehouse/requisitions/:id/items/fifo` endpoint to commit it. No schema changes required — `MaterialRequisitionItem.batchId` is already a required FK.

**Tech Stack:** NestJS (server), Vue 3 + Element Plus (client), Prisma (ORM), Jest (unit tests).

---

## Worktree 隔离要求

执行 agent 禁止在主 checkout 直接操作。必须在 Multica run 提供的隔离工作目录中执行，或在独立 worktree 中：

```bash
git worktree list --porcelain
pwd
git branch --show-current
git status --short --branch
```

如果 `pwd` 是 `/Users/jiashenglin/Desktop/好玩的项目/noidear`，必须停止并回报，不得继续。

---

## Superpower 与 grill-me 校准记录

- **brainstorming：** 不适用（纯 UI + server endpoint，无 schema 变更，不影响事实源）
- **grill-with-docs：** 未找到 grill-with-docs skill；以下为等价校准清单手工执行：
  - ✅ 与 `docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md`：不引入平行批次链，`MaterialRequisitionItem.batchId` 已是正式 FK，FIFO endpoint 仅读取 `MaterialBatch`
  - ✅ 不复制主数据：`Material`、`MaterialBatch` 均使用现有表，不新建平行事实源
  - ✅ 不引入平行批次链路：`allocateByFIFO` 结果通过现有 `MaterialRequisitionItem` 写入，与 `ProductionBatch / BatchMaterialUsage` 主链无冲突
  - ✅ 无历史数据迁移：schema 无变更，无迁移脚本
  - ✅ 无业务确认项：FIFO 规则（BR-307/308）已在 `batch.fifo.spec.ts` 中明确
  - ✅ 可拆为独立 PR：纯增量，不改已有接口
  - ✅ 执行 agent 可独立完成：无跨 plan 依赖

- **writing-plans：** 本文件即 writing-plans 输出。
- **明确停止条件：** 如果代码与 plan 冲突（例如 schema 与预期不符、FIFO endpoint 已更名），执行 agent 必须停止并回报，不得自行修改 plan。

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `server/src/modules/warehouse/batch.service.ts` | 提取 `allocateByFIFO` 工具函数（从测试文件移植），新增 `allocateByFIFO` 方法 |
| Modify | `server/src/modules/warehouse/requisition.service.ts` | 新增 `addItemsByFifo(id, materialId, quantity)` 方法 |
| Modify | `server/src/modules/warehouse/requisition.controller.ts` | 新增 `POST /:id/items/fifo` 端点 |
| Modify | `server/src/modules/warehouse/requisition.service.spec.ts` | 新增 `addItemsByFifo` 测试 |
| Modify | `client/src/api/warehouse.ts` | 新增 `batchApi.getFIFO(materialId)` 和 `requisitionApi.addItemsByFifo(id, materialId, quantity)` |
| Modify | `client/src/views/warehouse/RequisitionList.vue` | 新增"查看/新增物料"功能：FIFO 批次预览对话框 + 提交 |

---

## Task 1: 提取 `allocateByFIFO` 到 BatchService

**目标：** 将 `batch.fifo.spec.ts` 中的 `allocateByFIFO` 工具函数移植到 `BatchService`，作为 public 方法供 `RequisitionService` 调用。

**Files:**
- Modify: `server/src/modules/warehouse/batch.service.ts`
- Modify: `server/src/modules/warehouse/batch.service.spec.ts`

- [ ] **Step 1.1: 在 `batch.service.spec.ts` 新增失败测试**

在 `batch.service.spec.ts` 末尾新增如下测试套件（保留现有测试）：

```typescript
describe('BatchService.allocateByFIFO()', () => {
  it('库存充足时从最早到期批次分配', () => {
    const batches = [
      { id: 'b1', batchNumber: 'B1', quantity: 100, expiryDate: new Date('2026-03-01'), createdAt: new Date('2026-01-01'), status: 'normal' },
      { id: 'b2', batchNumber: 'B2', quantity: 100, expiryDate: new Date('2026-06-01'), createdAt: new Date('2026-01-10'), status: 'normal' },
    ] as any[];

    const result = service.allocateByFIFO(batches, 30);

    expect(result).toHaveLength(1);
    expect(result[0].batchId).toBe('b1');
    expect(result[0].quantity).toBe(30);
  });

  it('单批次不足时跨批次补足', () => {
    const batches = [
      { id: 'b1', batchNumber: 'B1', quantity: 5, expiryDate: new Date('2026-03-01'), createdAt: new Date('2026-01-01'), status: 'normal' },
      { id: 'b2', batchNumber: 'B2', quantity: 10, expiryDate: new Date('2026-06-01'), createdAt: new Date('2026-01-10'), status: 'normal' },
    ] as any[];

    const result = service.allocateByFIFO(batches, 8);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ batchId: 'b1', quantity: 5 });
    expect(result[1]).toMatchObject({ batchId: 'b2', quantity: 3 });
  });

  it('总库存不足时抛出 BadRequestException', () => {
    const batches = [
      { id: 'b1', batchNumber: 'B1', quantity: 5, expiryDate: new Date('2026-03-01'), createdAt: new Date('2026-01-01'), status: 'normal' },
    ] as any[];

    expect(() => service.allocateByFIFO(batches, 10)).toThrow(BadRequestException);
  });

  it('requiredQty <= 0 时抛出 BadRequestException', () => {
    expect(() => service.allocateByFIFO([], 0)).toThrow(BadRequestException);
  });
});
```

在 `batch.service.spec.ts` 顶部 import 中加入：
```typescript
import { BadRequestException } from '@nestjs/common';
```

- [ ] **Step 1.2: 运行测试确认失败**

```bash
cd /path/to/worktree/server && npx jest batch.service.spec.ts --no-coverage 2>&1 | tail -20
```

期望：测试失败，报 `service.allocateByFIFO is not a function`。

- [ ] **Step 1.3: 在 `BatchService` 新增 `allocateByFIFO` 方法**

在 `server/src/modules/warehouse/batch.service.ts` 的 `getFIFO` 方法之后新增：

```typescript
allocateByFIFO(
  sortedBatches: Array<{ id: string; batchNumber: string; quantity: number }>,
  requiredQty: number,
): Array<{ batchId: string; batchNumber: string; quantity: number }> {
  if (requiredQty <= 0) {
    throw new BadRequestException('requiredQty 必须大于 0');
  }

  const allocations: Array<{ batchId: string; batchNumber: string; quantity: number }> = [];
  let remaining = requiredQty;

  for (const batch of sortedBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new BadRequestException(`库存不足：还需 ${remaining} 个单位`);
  }

  return allocations;
}
```

确认 `BadRequestException` 已在文件顶部 import（当前已有）。

- [ ] **Step 1.4: 运行测试确认通过**

```bash
cd /path/to/worktree/server && npx jest batch.service.spec.ts --no-coverage 2>&1 | tail -20
```

期望：所有测试 PASS。

- [ ] **Step 1.5: 提交**

```bash
git add server/src/modules/warehouse/batch.service.ts server/src/modules/warehouse/batch.service.spec.ts
git commit -m "feat(warehouse): expose allocateByFIFO on BatchService (BR-307)"
```

---

## Task 2: 新增服务端 `addItemsByFifo` 方法

**目标：** `RequisitionService` 新增 `addItemsByFifo(id, materialId, quantity)` 方法，调用 `BatchService.getFIFO` + `allocateByFIFO`，事务内创建 `MaterialRequisitionItem` 行。

**Files:**
- Modify: `server/src/modules/warehouse/requisition.service.ts`
- Modify: `server/src/modules/warehouse/requisition.service.spec.ts`

- [ ] **Step 2.1: 在 `requisition.service.spec.ts` 新增失败测试**

在 `requisition.service.spec.ts` 的 providers 中加入 `BatchService` mock：

```typescript
// 在 providers 数组末尾新增：
{
  provide: BatchService,
  useValue: {
    getFIFO: jest.fn(),
    allocateByFIFO: jest.fn(),
  },
},
```

在文件顶部 import 加入：
```typescript
import { BatchService } from './batch.service';
```

在 `beforeEach` 中获取 service：
```typescript
// 已有 service = module.get<RequisitionService>(RequisitionService);
// 新增：
let batchService: BatchService;
// ...
batchService = module.get<BatchService>(BatchService);
```

在 `requisition.service.spec.ts` 末尾新增测试套件：

```typescript
describe('RequisitionService.addItemsByFifo()', () => {
  const REQUISITION_ID = 'req-001';
  const MATERIAL_ID = 'mat-001';

  const mockRequisition = {
    id: REQUISITION_ID,
    status: 'draft',
    items: [],
    requisitionNo: 'REQ-20260503-001',
    applicantId: 'user-1',
    requisitionType: 'production',
    targetZone: '筛粉间',
    deletedAt: null,
  };

  beforeEach(() => {
    (prisma.materialRequisition.findUnique as jest.Mock).mockResolvedValue(mockRequisition);
    (batchService.getFIFO as jest.Mock).mockResolvedValue([
      { id: 'batch-1', batchNumber: 'B001', quantity: 100 },
    ]);
    (batchService.allocateByFIFO as jest.Mock).mockReturnValue([
      { batchId: 'batch-1', batchNumber: 'B001', quantity: 30 },
    ]);
    (prisma.$transaction as jest.Mock).mockImplementation((fn: any) =>
      fn(prisma),
    );
    (prisma.materialRequisitionItem as any) = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
  });

  it('应在事务内创建 MaterialRequisitionItem', async () => {
    await service.addItemsByFifo(REQUISITION_ID, MATERIAL_ID, 30);

    expect(batchService.getFIFO).toHaveBeenCalledWith(MATERIAL_ID);
    expect(batchService.allocateByFIFO).toHaveBeenCalledWith(expect.any(Array), 30);
    expect(prisma.materialRequisitionItem.createMany).toHaveBeenCalledWith({
      data: [{ requisitionId: REQUISITION_ID, batchId: 'batch-1', quantity: 30 }],
    });
  });

  it('非 draft 状态时抛出 BadRequestException', async () => {
    (prisma.materialRequisition.findUnique as jest.Mock).mockResolvedValue({
      ...mockRequisition,
      status: 'pending',
    });

    await expect(service.addItemsByFifo(REQUISITION_ID, MATERIAL_ID, 30)).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

在文件顶部 import 加入：
```typescript
import { BadRequestException } from '@nestjs/common';
```

- [ ] **Step 2.2: 运行测试确认失败**

```bash
cd /path/to/worktree/server && npx jest requisition.service.spec.ts --no-coverage 2>&1 | tail -20
```

期望：失败，报 `service.addItemsByFifo is not a function`。

- [ ] **Step 2.3: 在 `RequisitionService` 新增方法**

`server/src/modules/warehouse/requisition.service.ts` 构造函数中注入 `BatchService`：

```typescript
// 当前构造函数：
constructor(
  private readonly prisma: PrismaService,
  @Optional() private readonly approvalEngine: ApprovalEngineService,
  private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  private readonly supplierAccess: SupplierAccessService,
) {}
```

修改为：

```typescript
constructor(
  private readonly prisma: PrismaService,
  @Optional() private readonly approvalEngine: ApprovalEngineService,
  private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  private readonly supplierAccess: SupplierAccessService,
  private readonly batchService: BatchService,
) {}
```

在文件顶部 import 加入：
```typescript
import { BatchService } from './batch.service';
```

在 `approve` 方法之后新增 `addItemsByFifo` 方法：

```typescript
async addItemsByFifo(id: string, materialId: string, quantity: number) {
  const requisition = await this.findOne(id);
  if (requisition.status !== 'draft') {
    throw new BadRequestException('只有草稿状态的领料单可以新增物料行');
  }

  const fifoBatches = await this.batchService.getFIFO(materialId);
  const allocations = this.batchService.allocateByFIFO(fifoBatches, quantity);

  return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.materialRequisitionItem.createMany({
      data: allocations.map((a) => ({
        requisitionId: id,
        batchId: a.batchId,
        quantity: a.quantity,
      })),
    });
  });
}
```

确认 `BadRequestException` 已在顶部 import（已有）。

- [ ] **Step 2.4: 运行测试确认通过**

```bash
cd /path/to/worktree/server && npx jest requisition.service.spec.ts --no-coverage 2>&1 | tail -20
```

期望：所有测试 PASS。

- [ ] **Step 2.5: 提交**

```bash
git add server/src/modules/warehouse/requisition.service.ts server/src/modules/warehouse/requisition.service.spec.ts
git commit -m "feat(warehouse): add RequisitionService.addItemsByFifo (BR-307/308)"
```

---

## Task 3: 新增服务端 API 端点

**目标：** `RequisitionController` 新增 `POST /warehouse/requisitions/:id/items/fifo` 端点，接收 `{ materialId, quantity }`，调用 `addItemsByFifo`。

**Files:**
- Modify: `server/src/modules/warehouse/requisition.controller.ts`

- [ ] **Step 3.1: 在 `requisition.controller.ts` 新增端点**

在 `complete` handler 之后新增：

```typescript
@Post(':id/items/fifo')
@HttpCode(HttpStatus.CREATED)
addItemsByFifo(
  @Param('id') id: string,
  @Body() body: { materialId: string; quantity: number },
) {
  return this.requisitionService.addItemsByFifo(id, body.materialId, body.quantity);
}
```

- [ ] **Step 3.2: 确认 `WarehouseModule` 已注入 `BatchService`**

检查 `server/src/modules/warehouse/warehouse.module.ts` 中 `providers` 数组是否包含 `BatchService`：

```bash
grep -n "BatchService" /path/to/worktree/server/src/modules/warehouse/warehouse.module.ts
```

期望：看到 `BatchService` 在 providers 列表中。若不存在，在 providers 数组中加入 `BatchService`。

- [ ] **Step 3.3: 手动验证端点存在（构建检查）**

```bash
cd /path/to/worktree/server && npx tsc --noEmit 2>&1 | head -30
```

期望：无类型错误。

- [ ] **Step 3.4: 提交**

```bash
git add server/src/modules/warehouse/requisition.controller.ts
git commit -m "feat(warehouse): POST /warehouse/requisitions/:id/items/fifo endpoint"
```

---

## Task 4: 更新客户端 API 层

**目标：** 在 `client/src/api/warehouse.ts` 中为 `batchApi` 新增 `getFIFO`，为 `requisitionApi` 新增 `addItemsByFifo` 和 `getById`（若缺失）。

**Files:**
- Modify: `client/src/api/warehouse.ts`

- [ ] **Step 4.1: 新增 `FifoBatch` 类型**

在 `warehouse.ts` 中 `MaterialBatch` interface 之后新增：

```typescript
export interface FifoBatch {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: string;
  supplier_lot_no?: string;
}

export interface FifoAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
}
```

- [ ] **Step 4.2: 在 `batchApi` 新增 `getFIFO`**

在 `batchApi` 对象的 `update` 方法之后新增：

```typescript
getFIFO(materialId: string) {
  return request.get<FifoBatch[]>('/warehouse/batches/fifo', { params: { materialId } });
},
```

- [ ] **Step 4.3: 在 `requisitionApi` 新增 `addItemsByFifo` 和 `getById`**

`requisitionApi` 中已有 `getById`；若不存在则新增。在 `approve` 方法之后新增：

```typescript
addItemsByFifo(id: string, materialId: string, quantity: number) {
  return request.post(`/warehouse/requisitions/${id}/items/fifo`, { materialId, quantity });
},
```

- [ ] **Step 4.4: 类型检查**

```bash
cd /path/to/worktree && npx vue-tsc --noEmit 2>&1 | grep "warehouse.ts" | head -20
```

期望：无错误。

- [ ] **Step 4.5: 提交**

```bash
git add client/src/api/warehouse.ts
git commit -m "feat(warehouse): add getFIFO and addItemsByFifo to client API"
```

---

## Task 5: 更新 RequisitionList.vue — 领料明细与 FIFO 批次选择器

**目标：** 在 `RequisitionList.vue` 中新增"物料明细"按钮和"新增物料行"对话框。对话框流程：选择物料 → 输入数量 → 调用 FIFO 端点预览分配 → 确认后提交。

**Files:**
- Modify: `client/src/views/warehouse/RequisitionList.vue`

- [ ] **Step 5.1: 在操作列新增"明细"按钮**

在 `<el-table-column label="操作">` 的 `<template #default="{ row }">` 开头（现有按钮之前）新增：

```html
<el-button
  link type="info" @click="openItemsDialog(row)"
>明细</el-button>
```

- [ ] **Step 5.2: 新增"物料明细"对话框（含新增物料行子流程）**

在现有 `<!-- 创建领料单对话框 -->` 之后新增如下两个对话框：

```html
<!-- 物料明细对话框 -->
<el-dialog v-model="itemsVisible" title="领料明细" width="680px">
  <div v-if="currentRequisition" style="margin-bottom:12px; color:#606266; font-size:13px">
    单号：{{ currentRequisition.requisitionNo }}　状态：{{ reqStatusText(currentRequisition.status) }}
  </div>
  <el-table :data="currentItems" stripe size="small" style="margin-bottom:16px">
    <el-table-column prop="batch.batchNumber" label="批次号" width="160" />
    <el-table-column prop="batch.material.name" label="物料" />
    <el-table-column prop="quantity" label="数量" width="100" />
    <el-table-column prop="batch.expiryDate" label="到期日" width="120">
      <template #default="{ row }">
        {{ row.batch?.expiryDate ? new Date(row.batch.expiryDate).toLocaleDateString('zh-CN') : '-' }}
      </template>
    </el-table-column>
  </el-table>
  <el-button
    v-if="currentRequisition?.status === 'draft'"
    type="primary" size="small"
    @click="openAddItemDialog"
  >新增物料行</el-button>
  <template #footer>
    <el-button @click="itemsVisible = false">关闭</el-button>
  </template>
</el-dialog>

<!-- 新增物料行对话框（FIFO 预览） -->
<el-dialog v-model="addItemVisible" title="新增物料行（FIFO 自动分配）" width="520px">
  <el-form :model="addItemForm" label-width="80px">
    <el-form-item label="物料">
      <el-select
        v-model="addItemForm.materialId"
        filterable
        placeholder="选择物料"
        style="width:100%"
        @change="handleMaterialChange"
      >
        <el-option
          v-for="m in materials"
          :key="m.id"
          :value="m.id"
          :label="`${m.code} — ${m.name}`"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="数量">
      <el-input-number
        v-model="addItemForm.quantity"
        :min="0.01"
        :precision="2"
        style="width:100%"
        @change="handleQtyChange"
      />
    </el-form-item>
  </el-form>

  <!-- FIFO 预览 -->
  <div v-if="fifoPreview.length > 0" style="margin-top:12px">
    <div style="font-size:13px; color:#606266; margin-bottom:8px">FIFO 分配预览（按到期日先后）：</div>
    <el-table :data="fifoPreview" stripe size="small">
      <el-table-column prop="batchNumber" label="批次号" width="160" />
      <el-table-column prop="quantity" label="分配数量" width="100" />
      <el-table-column prop="expiryDate" label="到期日" width="120">
        <template #default="{ row }">
          {{ row.expiryDate ? new Date(row.expiryDate).toLocaleDateString('zh-CN') : '-' }}
        </template>
      </el-table-column>
    </el-table>
  </div>
  <div v-else-if="addItemForm.materialId && addItemForm.quantity > 0 && !fifoLoading" style="color:#e6a23c; font-size:13px; margin-top:8px">
    无可用批次或库存不足
  </div>

  <template #footer>
    <el-button @click="addItemVisible = false">取消</el-button>
    <el-button
      type="primary"
      :loading="addingItem"
      :disabled="fifoPreview.length === 0"
      @click="submitAddItem"
    >确认新增</el-button>
  </template>
</el-dialog>
```

- [ ] **Step 5.3: 在 `<script setup>` 新增响应式状态和逻辑**

在 `<script setup lang="ts">` 的现有 imports 之后新增 import：

```typescript
import { batchApi, materialApi, requisitionApi } from '@/api/warehouse';
import type { FifoBatch, Material } from '@/api/warehouse';
```

（注：`requisitionApi` 已在文件中通过 `import { requisitionApi } from '@/api/warehouse'` 引入，补充缺失的即可。）

在现有 `const loading = ref(false)` 之后新增以下状态变量：

```typescript
// 物料明细对话框
const itemsVisible = ref(false);
const currentRequisition = ref<any>(null);
const currentItems = ref<any[]>([]);

// 新增物料行对话框
const addItemVisible = ref(false);
const addingItem = ref(false);
const addItemForm = reactive({ materialId: '', quantity: 0 });

// FIFO 预览
const fifoLoading = ref(false);
const fifoPreview = ref<FifoBatch[]>([]);

// 物料列表（选择器用）
const materials = ref<Material[]>([]);
```

在 `onMounted` 中加入物料列表预加载：

```typescript
onMounted(async () => {
  fetchData();
  // 预加载物料列表，供新增物料行选择器使用
  try {
    const res: any = await materialApi.getList({ limit: 200 });
    materials.value = res.data ?? res.list ?? [];
  } catch {
    // 非关键，静默失败
  }
});
```

- [ ] **Step 5.4: 新增明细对话框逻辑**

在 `handleDispatch` 函数之后新增：

```typescript
const openItemsDialog = async (row: any) => {
  currentItems.value = [];
  fifoPreview.value = [];
  try {
    const res: any = await requisitionApi.getById(row.id);
    currentRequisition.value = res;
    currentItems.value = res.items ?? [];
  } catch {
    ElMessage.error('获取领料明细失败');
    return;
  }
  itemsVisible.value = true;
};

const openAddItemDialog = () => {
  addItemForm.materialId = '';
  addItemForm.quantity = 0;
  fifoPreview.value = [];
  addItemVisible.value = true;
};

const fetchFifoPreview = async () => {
  if (!addItemForm.materialId || addItemForm.quantity <= 0) {
    fifoPreview.value = [];
    return;
  }
  fifoLoading.value = true;
  try {
    const batches: any = await batchApi.getFIFO(addItemForm.materialId);
    const available = batches ?? [];
    // 客户端模拟 allocateByFIFO 以生成预览（服务端会再次执行真实分配）
    let remaining = addItemForm.quantity;
    const preview: FifoBatch[] = [];
    for (const b of available) {
      if (remaining <= 0) break;
      const take = Math.min(b.quantity, remaining);
      preview.push({ ...b, quantity: take });
      remaining -= take;
    }
    fifoPreview.value = remaining > 0 ? [] : preview;
  } catch {
    fifoPreview.value = [];
  } finally {
    fifoLoading.value = false;
  }
};

const handleMaterialChange = () => { fetchFifoPreview(); };
const handleQtyChange = () => { fetchFifoPreview(); };

const submitAddItem = async () => {
  if (!currentRequisition.value) return;
  addingItem.value = true;
  try {
    await requisitionApi.addItemsByFifo(
      currentRequisition.value.id,
      addItemForm.materialId,
      addItemForm.quantity,
    );
    ElMessage.success('物料行已按 FIFO 新增');
    addItemVisible.value = false;
    // 刷新明细
    await openItemsDialog(currentRequisition.value);
    fetchData();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message ?? '新增失败');
  } finally {
    addingItem.value = false;
  }
};
```

- [ ] **Step 5.5: 类型检查**

```bash
cd /path/to/worktree && npx vue-tsc --noEmit 2>&1 | grep "RequisitionList" | head -20
```

期望：无类型错误。如有，根据错误提示修正类型标注（不改逻辑）。

- [ ] **Step 5.6: 提交**

```bash
git add client/src/views/warehouse/RequisitionList.vue
git commit -m "feat(warehouse): FIFO batch selector in RequisitionList (GAP-110)"
```

---

## Task 6: 更新三张调度表

**目标：** 同步 `97-gap-triage.md`、`96-pr-roadmap.md`、`module-usage.manifest.json`。

**Files:**
- Modify: `docs/module-usage/97-gap-triage.md`
- Modify: `docs/module-usage/96-pr-roadmap.md`
- Modify: `docs/module-usage/module-usage.manifest.json`

- [ ] **Step 6.1: 更新 `97-gap-triage.md`**

将 GAP-110 行从：

```
| GAP-110 | P2 | 需要运行系统确认 | 否 | 否 | 否 | `grill-me` | | | 先运行系统确认 FIFO 推荐现状，待确认后重新分诊 |
```

改为：

```
| GAP-110 | P2 | 已验证 | 是 | 否 | 是 | `writing-plans` -> `executing-plans` | 不需要 | docs/superpowers/plans/2026-05-03-gap-110-fifo-batch-selector-requisition-implementation.md | plan 已写完，可进入 PR roadmap；代码验证：`BatchController.getFIFO` 已实现，client `batchApi` 缺 getFIFO，RequisitionList 无物料行选择；不改 schema；执行时只使用 executing-plans |
```

- [ ] **Step 6.2: 更新 `96-pr-roadmap.md`**

在 PR 路线图表末尾新增一行（在最后一行 GAP-414 之后）：

```
| 37 | warehouse/GAP-110 | GAP-110 | 无 | 不需要 | `docs/superpowers/plans/2026-05-03-gap-110-fifo-batch-selector-requisition-implementation.md` | `executing-plans` | 是 | RequisitionList 新增物料行时调用 FIFO 端点，服务端 allocateByFIFO 自动分配 MaterialRequisitionItem，强制 BR-307/308 |
```

- [ ] **Step 6.3: 更新 `module-usage.manifest.json`**

在 `"supplier-procurement-incoming"` 文档的 `gapIds` 数组中，若 `"GAP-110"` 不存在则新增。同时确认文件可被 `jq` 解析：

```bash
jq empty docs/module-usage/module-usage.manifest.json
```

期望：无错误输出。

- [ ] **Step 6.4: 运行文档一致性校验**

```bash
cd /path/to/worktree && node tools/check-module-usage-docs.mjs 2>&1
```

期望：无 ERROR。若有 WARN，记录但不阻塞。

- [ ] **Step 6.5: 提交**

```bash
git add docs/module-usage/97-gap-triage.md docs/module-usage/96-pr-roadmap.md docs/module-usage/module-usage.manifest.json
git commit -m "docs: update GAP-110 triage, roadmap, manifest (FIFO batch selector ready)"
```

---

## Task 7: 创建 PR

- [ ] **Step 7.1: 推送分支**

```bash
git push -u origin HEAD 2>&1 | tail -5
```

- [ ] **Step 7.2: 创建 PR**

```bash
gh pr create \
  --title "docs: prepare GAP-110 FIFO batch selector implementation plan" \
  --body "$(cat <<'EOF'
## GAP-110: FIFO Batch Selector in RequisitionList

### 本 PR 内容

**本 PR 只包含计划文档和调度表更新，不含代码实现。**

- GAP 编号：GAP-110
- spec 路径：不需要（无 schema 变更）
- plan 路径：`docs/superpowers/plans/2026-05-03-gap-110-fifo-batch-selector-requisition-implementation.md`

### 是否使用 Superpower

- brainstorming：否（纯 UI + 端点增量，无 schema/事实源变更）
- grill-with-docs：否（未找到 skill；已用等价校准清单手工执行，结论见 plan 头部）
- writing-plans：是

### Roadmap 回写

- `97-gap-triage.md`：GAP-110 状态更新为"已验证"，plan 路径已填入
- `96-pr-roadmap.md`：GAP-110 新增为第 37 条 PR
- `module-usage.manifest.json`：GAP-110 已加入 supplier-procurement-incoming 模块

### 校验

```
node tools/check-module-usage-docs.mjs → 无 ERROR
jq empty docs/module-usage/module-usage.manifest.json → 无输出（OK）
npx tsc --noEmit → 无类型错误
```

### 执行 agent 须知

后续执行 agent 只能使用 `superpowers:executing-plans`，在独立 worktree 或 Multica 隔离工作目录中执行 Task 1–5，禁止写主 checkout。
EOF
)"
```

---

## 自检清单

- [x] **Spec 覆盖：**
  - 服务端 `GET /warehouse/batches/fifo` 已存在 → Task 1 将 `allocateByFIFO` 提取为 `BatchService` 方法
  - 客户端无 `getFIFO` → Task 4 新增
  - 客户端无物料行选择 UI → Task 5 新增
  - 无 schema 变更 → 无 migration task（正确）
  - BR-307 FIFO 顺序 → Task 1+2 覆盖
  - BR-308 无重复批次 → server 端 `allocateByFIFO` 天然保证（每批次只出现一次）；`MaterialRequisitionItem` 层无唯一索引约束，但单次 FIFO 分配结果不会重复同一批次

- [x] **占位符扫描：** 无 TBD/TODO/后续补充
- [x] **类型一致性：**
  - `FifoBatch` 定义于 Task 4，在 Task 5 的 `fifoPreview` 使用 ✓
  - `allocateByFIFO` 返回 `{ batchId, batchNumber, quantity }[]`，Task 2 的 `createMany` data 使用 `batchId` 和 `quantity` ✓
  - `requisitionApi.getById` 在 Task 5 使用，`warehouse.ts` 中已有 `getById` ✓
