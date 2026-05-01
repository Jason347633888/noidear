# GAP-001/006 Process Instance Product Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not redesign product master data, approval definitions, or the 9-step R&D workflow. If current code disagrees with this plan, stop and report the mismatch to the main agent.

**Goal:** Allow R&D process instances to bind an existing `Product.id` while preserving the current new-product creation path.

**Architecture:** Keep `ProcessInstance.productId` nullable. Add optional `productId` to the create API and Step1 form, then make both approval paths prefer existing Product binding before creating a new Product.

**Tech Stack:** NestJS controller/callback, Prisma, Vue 3, Element Plus, Jest.

---

## Superpower 与 grill-me 校准记录

- **Superpower 产出链路：** 主 agent 已按 `brainstorming -> grill-me -> writing-plans` 为 GAP-001/006 生成 spec 和本 implementation plan。
- **grill-me 校准结论：** 已确认新产品研发在 Step1 审批前允许没有 Product；已有产品流程必须绑定 Product，并且 Step1 审批不得创建重复 Product。
- **执行限制：** Multica 执行 agent 只能使用 `superpowers:executing-plans` 执行本计划；不得自行扩展范围、补写新 spec、重排 GAP 或改动未列入文件。
- **执行隔离：** 执行本计划前必须从最新 `origin/master` 创建独立 worktree，或使用 Multica 隔离工作目录；不得在主 checkout `/Users/jiashenglin/Desktop/好玩的项目/noidear` 直接修改、提交或 push。如发现当前目录是主 checkout，必须停止并回报主 agent。
- **停止条件：** 如果执行 agent 发现本计划与当前代码、AGENTS.md、docs/AGENT_GUIDE.md 或 docs/MASTER_DATA_AND_TRACEABILITY_MODEL.md 冲突，必须停止并回报主 agent，不得猜测实现。

## File Map

- Modify: `client/src/api/process.ts`
- Modify: `client/src/views/process/Step1.vue`
- Modify: `server/src/modules/process/process-instance.controller.ts`
- Modify: `server/src/modules/process/process-approval.callbacks.ts`
- Modify: `server/src/modules/process/process-step-approval.service.ts`
- Add: `server/src/modules/process/process-product-link.spec.ts`
- Do not modify: `server/src/prisma/schema.prisma`
- Do not modify: `server/src/modules/product/`

## Task 1: Extend the process create API contract

**Files:**
- Modify: `client/src/api/process.ts`

- [ ] **Step 1: Change `createInstance` signature**

Replace the current `createInstance` method with:

```ts
  createInstance: (templateId: string, productName?: string, productId?: string) =>
    request.post<ProcessInstance>('/process/instances', { templateId, productName, productId }),
```

- [ ] **Step 2: Run a type check for the client if dependencies are available**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client
```

Expected: build succeeds. If unrelated existing build failures occur, capture the exact first error and continue only if it is unrelated to this file.

## Task 2: Bind existing Product in `POST /process/instances`

**Files:**
- Modify: `server/src/modules/process/process-instance.controller.ts`

- [ ] **Step 1: Add product lookup before create**

Inside `create()`, before `this.prisma.processInstance.create`, add:

```ts
    const productId = typeof data.productId === 'string' && data.productId.trim()
      ? data.productId.trim()
      : undefined;
    const product = productId
      ? await this.prisma.product.findFirst({
          where: { id: productId, deleted_at: null },
        })
      : null;

    if (productId && !product) {
      throw new BadRequestException('产品不存在或已删除');
    }
```

- [ ] **Step 2: Replace create data**

Change the `data` object passed to `processInstance.create` to:

```ts
      data: {
        templateId: data.templateId,
        productId: product?.id,
        productName: product?.name ?? data.productName ?? '',
        createdById: userId,
        status: 'DRAFT',
        currentStep: 1,
      },
```

- [ ] **Step 3: Verify schema is unchanged**

```bash
git diff -- server/src/prisma/schema.prisma
```

Expected: no diff.

## Task 3: Add existing Product selection to Step1

**Files:**
- Modify: `client/src/views/process/Step1.vue`

- [ ] **Step 1: Add a Product select above productName**

Insert this form item before the existing “开发产品名称” form item:

```vue
        <el-form-item label="关联已有产品">
          <el-select
            v-model="form.productId"
            filterable
            clearable
            placeholder="不选择则按新产品研发"
            style="width: 100%"
            @change="handleProductChange"
          >
            <el-option
              v-for="product in products"
              :key="product.id"
              :label="`${product.code} ${product.name}`"
              :value="product.id"
            />
          </el-select>
        </el-form-item>
```

- [ ] **Step 2: Add imports**

Change imports to include `productApi` and `Product`:

```ts
import { productApi, type Product } from '@/api/product';
```

- [ ] **Step 3: Add `productId` and products state**

Add `productId` to the reactive form and add products state:

```ts
const products = ref<Product[]>([]);

const form = reactive({
  requestDate: dayjs().format('YYYY-MM-DD'),
  productId: '',
  productName: '',
  developmentQuantity: '',
  processRequirement: '',
  productCharacteristics: '',
  packagingRequirement: '充氮包装',
  regulatoryRequirement: 'GB7099-2015',
  identifiedHazards: '',
  feasibilityAnalysis: '',
  applicationConclusion: '',
});
```

- [ ] **Step 4: Load products on mount**

Replace the current `onMounted` block with:

```ts
onMounted(async () => {
  try {
    const res = await productApi.getList();
    products.value = (res as any)?.data ?? (Array.isArray(res) ? res : []);
  } catch {
    products.value = [];
  }

  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    Object.keys(form).forEach((k) => {
      if (mv[k as keyof typeof form] !== undefined) {
        (form as any)[k] = mv[k as keyof typeof form];
      }
    });
  }
});
```

- [ ] **Step 5: Add product change handler**

Add below `handleSave`:

```ts
const handleProductChange = (productId: string) => {
  const product = products.value.find((p) => p.id === productId);
  if (product) {
    form.productName = product.name;
  }
};
```

- [ ] **Step 6: Keep submit payload as `{ ...form }`**

Do not strip `productId`; Step1 approval callbacks need it.

## Task 4: Make unified approval callback prefer existing Product

**Files:**
- Modify: `server/src/modules/process/process-approval.callbacks.ts`

- [ ] **Step 1: Replace the Step1 block**

Replace the current `if (stepNumber === 1) { ... }` block with:

```ts
  if (stepNumber === 1) {
    const productId = typeof data.productId === 'string' && data.productId.trim()
      ? data.productId.trim()
      : undefined;
    const productName = data.productName as string | undefined;

    if (productId) {
      const product = await tx.product.findFirst({
        where: { id: productId, deleted_at: null },
      });
      if (!product) {
        throw new Error('产品不存在或已删除');
      }
      instanceUpdate.productId = product.id;
      instanceUpdate.productName = product.name;
    } else if (productName && !instance.productId) {
      const product = await tx.product.create({
        data: {
          company_id: '1',
          code: `RD-${Date.now()}`,
          name: productName,
          status: 'draft',
        },
      });
      instanceUpdate.productName = productName;
      instanceUpdate.productId = product.id;
    } else if (productName) {
      instanceUpdate.productName = productName;
    }
  }
```

## Task 5: Keep legacy approval service behavior aligned

**Files:**
- Modify: `server/src/modules/process/process-step-approval.service.ts`

- [ ] **Step 1: Replace the Step1 block in `applyApprovedStepEffects()`**

Replace the current `if (stepNumber === 1) { ... }` block with:

```ts
    if (stepNumber === 1) {
      const productId = typeof data.productId === 'string' && data.productId.trim()
        ? data.productId.trim()
        : undefined;
      const productName = data.productName;

      if (productId) {
        const product = await tx.product.findFirst({
          where: { id: productId, deleted_at: null },
        });
        if (!product) {
          throw new BadRequestException('产品不存在或已删除');
        }
        instanceUpdate.productId = product.id;
        instanceUpdate.productName = product.name;
      } else if (productName && !instance.productId) {
        const product = await tx.product.create({
          data: { company_id: '1', code: `RD-${Date.now()}`, name: productName, status: 'draft' },
        });
        instanceUpdate.productName = productName;
        instanceUpdate.productId = product.id;
      } else if (productName) {
        instanceUpdate.productName = productName;
      }
    }
```

## Task 6: Add focused tests for duplicate Product prevention

**Files:**
- Add: `server/src/modules/process/process-product-link.spec.ts`

- [ ] **Step 1: Create callback tests**

```ts
import { applyProcessStepApproved } from './process-approval.callbacks';

describe('process product link approval callback', () => {
  const createTx = (stepData: any, instanceOverrides: any = {}) => ({
    processInstance: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'pi-1',
        productId: null,
        productName: '',
        template: { steps: [{ stepNumber: 1 }] },
        ...instanceOverrides,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    processStepData: {
      findUnique: jest.fn().mockResolvedValue({
        instanceId: 'pi-1',
        stepNumber: 1,
        status: 'SUBMITTED',
        data: stepData,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  });

  it('links an existing product without creating a duplicate product', async () => {
    const tx = createTx({ productId: 'prod-1', productName: '前端文本名' });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', name: '主数据产品名' });

    await applyProcessStepApproved({} as any, {
      tx,
      resourceId: 'pi-1',
      resourceStep: 'step:1',
      actorId: 'user-1',
    } as any);

    expect(tx.product.create).not.toHaveBeenCalled();
    expect(tx.processInstance.update).toHaveBeenCalledWith({
      where: { id: 'pi-1' },
      data: expect.objectContaining({
        productId: 'prod-1',
        productName: '主数据产品名',
      }),
    });
  });

  it('keeps the new-product path when no productId is supplied', async () => {
    const tx = createTx({ productName: '新产品A' });
    tx.product.create.mockResolvedValue({ id: 'created-prod-1' });

    await applyProcessStepApproved({} as any, {
      tx,
      resourceId: 'pi-1',
      resourceStep: 'step:1',
      actorId: 'user-1',
    } as any);

    expect(tx.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '新产品A',
        status: 'draft',
      }),
    });
    expect(tx.processInstance.update).toHaveBeenCalledWith({
      where: { id: 'pi-1' },
      data: expect.objectContaining({
        productId: 'created-prod-1',
        productName: '新产品A',
      }),
    });
  });
});
```

- [ ] **Step 2: Run focused tests**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear/server
npm test -- process-product-link.spec.ts
```

Expected: PASS.

## Task 7: Final verification and commit

- [ ] **Step 1: Run server build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:server
```

Expected: build succeeds, or report the existing unrelated blocker exactly.

- [ ] **Step 2: Run client build**

```bash
cd /Users/jiashenglin/Desktop/好玩的项目/noidear
npm run build:client
```

Expected: build succeeds, or report the existing unrelated blocker exactly.

- [ ] **Step 3: Confirm no schema changes**

```bash
git diff -- server/src/prisma/schema.prisma
```

Expected: no diff.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/process.ts client/src/views/process/Step1.vue server/src/modules/process/process-instance.controller.ts server/src/modules/process/process-approval.callbacks.ts server/src/modules/process/process-step-approval.service.ts server/src/modules/process/process-product-link.spec.ts
git commit -m "feat: link process instances to products"
```
