# 产品研发流程重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将产品研发流程从9步改造为符合 CX-26 的7步流程，新增多人会签表、Product营养成分字段，实现数据在步骤间自动传递。

**Architecture:** 后端新增 `ProcessStepApproval` 待签槽位表支持多人会签，提交步骤时由后端按模板创建待签槽位，签署时由后端根据当前用户部门/角色解析可签角色，禁止信任客户端传入的审批角色。审批通过、步骤推进和副作用（创建Product、写Recipe）必须在同一个 Prisma transaction 内完成；前端完全重写 Step1-7 组件，使用统一的 `DeptSignoffPanel` 会签组件。

**Tech Stack:** NestJS 10 + Prisma 5 + PostgreSQL（后端），Vue 3 + Element Plus + TypeScript（前端），Jest（后端测试）

---

## 文件结构总览

**新建文件：**
- `server/src/prisma/migrations/YYYYMMDD_product_rd_redesign/migration.sql`
- `server/src/modules/process/process-step-approval.service.ts`
- `client/src/components/process/DeptSignoffPanel.vue`
- `client/src/components/process/RecipeLineEditor.vue`

**修改文件：**
- `server/src/prisma/schema.prisma` — 新增3处（ProcessStepApproval、ProcessInstance.productId、Product营养字段）
- `server/src/modules/process/process-instance.controller.ts` — 新增approval端点，修改submitStep
- `server/src/modules/process/process.module.ts` — 注册新 service
- `client/src/api/process.ts` — 新增 approval 相关 types 和方法
- `client/src/views/process/ProcessDetail.vue` — 7步配置，锁定逻辑
- `client/src/views/process/Step1.vue` — 完全重写（JL-09）
- `client/src/views/process/Step2.vue` — 完全重写（JL-10，rawMaterials加qty字段）
- `client/src/views/process/Step3.vue` — 完全重写（JL-11）
- `client/src/views/process/Step4.vue` — 完全重写（JL-01，5部门会签）
- `client/src/views/process/Step5.vue` — 完全重写（JL-04，营养成分）
- `client/src/views/process/Step6.vue` — 完全重写（JL-02+JL-06，配方工艺）
- `client/src/views/process/Step7.vue` — 完全重写（JL-07，3人会签）
- `client/src/utils/processValidation.ts` — 更新为7步验证

**删除文件：**
- `client/src/views/process/Step8.vue`
- `client/src/views/process/Step9.vue`

---

## Task 1: Schema — 新增 ProcessStepApproval 表

**Files:**
- Modify: `server/src/prisma/schema.prisma`

- [ ] **Step 1: 在 schema.prisma 中，找到 ProcessStepData 模型之后，新增以下内容**

```prisma
model ProcessStepApproval {
  id          String          @id @default(cuid())
  instanceId  String
  instance    ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  stepNumber  Int
  approverId  String?
  approver    User?           @relation("StepApprovalUser", fields: [approverId], references: [id], onDelete: SetNull)
  department  String
  role        String          // 'gm'|'manager'|'quality'|'manufacture'|'purchase'|'food_safety_leader'
  status      String          @default("PENDING") // 'PENDING'|'APPROVED'|'REJECTED'
  comment     String?
  signedAt    DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([instanceId, stepNumber, role])
  @@index([instanceId, stepNumber])
  @@index([role, status])
  @@index([approverId, status])
  @@map("process_step_approvals")
}
```

- [ ] **Step 2: 在 ProcessInstance 模型中新增两个字段**（找到 `stepData ProcessStepData[]` 那行，在它后面加）

```prisma
  productId   String?
  product     Product?              @relation("ProcessProduct", fields: [productId], references: [id], onDelete: SetNull)
  approvals   ProcessStepApproval[]
```

- [ ] **Step 3: 在 Product 模型中新增营养成分字段**（找到 `label_claims String?` 后面加）

```prisma
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
```

- [ ] **Step 4: 在 User 模型中补充反向关系**（找到 User 模型的反向关系区域，加一行）

```prisma
  stepApprovals       ProcessStepApproval[] @relation("StepApprovalUser")
```

- [ ] **Step 5: 生成 migration**

```bash
cd server
npx prisma migrate dev --name product_rd_redesign --schema=src/prisma/schema.prisma
```

Expected: migration SQL 文件生成，prisma client 重新生成，无报错

- [ ] **Step 6: 验证 Prisma Client 生成成功**

```bash
npx prisma generate --schema=src/prisma/schema.prisma
```

Expected: `Generated Prisma Client` 无报错

- [ ] **Step 7: Commit**

```bash
git add server/src/prisma/schema.prisma server/src/prisma/migrations/
git commit -m "feat: 新增ProcessStepApproval表，Product营养成分字段，ProcessInstance.productId"
```

---

## Task 2: Schema — 更新 ProcessTemplate 种子数据

**Files:**
- Modify: `server/src/prisma/seed.ts`（或找到现有 template 的 seed/init 脚本）

- [ ] **Step 1: 找到现有 processTemplate 的创建逻辑**

```bash
grep -rn "processTemplate\|ProcessTemplate" server/src/prisma/ --include="*.ts" | head -20
```

- [ ] **Step 2: 将 7 步模板写入 seed/init 脚本**（不要只用一次性 `ts-node -e` 改当前数据库）

在 `server/src/prisma/seed.ts` 中加入或替换为持久化 upsert 逻辑。注意：不要直接覆盖老 9 步模板；创建新的 active 模板前先把旧 active 模板置为 inactive，避免已存在 9 步实例的 `templateId` 被改写后语义错乱。

```typescript
const productRd7StepTemplate = {
  name: '产品研发流程（7步）',
  steps: [
    { stepNumber: 1, name: '新产品开发申请书', formCode: 'JL-09', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
    { stepNumber: 2, name: '新产品开发计划书', formCode: 'JL-10', requiredApprovals: [{ role: 'manager', dept: '产品开发部' }] },
    { stepNumber: 3, name: '研发试验记录',     formCode: 'JL-11', requiredApprovals: [] },
    { stepNumber: 4, name: '产品开发评审',     formCode: 'JL-01', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }, { role: 'purchase', dept: '采购部' }, { role: 'development', dept: '产品开发部' }, { role: 'gm', dept: '总经办' }] },
    { stepNumber: 5, name: '产品标签信息记录', formCode: 'JL-04', requiredApprovals: [{ role: 'gm', dept: '总经办' }] },
    { stepNumber: 6, name: '产品操作规程',     formCode: 'JL-02+JL-06', requiredApprovals: [{ role: 'quality', dept: '品质部' }, { role: 'manufacture', dept: '制造部' }] },
    { stepNumber: 7, name: '产品验证记录',     formCode: 'JL-07', requiredApprovals: [{ role: 'manufacture', dept: '制造部' }, { role: 'quality', dept: '品质部' }, { role: 'food_safety_leader', dept: '食品安全小组' }] },
  ],
};

await prisma.$transaction(async (tx) => {
  const existing7Step = await tx.processTemplate.findFirst({
    where: { name: productRd7StepTemplate.name },
  });

  if (existing7Step) {
    await tx.processTemplate.update({
      where: { id: existing7Step.id },
      data: { steps: productRd7StepTemplate.steps, isActive: true },
    });
  } else {
    await tx.processTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await tx.processTemplate.create({ data: productRd7StepTemplate });
  }
});
```

运行 seed：

```bash
cd server
npx prisma db seed
```

Expected: `Updated template: xxx` 或 `Created template: xxx`

- [ ] **Step 3: Commit**

```bash
git commit -am "chore: 更新ProcessTemplate为7步流程配置"
```

---

## Task 3: 后端 — ProcessStepApproval Service

**Files:**
- Create: `server/src/modules/process/process-step-approval.service.ts`
- Modify: `server/src/modules/process/process.module.ts`

- [ ] **Step 1: 先写测试文件**

新建 `server/src/modules/process/process-step-approval.service.spec.ts`：

```typescript
import { ProcessStepApprovalService } from './process-step-approval.service';

describe('ProcessStepApprovalService', () => {
  describe('checkAllApproved', () => {
    it('should return true when all required roles approved', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'APPROVED' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(true);
    });

    it('should return false when one role is still PENDING', () => {
      const required = [{ role: 'quality' }, { role: 'manufacture' }];
      const approvals = [
        { role: 'quality', status: 'APPROVED' },
        { role: 'manufacture', status: 'PENDING' },
      ];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, approvals)).toBe(false);
    });

    it('should return false when no approvals exist', () => {
      const required = [{ role: 'gm' }];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(false);
    });

    it('should return true when step has no required approvals (Step3)', () => {
      const required: unknown[] = [];
      const svc = new ProcessStepApprovalService(null as any);
      expect((svc as any).checkAllApproved(required, [])).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd server && npx jest process-step-approval.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './process-step-approval.service'`

- [ ] **Step 3: 实现 Service**

新建 `server/src/modules/process/process-step-approval.service.ts`：

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type RequiredApproval = { role: string; dept?: string };
type TxClient = Prisma.TransactionClient;

@Injectable()
export class ProcessStepApprovalService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureApprovalSlots(
    instanceId: string,
    stepNumber: number,
    requiredApprovals: RequiredApproval[],
    tx: TxClient = this.prisma as unknown as TxClient,
  ) {
    if (requiredApprovals.length === 0) return;

    await tx.processStepApproval.createMany({
      data: requiredApprovals.map((a) => ({
        instanceId,
        stepNumber,
        role: a.role,
        department: a.dept ?? '',
        status: 'PENDING',
      })),
      skipDuplicates: true,
    });
  }

  async submitApproval(
    instanceId: string,
    stepNumber: number,
    approverId: string,
    action: 'approve' | 'reject',
    comment: string,
    requestedRole?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: approverId },
      include: { department: true, roleObj: true },
    });
    if (!user) throw new NotFoundException('审批用户不存在');

    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.processInstance.findUnique({
        where: { id: instanceId },
        include: { template: true, stepData: { where: { stepNumber } } },
      });
      if (!instance) throw new NotFoundException('流程实例不存在');
      if (instance.currentStep !== stepNumber) {
        throw new BadRequestException('只能审批当前进行中的步骤');
      }

      const submittedStep = instance.stepData[0];
      if (!submittedStep || submittedStep.status !== 'SUBMITTED') {
        throw new BadRequestException('步骤必须先提交后才能审批');
      }

      const steps = (instance.template.steps as any[]) ?? [];
      const stepConfig = steps.find((s: any) => s.stepNumber === stepNumber);
      if (!stepConfig) throw new NotFoundException('步骤配置不存在');

      const required: RequiredApproval[] = stepConfig.requiredApprovals ?? [];
      await this.ensureApprovalSlots(instanceId, stepNumber, required, tx as unknown as TxClient);

      const approvals = await tx.processStepApproval.findMany({
        where: { instanceId, stepNumber },
        orderBy: { createdAt: 'asc' },
      });

      const allowedRoles = this.resolveAllowedRoles(user, required);
      const targetRole = requestedRole && allowedRoles.has(requestedRole)
        ? requestedRole
        : approvals.find((a) => allowedRoles.has(a.role) && a.status === 'PENDING')?.role;

      if (!targetRole) {
        throw new BadRequestException('当前用户无权审批此步骤，或已无待签角色');
      }

      const target = approvals.find((a) => a.role === targetRole);
      if (!target || target.status !== 'PENDING') {
        throw new BadRequestException('该角色已完成签署，不能重复签署');
      }

      const signed = await tx.processStepApproval.update({
        where: { instanceId_stepNumber_role: { instanceId, stepNumber, role: targetRole } },
        data: {
          approverId,
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          comment,
          signedAt: new Date(),
        },
      });

      if (action === 'reject') {
        await tx.processStepData.update({
          where: { instanceId_stepNumber: { instanceId, stepNumber } },
          data: { status: 'REJECTED', approvedById: approverId, approvedAt: new Date(), approvalComment: comment },
        });
        return { allApproved: false, rejected: true, approval: signed };
      }

      const approvalsAfterSign = approvals.map((a) => (a.role === targetRole ? signed : a));
      const allApproved = this.checkAllApproved(required, approvalsAfterSign);

      if (allApproved) {
        await this.applyApprovedStepEffects(tx as unknown as TxClient, instance, stepNumber, steps, approverId);
      }

      return { allApproved, rejected: false, approval: signed };
    });
  }

  private resolveAllowedRoles(user: any, required: RequiredApproval[]): Set<string> {
    const roleCode = user.roleObj?.code ?? user.role ?? '';
    const deptName = user.department?.name ?? '';
    if (roleCode === 'admin') return new Set(required.map((r) => r.role));

    const rolesByDept: Record<string, string[]> = {
      '总经办': ['gm'],
      '产品开发部': ['manager', 'development'],
      '品质部': ['quality'],
      '制造部': ['manufacture'],
      '采购部': ['purchase'],
      '食品安全小组': ['food_safety_leader'],
    };
    const candidates = new Set<string>([roleCode, ...(rolesByDept[deptName] ?? [])]);
    return new Set(required.filter((r) => candidates.has(r.role)).map((r) => r.role));
  }

  private checkAllApproved(required: RequiredApproval[], approvals: any[]): boolean {
    if (required.length === 0) return true;
    return required.every((req) =>
      approvals.some((a) => a.role === req.role && a.status === 'APPROVED'),
    );
  }

  private async applyApprovedStepEffects(
    tx: TxClient,
    instance: any,
    stepNumber: number,
    steps: any[],
    approverId: string,
  ) {
    const maxStep = steps.length;
    const nextStep = stepNumber + 1;
    const isLast = stepNumber >= maxStep;
    const stepData = await tx.processStepData.findUnique({
      where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
    });
    const data = (stepData?.data as any) ?? {};
    const instanceUpdate: any = {
      currentStep: isLast ? maxStep : nextStep,
      status: isLast ? 'COMPLETED' : 'IN_PROGRESS',
    };

    if (stepNumber === 1) {
      const productName = data.productName;
      if (productName && !instance.productId) {
        const product = await tx.product.create({
          data: { company_id: '1', code: `RD-${Date.now()}`, name: productName, status: 'draft' },
        });
        instanceUpdate.productName = productName;
        instanceUpdate.productId = product.id;
      } else if (productName) {
        instanceUpdate.productName = productName;
      }
    }

    if (stepNumber === 5 && instance.productId) {
      await tx.product.update({
        where: { id: instance.productId },
        data: {
          shelf_life_days: data.shelfLifeDays ? parseInt(data.shelfLifeDays) : undefined,
          nutrition_energy: data.nutritionEnergy ? parseFloat(data.nutritionEnergy) : undefined,
          nutrition_protein: data.nutritionProtein ? parseFloat(data.nutritionProtein) : undefined,
          nutrition_fat: data.nutritionFat ? parseFloat(data.nutritionFat) : undefined,
          nutrition_trans_fat: data.nutritionTransFat ? parseFloat(data.nutritionTransFat) : undefined,
          nutrition_carb: data.nutritionCarb ? parseFloat(data.nutritionCarb) : undefined,
          nutrition_sodium: data.nutritionSodium ? parseFloat(data.nutritionSodium) : undefined,
          product_type: data.productType,
          processing_method: data.processingMethod,
          standard_code: data.productStandard,
          storage_method: data.storageConditions,
          consumption_method: data.consumptionMethod,
          label_allergens: Array.isArray(data.allergens) ? data.allergens.join('、') : data.allergens,
          consumer_notice: data.consumerNotice,
        },
      });
    }

    if (stepNumber === 6 && instance.productId && Array.isArray(data.recipeLines) && data.recipeLines.length > 0) {
      const recipe = await tx.recipe.create({
        data: { company_id: '1', product_id: instance.productId, version: 1, version_note: '研发首版', status: 'draft' },
      });
      await tx.recipeLine.createMany({
        data: data.recipeLines
          .filter((l: any) => l.materialId)
          .map((l: any) => ({
            recipe_id: recipe.id,
            material_id: l.materialId,
            qty_per_batch: parseFloat(l.qtyPerBatch) || 0,
            unit: l.unit || 'kg',
            is_critical: l.isCritical ?? false,
            notes: l.notes ?? '',
          })),
      });
    }

    if (isLast && instance.productId) {
      await tx.product.update({ where: { id: instance.productId }, data: { status: 'active' } });
    }

    await tx.processStepData.update({
      where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
      data: { status: 'APPROVED', approvedById: approverId, approvedAt: new Date() },
    });
    await tx.processInstance.update({ where: { id: instance.id }, data: instanceUpdate });
  }

  async listApprovals(instanceId: string, stepNumber?: number) {
    return this.prisma.processStepApproval.findMany({
      where: { instanceId, ...(stepNumber ? { stepNumber } : {}) },
      include: { approver: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listPendingForUser(approverId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: approverId },
      include: { department: true, roleObj: true },
    });
    if (!user) return [];

    return this.prisma.processStepApproval.findMany({
      where: { status: 'PENDING' },
      include: {
        instance: { select: { id: true, productName: true, currentStep: true, template: true } },
      },
      orderBy: { createdAt: 'desc' },
    }).then((rows) => rows.filter((row) => {
      const steps = (row.instance.template.steps as any[]) ?? [];
      const stepConfig = steps.find((s: any) => s.stepNumber === row.stepNumber);
      const allowed = this.resolveAllowedRoles(user, stepConfig?.requiredApprovals ?? []);
      return allowed.has(row.role);
    }));
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd server && npx jest process-step-approval.service.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: 注册到 ProcessModule**

编辑 `server/src/modules/process/process.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ProcessInstanceController } from './process-instance.controller';
import { ProcessTemplateController } from './process-template.controller';
import { ProcessStepApprovalService } from './process-step-approval.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProcessInstanceController, ProcessTemplateController],
  providers: [ProcessStepApprovalService],
  exports: [ProcessStepApprovalService],
})
export class ProcessModule {}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/process/
git commit -m "feat: ProcessStepApprovalService，多人会签逻辑"
```

---

## Task 4: 后端 — Approval API 端点 + 修改 submitStep

**Files:**
- Modify: `server/src/modules/process/process-instance.controller.ts`

- [ ] **Step 1: 在 controller 顶部补充 import**

将文件头部 import 替换为：

```typescript
import {
  Controller, Get, Post, Delete, Body, Param, Request,
  NotFoundException, BadRequestException, UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProcessStepApprovalService } from './process-step-approval.service';
```

- [ ] **Step 2: 修改 constructor，注入 ApprovalService**

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly approvalService: ProcessStepApprovalService,
) {}
```

- [ ] **Step 3: 修改 submitStep，去掉自动推进（Step3 例外）**

将 `submitStep` 方法中 `if (!saveAsDraft) { ... }` 块替换为。注意：Step1 不在提交时创建 Product；Product 必须在 Step1 审批全通过后由 `ProcessStepApprovalService.applyApprovedStepEffects()` 在同一个 transaction 中创建。

```typescript
    if (!saveAsDraft) {
      const actualStepNumber = stepNumber || instance.currentStep;
      const template = await this.prisma.processTemplate.findUnique({
        where: { id: instance.templateId },
      });
      const steps = (template?.steps as any[]) ?? [];
      const stepConfig = steps.find((s: any) => s.stepNumber === actualStepNumber);
      if (!stepConfig) throw new BadRequestException('步骤配置不存在');

      const requiredApprovals = stepConfig.requiredApprovals ?? [];
      if (requiredApprovals.length > 0) {
        await this.approvalService.ensureApprovalSlots(id, actualStepNumber, requiredApprovals);
      } else {
        // Step3 无需审批人，只有 trialConclusion==='通过' 才自动批准并推进
        const isStep3Pass = actualStepNumber === 3 && (data as any)?.trialConclusion === '通过';
        if (!isStep3Pass) {
          throw new BadRequestException('无审批步骤必须满足通过条件后才能提交');
        }

        const maxStep = steps.length;
        const nextStep = actualStepNumber + 1;
        await this.prisma.$transaction([
          this.prisma.processStepData.update({
            where: { instanceId_stepNumber: { instanceId: id, stepNumber: actualStepNumber } },
            data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
          }),
          this.prisma.processInstance.update({
            where: { id },
            data: {
              currentStep: nextStep > maxStep ? maxStep : nextStep,
              status: 'IN_PROGRESS',
            },
          }),
        ]);
      }
    }
```

同时把 `upsert` 的返回值保留下来，便于后续需要返回当前步骤数据：

```typescript
    const savedStepData = await this.prisma.processStepData.upsert({
      where: {
        instanceId_stepNumber: {
          instanceId: id,
          stepNumber: stepNumber || instance.currentStep,
        },
      },
      update: {
        data: data || {},
        status: saveAsDraft ? 'PENDING' : 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
      },
      create: {
        instanceId: id,
        stepNumber: stepNumber || instance.currentStep,
        data: data || {},
        status: saveAsDraft ? 'PENDING' : 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
      },
    });
```

方法末尾返回：

```typescript
    return { code: 0, data: savedStepData, message: 'success' };
```

- [ ] **Step 4: 新增 3 个 approval 端点**（在 `@Delete(':id')` 之前插入）

```typescript
  @Post(':id/steps/:stepNumber/approvals')
  @ApiOperation({ summary: '提交会签' })
  async submitApproval(
    @Param('id') id: string,
    @Param('stepNumber') stepNumber: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const { action, comment = '', role: requestedRole } = body;
    const result = await this.approvalService.submitApproval(
      id, parseInt(stepNumber), userId, action, comment, requestedRole,
    );
    return { code: 0, data: result, message: 'success' };
  }

  @Get(':id/approvals')
  @ApiOperation({ summary: '查询步骤会签记录' })
  async getApprovals(
    @Param('id') id: string,
    @Query('stepNumber') stepNumber?: string,
  ) {
    const approvals = await this.approvalService.listApprovals(
      id, stepNumber ? parseInt(stepNumber) : undefined,
    );
    return { code: 0, data: approvals, message: 'success' };
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: '查我的待签任务' })
  async getPendingApprovals(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const list = await this.approvalService.listPendingForUser(userId);
    return { code: 0, data: list, message: 'success' };
  }
```

- [ ] **Step 5: 确认副作用只在审批事务中执行**

检查 `process-instance.controller.ts` 中没有任何 Step1 提交即创建 Product 的逻辑；Step1 Product 创建、Step5 营养字段同步、Step6 Recipe 写入、Step7 Product 激活均只存在于 `ProcessStepApprovalService.applyApprovedStepEffects()`，并由 `submitApproval()` 的 `prisma.$transaction` 调用。

- [ ] **Step 6: 编译验证**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: 无 TypeScript 编译错误

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/process/
git commit -m "feat: Approval API端点，Step1/5/6副作用（Product创建、营养成分同步、Recipe写入）"
```

---

## Task 5: 前端 — 更新 process.ts API 类型

**Files:**
- Modify: `client/src/api/process.ts`

- [ ] **Step 1: 完整替换 `client/src/api/process.ts`**

```typescript
import request from './request';

export interface ProcessInstance {
  id: string;
  templateId: string;
  productName: string;
  productId?: string;
  currentStep: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
  stepData?: ProcessStepData[];
}

export interface ProcessStepData {
  id: string;
  instanceId: string;
  stepNumber: number;
  data: Record<string, unknown>;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedById?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  approvalComment?: string;
}

export interface ProcessStepApproval {
  id: string;
  instanceId: string;
  stepNumber: number;
  approverId?: string;
  approver?: { id: string; name: string };
  department: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  signedAt?: string;
}

export interface RawMaterial {
  id: string;
  materialCode: string;
  name: string;
  ingredientInfo?: string;
  qtyPerBatch?: number;
  unit?: string;
}

export interface RecipeLine {
  materialId: string;
  materialCode: string;
  materialName: string;
  qtyPerBatch: number;
  unit: string;
  isCritical?: boolean;
  notes?: string;
}

export const processApi = {
  getDefaultTemplate: () =>
    request.get<{ id: string; name: string; steps: unknown[] }>('/process/templates/default'),

  listInstances: () =>
    request.get<ProcessInstance[]>('/process/instances'),

  getInstance: (id: string) =>
    request.get<ProcessInstance>(`/process/instances/${id}`),

  createInstance: (templateId: string, productName?: string) =>
    request.post<ProcessInstance>('/process/instances', { templateId, productName }),

  deleteInstance: (id: string) =>
    request.delete(`/process/instances/${id}`),

  submitStep: (instanceId: string, payload: { stepNumber: number; data: Record<string, unknown>; saveAsDraft?: boolean }) =>
    request.post(`/process/instances/${instanceId}/steps`, payload),

  // 多人会签
  submitApproval: (instanceId: string, stepNumber: number, payload: { action: 'approve' | 'reject'; comment?: string; role?: string }) =>
    request.post(`/process/instances/${instanceId}/steps/${stepNumber}/approvals`, payload),

  getApprovals: (instanceId: string, stepNumber?: number) =>
    request.get<ProcessStepApproval[]>(`/process/instances/${instanceId}/approvals`, { params: stepNumber ? { stepNumber } : {} }),

  getPendingApprovals: () =>
    request.get<ProcessStepApproval[]>('/process/instances/approvals/pending'),
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/process.ts
git commit -m "feat: process.ts 更新API类型，新增多人会签方法"
```

---

## Task 6: 前端 — DeptSignoffPanel 组件

**Files:**
- Create: `client/src/components/process/DeptSignoffPanel.vue`

- [ ] **Step 1: 创建组件**

```vue
<template>
  <div class="signoff-panel">
    <el-table :data="approvalList" border size="small">
      <el-table-column label="部门" prop="department" width="120" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">{{ roleText(row.role) }}</template>
      </el-table-column>
      <el-table-column label="签署人" width="120">
        <template #default="{ row }">
          {{ row.approver?.name ?? (row.status === 'PENDING' ? '待签署' : '-') }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="意见" prop="comment" min-width="160" />
      <el-table-column label="时间" width="120">
        <template #default="{ row }">{{ row.signedAt ? row.signedAt.slice(0, 10) : '-' }}</template>
      </el-table-column>
      <el-table-column v-if="!disabled" label="操作" width="150">
        <template #default="{ row }">
          <div v-if="row.status === 'PENDING'" class="row-actions">
            <el-button link type="success" @click="handleSign(row.role, 'approve')">同意</el-button>
            <el-button link type="danger" @click="handleSign(row.role, 'reject')">驳回</el-button>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!disabled" class="sign-action">
      <el-input v-model="comment" placeholder="审批意见（可选）" style="width: 300px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { processApi, type ProcessStepApproval } from '@/api/process';

const props = defineProps<{
  instanceId: string;
  stepNumber: number;
  disabled?: boolean;   // 步骤已锁定（APPROVED/REJECTED）
}>();

const emit = defineEmits<{ (e: 'signed'): void }>();

const approvalList = ref<ProcessStepApproval[]>([]);
const comment = ref('');

const statusType = (s: string) => ({ APPROVED: 'success', REJECTED: 'danger', PENDING: 'info' }[s] ?? 'info');
const statusText = (s: string) => ({ APPROVED: '已同意', REJECTED: '已驳回', PENDING: '待签署' }[s] ?? s);
const roleText = (r: string) => ({
  gm: '总经理',
  manager: '研发经理',
  quality: '品质部',
  manufacture: '制造部',
  purchase: '采购部',
  development: '产品开发部',
  food_safety_leader: '食品安全组长',
}[r] ?? r);

const load = async () => {
  const res = await processApi.getApprovals(props.instanceId, props.stepNumber);
  approvalList.value = Array.isArray(res) ? res : (res as any).data ?? [];
};

const handleSign = async (role: string, action: 'approve' | 'reject') => {
  try {
    await processApi.submitApproval(props.instanceId, props.stepNumber, {
      action,
      comment: comment.value,
      role,
    });
    await load();
    emit('signed');
    ElMessage.success(action === 'approve' ? '已同意' : '已驳回');
  } catch {
    ElMessage.error('签署失败');
  }
};

onMounted(load);
</script>

<style scoped>
.signoff-panel { margin-top: 12px; }
.sign-action { display: flex; align-items: center; margin-top: 12px; gap: 8px; }
.row-actions { display: flex; gap: 8px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/process/DeptSignoffPanel.vue
git commit -m "feat: DeptSignoffPanel 多人会签面板组件"
```

---

## Task 7: 前端 — RecipeLineEditor 组件

**Files:**
- Create: `client/src/components/process/RecipeLineEditor.vue`

- [ ] **Step 1: 创建组件**

```vue
<template>
  <div>
    <el-table :data="lines" border size="small" style="width:100%">
      <el-table-column type="index" label="序号" width="55" />
      <el-table-column label="物料编码" prop="materialCode" width="130" />
      <el-table-column label="物料名称" prop="materialName" min-width="160" />
      <el-table-column label="用量(kg/批)" width="130">
        <template #default="{ row }">
          <el-input-number v-if="!disabled" v-model="row.qtyPerBatch" :min="0" :precision="3" controls-position="right" size="small" style="width:110px" />
          <span v-else>{{ row.qtyPerBatch }}</span>
        </template>
      </el-table-column>
      <el-table-column label="单位" width="90">
        <template #default="{ row }">
          <el-select v-if="!disabled" v-model="row.unit" size="small" style="width:70px">
            <el-option v-for="u in units" :key="u" :label="u" :value="u" />
          </el-select>
          <span v-else>{{ row.unit }}</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="120">
        <template #default="{ row }">
          <el-input v-if="!disabled" v-model="row.notes" size="small" />
          <span v-else>{{ row.notes }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="!disabled" label="操作" width="70">
        <template #default="{ $index }">
          <el-button link type="danger" @click="removeLine($index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-button v-if="!disabled" type="primary" plain style="margin-top:10px" @click="openPicker">
      + 选择物料
    </el-button>

    <!-- 物料选择弹窗（复用 Step2 逻辑） -->
    <el-dialog v-model="pickerVisible" title="选择物料" width="700px" :close-on-click-modal="false">
      <div style="display:flex; gap:16px; margin-bottom:12px">
        <el-input v-model="filterKw" placeholder="搜索物料名称或编码" clearable style="width:240px" />
      </div>
      <div style="max-height:400px; overflow-y:auto">
        <div v-for="group in filteredGroups" :key="group.category" style="margin-bottom:12px">
          <div style="font-weight:600; padding:6px 12px; background:var(--el-fill-color-light)">{{ group.category }}</div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr)">
            <div v-for="item in group.items" :key="item.id" style="padding:8px 12px; border-top:1px solid var(--el-border-color-lighter)">
              <el-checkbox
                :model-value="isAdded(item.id)"
                @change="(v: boolean) => toggleItem(item, v)"
              >{{ item.materialCode }} {{ item.name }}</el-checkbox>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import request from '@/api/request';
import type { RecipeLine } from '@/api/process';

const props = defineProps<{
  modelValue: RecipeLine[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: RecipeLine[]): void }>();

const lines = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const units = ['kg', 'g', 'L', 'mL', '个', '包'];
const pickerVisible = ref(false);
const filterKw = ref('');
const allGroups = ref<{ category: string; items: any[] }[]>([]);

const filteredGroups = computed(() => {
  const kw = filterKw.value.toLowerCase();
  if (!kw) return allGroups.value;
  return allGroups.value
    .map(g => ({ ...g, items: g.items.filter((i: any) => i.name.includes(kw) || i.materialCode.toLowerCase().includes(kw)) }))
    .filter(g => g.items.length > 0);
});

const isAdded = (id: string) => lines.value.some(l => l.materialId === id);

const toggleItem = (item: any, checked: boolean) => {
  if (checked && !isAdded(item.id)) {
    emit('update:modelValue', [...lines.value, {
      materialId: item.id,
      materialCode: item.materialCode,
      materialName: item.name,
      qtyPerBatch: 0,
      unit: 'kg',
    }]);
  } else if (!checked) {
    emit('update:modelValue', lines.value.filter(l => l.materialId !== item.id));
  }
};

const removeLine = (index: number) => {
  emit('update:modelValue', lines.value.filter((_, i) => i !== index));
};

const openPicker = async () => {
  pickerVisible.value = true;
  if (allGroups.value.length > 0) return;
  try {
    const res = await request.get<{ data: any[] }>('/warehouse/materials', { params: { limit: 200, status: 'active' } });
    const map = new Map<string, { category: string; items: any[] }>();
    for (const m of (res.data ?? [])) {
      const cat = m.category?.name ?? '其他';
      if (!map.has(cat)) map.set(cat, { category: cat, items: [] });
      map.get(cat)!.items.push(m);
    }
    allGroups.value = Array.from(map.values());
  } catch { ElMessage.error('加载物料失败'); }
};
</script>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/process/RecipeLineEditor.vue
git commit -m "feat: RecipeLineEditor 配料行编辑器组件"
```

---

## Task 8: 前端 — ProcessDetail.vue 更新（7步 + 锁定逻辑）

**Files:**
- Modify: `client/src/views/process/ProcessDetail.vue`

- [ ] **Step 1: 将 STEPS 常量替换为7步**

找到 `const STEPS = [...]`，替换为：

```typescript
const STEPS = [
  { number: 1, title: '新产品开发申请书' },
  { number: 2, title: '新产品开发计划书' },
  { number: 3, title: '研发试验记录' },
  { number: 4, title: '产品开发评审' },
  { number: 5, title: '产品标签信息记录' },
  { number: 6, title: '产品操作规程' },
  { number: 7, title: '产品验证记录' },
];
```

- [ ] **Step 2: 将 stepComponents 替换为7个**

```typescript
const stepComponents = [
  defineAsyncComponent(() => import('./Step1.vue')),
  defineAsyncComponent(() => import('./Step2.vue')),
  defineAsyncComponent(() => import('./Step3.vue')),
  defineAsyncComponent(() => import('./Step4.vue')),
  defineAsyncComponent(() => import('./Step5.vue')),
  defineAsyncComponent(() => import('./Step6.vue')),
  defineAsyncComponent(() => import('./Step7.vue')),
];
```

- [ ] **Step 3: 修复 isStepDisabled 加 APPROVED 锁定**

将 `isStepDisabled` computed 替换为：

```typescript
const isStepDisabled = computed(() => {
  if (!instance.value) return true;
  if (viewStep.value > instance.value.currentStep) return true;
  const status = getStepStatus(viewStep.value);
  return status === 'APPROVED';
});
```

- [ ] **Step 4: 修复 loadInstance 读取后端真实字段名**

当前后端 `include: { stepData: true }` 返回字段名是 `stepData`，不要继续读旧的 `stepDataList`：

```typescript
const loadInstance = async () => {
  loading.value = true;
  try {
    const res = await processApi.getInstance(instanceId);
    instance.value = res;
    stepDataList.value = res.stepData ?? [];
    viewStep.value = res.currentStep ?? 1;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};
```

- [ ] **Step 5: 修复上一步/下一步按钮的 disabled 判断**

```html
<el-button :disabled="viewStep <= 1" @click="viewStep--">上一步</el-button>
<el-button :disabled="viewStep >= 7" @click="viewStep++">下一步</el-button>
```

- [ ] **Step 6: 在 handleApprove/handleReject 里改用新 API**

将 `handleApprove` 和 `handleReject` 方法替换为空（这两个方法移到各 Step 组件内通过 `DeptSignoffPanel` 处理），或直接删除。在各 Step 组件的 `@signed` 事件里调用 `loadInstance()`。

在 component 绑定中删除 `@approve` 和 `@reject`，新增 `@signed`：

```html
<component
  :is="currentStepComponent"
  :instance-id="instanceId"
  :model-value="allStepsData[viewStep]"
  :all-steps-data="allStepsData"
  :disabled="isStepDisabled"
  :step-status="getStepStatus(viewStep)"
  @saved="(data: Record<string, unknown>) => handleSave(data)"
  @submitted="(data: Record<string, unknown>) => handleSubmit(data)"
  @signed="loadInstance"
/>
```

- [ ] **Step 7: Commit**

```bash
git add client/src/views/process/ProcessDetail.vue
git commit -m "feat: ProcessDetail.vue 更新为7步，APPROVED步骤锁定，新签署事件"
```

---

## Task 9: 前端 — Step1.vue 重写（JL-09 新产品开发申请书）

**Files:**
- Modify: `client/src/views/process/Step1.vue`

- [ ] **Step 1: 完整替换 Step1.vue**

```vue
<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="180px" :disabled="disabled">
      <el-divider>新产品开发申请书（JL-09）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="申请部门">
          <el-input :model-value="'产品开发部'" disabled />
        </el-form-item>
        <el-form-item label="申请日期">
          <el-input :model-value="form.requestDate" disabled />
        </el-form-item>
        <el-form-item label="开发产品名称" prop="productName" :rules="[{ required: true, message: '请填写产品名称' }]">
          <el-input v-model="form.productName" placeholder="如：海盐芝士味蛋糕" />
        </el-form-item>
        <el-form-item label="开发数量">
          <el-input v-model="form.developmentQuantity" placeholder="如：50kg/批" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品要求</span></template>
        <el-form-item label="工艺要求" prop="processRequirement" :rules="[{ required: true, message: '请填写工艺要求' }]">
          <el-input v-model="form.processRequirement" type="textarea" :rows="2" placeholder="如：戚风分蛋工艺" />
        </el-form-item>
        <el-form-item label="产品特性">
          <el-input v-model="form.productCharacteristics" type="textarea" :rows="2" placeholder="口感、外观、风味特征" />
        </el-form-item>
        <el-form-item label="包装要求">
          <el-input v-model="form.packagingRequirement" placeholder="默认：充氮包装" />
        </el-form-item>
        <el-form-item label="法律法规要求">
          <el-input v-model="form.regulatoryRequirement" placeholder="默认：GB7099-2015" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">食品安全</span></template>
        <el-form-item label="引入的食品安全危害">
          <el-input v-model="form.identifiedHazards" type="textarea" :rows="3"
            placeholder="含过敏原：鸡蛋、小麦、乳制品；微生物：沙门氏菌风险（通过烘烤CCP控制）" />
        </el-form-item>
        <el-form-item label="可行性分析">
          <el-input v-model="form.feasibilityAnalysis" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="结论">
          <el-input v-model="form.applicationConclusion" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 总经理</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="1"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获总经理批准</el-text>
        <el-text v-else type="info" size="small">提交后等待总经理审批</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="handleSave">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交申请</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const formRef = ref<FormInstance>();

const form = reactive({
  requestDate: dayjs().format('YYYY-MM-DD'),
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

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as typeof form;
    Object.keys(form).forEach((k) => {
      if (mv[k as keyof typeof form] !== undefined) {
        (form as any)[k] = mv[k as keyof typeof form];
      }
    });
  }
});

const handleSave = () => emit('saved', { ...form });

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  if (!form.productName.trim()) {
    ElMessage.warning('请填写开发产品名称');
    return;
  }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step1.vue
git commit -m "feat: Step1 重写为新产品开发申请书(JL-09)"
```

---

## Task 10: 前端 — Step2.vue 重写（JL-10 新产品开发计划书）

**Files:**
- Modify: `client/src/views/process/Step2.vue`

- [ ] **Step 1: 完整替换 Step2.vue**

```vue
<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="180px" :disabled="disabled">
      <el-divider>新产品开发计划书（JL-10）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="产品名称">
          <el-input :model-value="productNameFromStep1" disabled />
        </el-form-item>
        <el-form-item label="包装要求">
          <el-input v-model="form.packagingRequirement" />
        </el-form-item>
        <el-form-item label="工艺要求">
          <el-input v-model="form.processRequirement" />
        </el-form-item>
        <el-form-item label="产品特性">
          <el-input v-model="form.productCharacteristics" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">法律法规要求</span></template>
        <el-form-item label="国家标准"><el-input v-model="form.nationalStandard" /></el-form-item>
        <el-form-item label="行业标准"><el-input v-model="form.industryStandard" /></el-form-item>
        <el-form-item label="企业标准"><el-input v-model="form.enterpriseStandard" /></el-form-item>
        <el-form-item label="引入的食品安全危害">
          <el-input v-model="form.identifiedHazards" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">各部门输入意见</span></template>
        <el-form-item label="产品开发部"><el-input v-model="form.inputOpinionDev" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="品质部"><el-input v-model="form.inputOpinionQuality" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="采购部"><el-input v-model="form.inputOpinionPurchase" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="制造部"><el-input v-model="form.inputOpinionManufacture" type="textarea" :rows="2" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">原料清单（用于后续步骤预填）</span></template>
        <el-table :data="form.rawMaterials" border size="small" style="width:100%">
          <el-table-column type="index" label="序号" width="55" />
          <el-table-column label="物料编码" prop="materialCode" width="130" />
          <el-table-column label="物料名称" prop="name" min-width="160" />
          <el-table-column label="配料说明" prop="ingredientInfo" min-width="160">
            <template #default="{ row }">
              <el-input v-if="!disabled" v-model="row.ingredientInfo" size="small" placeholder="用途/规格备注" />
              <span v-else>{{ row.ingredientInfo }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="!disabled" label="操作" width="70">
            <template #default="{ $index }">
              <el-button link type="danger" @click="removeRaw($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-button v-if="!disabled" type="primary" plain style="margin-top:10px" @click="openPicker">+ 选择物料</el-button>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 研发经理</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="2"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获研发经理批准</el-text>
        <el-text v-else type="info" size="small">提交后等待研发经理审批</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>

    <!-- 物料选择弹窗（与原Step2相同逻辑） -->
    <el-dialog v-model="pickerVisible" title="选择物料" width="700px" :close-on-click-modal="false">
      <el-input v-model="filterKw" placeholder="搜索物料" clearable style="width:240px; margin-bottom:12px" />
      <div style="max-height:400px; overflow-y:auto">
        <div v-for="group in filteredGroups" :key="group.category" style="margin-bottom:8px; border:1px solid var(--el-border-color-light); border-radius:6px; overflow:hidden">
          <div style="background:var(--el-fill-color-light); padding:6px 12px; font-weight:600">{{ group.category }}</div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr)">
            <div v-for="item in group.items" :key="item.id" style="padding:8px 12px; border-top:1px solid var(--el-border-color-lighter)">
              <el-checkbox :model-value="isAdded(item.id) || isTempSelected(item.id)" :disabled="isAdded(item.id)" @change="(v: any) => toggleTemp(item, v)">
                <span style="font-size:12px; color:var(--el-text-color-secondary)">{{ item.materialCode }}</span>
                {{ item.name }}
              </el-checkbox>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker">确认添加（{{ tempSelected.length }}）</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import request from '@/api/request';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const formRef = ref<FormInstance>();

interface RawMat { id: string; materialCode: string; name: string; ingredientInfo: string }

const form = reactive({
  packagingRequirement: '充氮包装',
  processRequirement: '',
  productCharacteristics: '',
  nationalStandard: 'GB7099-2015',
  industryStandard: 'GB7099-2015',
  enterpriseStandard: 'GB7099-2015',
  identifiedHazards: '',
  inputOpinionDev: '',
  inputOpinionQuality: '',
  inputOpinionPurchase: '',
  inputOpinionManufacture: '',
  rawMaterials: [] as RawMat[],
});

const productNameFromStep1 = computed(() => {
  const s1 = props.allStepsData?.[1] as any;
  return s1?.productName ?? '-';
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach((k) => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const getFormData = () => ({ ...form, rawMaterials: form.rawMaterials.map(r => ({ ...r })) });

const handleSubmit = async () => {
  if (form.rawMaterials.length === 0) { ElMessage.warning('请至少选择一种原料'); return; }
  emit('submitted', getFormData());
};

const removeRaw = (i: number) => { form.rawMaterials = form.rawMaterials.filter((_, idx) => idx !== i); };
const isAdded = (id: string) => form.rawMaterials.some(r => r.id === id);

// Picker
const pickerVisible = ref(false);
const filterKw = ref('');
const allGroups = ref<{ category: string; items: any[] }[]>([]);
const tempSelected = ref<any[]>([]);

const filteredGroups = computed(() => {
  const kw = filterKw.value.toLowerCase();
  if (!kw) return allGroups.value;
  return allGroups.value.map(g => ({ ...g, items: g.items.filter((i: any) => i.name.includes(kw) || i.materialCode.toLowerCase().includes(kw)) })).filter(g => g.items.length > 0);
});

const isTempSelected = (id: string) => tempSelected.value.some(t => t.id === id);
const toggleTemp = (item: any, checked: boolean) => {
  if (checked) { if (!isTempSelected(item.id)) tempSelected.value = [...tempSelected.value, item]; }
  else { tempSelected.value = tempSelected.value.filter(t => t.id !== item.id); }
};

const openPicker = async () => {
  pickerVisible.value = true;
  tempSelected.value = [];
  if (allGroups.value.length > 0) return;
  try {
    const res = await request.get<{ data: any[] }>('/warehouse/materials', { params: { limit: 200, status: 'active' } });
    const map = new Map<string, { category: string; items: any[] }>();
    for (const m of (res.data ?? [])) {
      const cat = m.category?.name ?? '其他';
      if (!map.has(cat)) map.set(cat, { category: cat, items: [] });
      map.get(cat)!.items.push(m);
    }
    allGroups.value = Array.from(map.values());
  } catch { ElMessage.error('加载物料失败'); }
};

const confirmPicker = () => {
  for (const item of tempSelected.value) {
    if (!isAdded(item.id)) form.rawMaterials.push({ id: item.id, materialCode: item.materialCode, name: item.name, ingredientInfo: '' });
  }
  pickerVisible.value = false;
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step2.vue
git commit -m "feat: Step2 重写为新产品开发计划书(JL-10)"
```

---

## Task 11: 前端 — Step3.vue 重写（JL-11 研发试验记录）

**Files:**
- Modify: `client/src/views/process/Step3.vue`

- [ ] **Step 1: 完整替换 Step3.vue**

```vue
<template>
  <div class="step-view">
    <el-form ref="formRef" :model="form" label-width="160px" :disabled="disabled">
      <el-divider>研发试验记录（JL-11）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">区块一：新产品制作实验</span></template>
        <el-form-item label="产品名称">
          <el-input :model-value="productName" disabled />
        </el-form-item>
        <el-form-item label="试验日期" prop="experimentDate">
          <el-date-picker v-model="form.experimentDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="实验目的">
          <el-input v-model="form.experimentPurpose" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="实验材料（配料）">
          <el-table :data="form.experimentMaterials" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="55" />
            <el-table-column label="物料名称" prop="name" min-width="160" />
            <el-table-column label="用量" width="120">
              <template #default="{ row }">
                <el-input v-if="!disabled" v-model="row.qty" size="small" placeholder="如100g" />
                <span v-else>{{ row.qty }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item label="配方及工艺">
          <el-input v-model="form.formulaAndProcess" type="textarea" :rows="4" placeholder="描述配方比例和制作工艺步骤" />
        </el-form-item>
        <el-form-item label="实验参数">
          <el-input v-model="form.experimentParameters" type="textarea" :rows="3" placeholder="温度、时间、转速等关键参数" />
        </el-form-item>
        <el-form-item label="生产记录">
          <el-radio-group v-model="form.productionStatus">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="异常">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.productionStatus === '异常'" label="异常说明">
          <el-input v-model="form.productionAbnormalNote" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="样品记录">
          <el-radio-group v-model="form.sampleStatus">
            <el-radio value="正常">正常</el-radio>
            <el-radio value="异常">异常</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.sampleStatus === '异常'" label="样品异常说明">
          <el-input v-model="form.sampleAbnormalNote" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">区块二：保质期实验</span></template>
        <el-form-item label="保质期试验日期">
          <el-date-picker v-model="form.shelfLifeDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="实验目的">
          <el-input v-model="form.shelfLifePurpose" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="储存条件">
          <el-select v-model="form.storageCondition">
            <el-option value="常温库（25°C）" label="常温库（25°C）" />
            <el-option value="阴凉库（≤20°C）" label="阴凉库（≤20°C）" />
            <el-option value="高温高湿加速" label="高温高湿加速" />
          </el-select>
        </el-form-item>
        <el-form-item label="检测结果">
          <el-radio-group v-model="form.inspectionResult">
            <el-radio value="符合">符合</el-radio>
            <el-radio value="不符合">不符合</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="数据分析">
          <el-input v-model="form.dataAnalysis" type="textarea" :rows="3" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">结论</span></template>
        <el-form-item label="结论与建议" prop="trialConclusion" :rules="[{ required: true, message: '请填写结论' }]">
          <el-radio-group v-model="form.trialConclusion">
            <el-radio value="通过">通过（可进入下一阶段）</el-radio>
            <el-radio value="需改进">需改进（重新试验）</el-radio>
            <el-radio value="终止">终止项目</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="改进说明" v-if="form.trialConclusion !== '通过'">
          <el-input v-model="form.conclusionNote" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus';
import { ref } from 'vue';
import dayjs from 'dayjs';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
}>();

const formRef = ref<InstanceType<typeof import('element-plus')['ElForm']>>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const rawMatsFromStep2 = computed(() => {
  const s2 = props.allStepsData?.[2] as any;
  return (s2?.rawMaterials ?? []).map((m: any) => ({ name: m.name, qty: '' }));
});

const form = reactive({
  experimentDate: dayjs().format('YYYY-MM-DD'),
  experimentPurpose: '',
  experimentMaterials: [] as { name: string; qty: string }[],
  formulaAndProcess: '',
  experimentParameters: '',
  productionStatus: '正常',
  productionAbnormalNote: '',
  sampleStatus: '正常',
  sampleAbnormalNote: '',
  shelfLifeDate: '',
  shelfLifePurpose: '',
  storageCondition: '常温库（25°C）',
  inspectionResult: '符合',
  dataAnalysis: '',
  trialConclusion: '',
  conclusionNote: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
  // 从Step2预填原料名称（只在首次加载且没有保存数据时）
  if (form.experimentMaterials.length === 0 && rawMatsFromStep2.value.length > 0) {
    form.experimentMaterials = rawMatsFromStep2.value;
  }
});

const getFormData = () => ({ ...form, experimentMaterials: form.experimentMaterials.map(m => ({ ...m })) });

const handleSubmit = async () => {
  if (!form.trialConclusion) { ElMessage.warning('请选择试验结论'); return; }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step3.vue
git commit -m "feat: Step3 重写为研发试验记录(JL-11)"
```

---

## Task 12: 前端 — Step4.vue 重写（JL-01 产品开发评审）

**Files:**
- Modify: `client/src/views/process/Step4.vue`

- [ ] **Step 1: 完整替换 Step4.vue**

```vue
<template>
  <div class="step-view">
    <el-form :model="form" label-width="320px" :disabled="disabled">
      <el-divider>产品开发评审（JL-01）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="项目负责人"><el-input v-model="form.projectManager" /></el-form-item>
        <el-form-item label="评审日期">
          <el-date-picker v-model="form.reviewDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="评审阶段">
          <el-radio-group v-model="form.reviewStage">
            <el-radio value="小试评审">小试评审</el-radio>
            <el-radio value="中试评审">中试评审</el-radio>
            <el-radio value="输出评审">输出评审</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（一）</span></template>
        <el-form-item v-for="item in reviewItems1" :key="item.key" :label="item.label">
          <el-radio-group v-model="(form as any)[item.key]">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审项目（二）关键工序</span></template>
        <el-form-item v-for="item in reviewItems2" :key="item.key" :label="item.label">
          <el-radio-group v-model="(form as any)[item.key]">
            <el-radio value="是">是</el-radio><el-radio value="否">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">评审意见及结论</span></template>
        <el-form-item label="评审意见及结论">
          <el-input v-model="form.reviewOpinionConclusion" type="textarea" :rows="4" placeholder="须含量产结论与建议" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">5部门会签</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="4"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">5部门会签完成</el-text>
        <el-text v-else type="info" size="small">提交后由5部门依次签署</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交评审</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const reviewItems1 = [
  { key: 'procurementFeasibility', label: '原辅料采购的可行性' },
  { key: 'standardCompliance', label: '产品标准的符合性' },
  { key: 'batchStability', label: '产品批产性能的稳定性' },
  { key: 'productCharacteristics', label: '产品特性' },
  { key: 'inspectionTraceability', label: '产品检测/试验记录的完整性和可追溯性' },
  { key: 'reVerificationCompliance', label: '产品符合性' },
  { key: 'allergenControl', label: '产品过敏原的识别和控制' },
];

const reviewItems2 = [
  { key: 'processDocTraceability', label: '产品制作、生产规范及工艺文件的完整性与可追溯性' },
  { key: 'processMonitorTraceability', label: '过程监控记录的完整性和可追溯性' },
  { key: 'batchProductionCapacity', label: '批量生产能力和质量保证能力评价' },
  { key: 'designChangeEffectiveness', label: '设计更改、让步使用、器材代用有效性检查' },
  { key: 'trialQualityIssueEvaluation', label: '试制/试验过程中质量问题分析处理情况评价' },
];

const form = reactive({
  projectManager: '',
  reviewDate: dayjs().format('YYYY-MM-DD'),
  reviewStage: '小试评审',
  procurementFeasibility: '是', standardCompliance: '是', batchStability: '是',
  productCharacteristics: '是', inspectionTraceability: '是', reVerificationCompliance: '是',
  allergenControl: '是', processDocTraceability: '是', processMonitorTraceability: '是',
  batchProductionCapacity: '是', designChangeEffectiveness: '是', trialQualityIssueEvaluation: '是',
  reviewOpinionConclusion: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.reviewOpinionConclusion.trim()) { ElMessage.warning('请填写评审意见及结论'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step4.vue
git commit -m "feat: Step4 重写为产品开发评审(JL-01)，5部门会签"
```

---

## Task 13: 前端 — Step5.vue 重写（JL-04 产品标签信息记录）

**Files:**
- Modify: `client/src/views/process/Step5.vue`

- [ ] **Step 1: 完整替换 Step5.vue**

```vue
<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品标签信息记录（JL-04）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品基本信息</span></template>
        <el-form-item label="品名"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.recordDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="保质期（天）">
          <el-input-number v-model="form.shelfLifeDays" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="产品类型"><el-input v-model="form.productType" placeholder="烘烤类糕点" /></el-form-item>
        <el-form-item label="加工方式"><el-input v-model="form.processingMethod" placeholder="热加工" /></el-form-item>
        <el-form-item label="产品标准代号"><el-input v-model="form.productStandard" placeholder="GB 7099" /></el-form-item>
        <el-form-item label="储藏方法"><el-input v-model="form.storageConditions" placeholder="阴凉干燥处" /></el-form-item>
        <el-form-item label="食用方法"><el-input v-model="form.consumptionMethod" placeholder="开袋即食" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">营养成分表（/100g）</span></template>
        <el-form-item label="能量（kJ/100g）">
          <el-input-number v-model="form.nutritionEnergy" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="蛋白质（g/100g）">
          <el-input-number v-model="form.nutritionProtein" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="脂肪（g/100g）">
          <el-input-number v-model="form.nutritionFat" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="反式脂肪酸（g/100g）">
          <el-input-number v-model="form.nutritionTransFat" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="碳水化合物（g/100g）">
          <el-input-number v-model="form.nutritionCarb" :min="0" :precision="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="钠（mg/100g）">
          <el-input-number v-model="form.nutritionSodium" :min="0" :precision="0" controls-position="right" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">配料与过敏原</span></template>
        <el-form-item label="配料表">
          <el-input v-model="form.ingredientList" type="textarea" :rows="3" placeholder="按配料量降序排列" />
        </el-form-item>
        <el-form-item label="致敏物质提示">
          <el-input v-model="form.allergens" placeholder="含麸质谷物(小麦)、蛋及蛋制品、乳及乳制品" />
        </el-form-item>
        <el-form-item label="产品标签声称合法性声明">
          <el-input v-model="form.labelClaimStatement" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">审批 — 总经理确认</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="5"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">已获总经理确认</el-text>
        <el-text v-else type="info" size="small">提交后等待总经理确认</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const form = reactive({
  recordDate: dayjs().format('YYYY-MM-DD'),
  shelfLifeDays: 30,
  productType: '烘烤类糕点',
  processingMethod: '热加工',
  productStandard: 'GB 7099',
  storageConditions: '阴凉干燥处',
  consumptionMethod: '开袋即食',
  nutritionEnergy: 0,
  nutritionProtein: 0,
  nutritionFat: 0,
  nutritionTransFat: 0,
  nutritionCarb: 0,
  nutritionSodium: 0,
  ingredientList: '',
  allergens: '含麸质谷物(小麦)、蛋及蛋制品、乳及乳制品',
  labelClaimStatement: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.ingredientList.trim()) { ElMessage.warning('请填写配料表'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step5.vue
git commit -m "feat: Step5 重写为产品标签信息记录(JL-04)，含营养成分"
```

---

## Task 14: 前端 — Step6.vue 重写（JL-02+JL-06 操作规程+配方工艺参数）

**Files:**
- Modify: `client/src/views/process/Step6.vue`

- [ ] **Step 1: 完整替换 Step6.vue**

```vue
<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品操作规程（JL-02）+ 配方及工艺参数（JL-06）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">SOP基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="SOP版本"><el-input v-model="form.sopVersion" placeholder="V1.0" /></el-form-item>
        <el-form-item label="生效日期">
          <el-date-picker v-model="form.effectiveDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="产品线">
          <el-select v-model="form.productLine">
            <el-option value="A线" label="A线" />
            <el-option value="B线" label="B线" />
            <el-option value="C线" label="C线" />
          </el-select>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品配方（JL-06）</span></template>
        <RecipeLineEditor v-model="form.recipeLines" :disabled="disabled" />
        <div style="margin-top:8px; display:flex; gap:24px">
          <el-form-item label="标准批量(kg)">
            <el-input-number v-model="form.batchSize" :min="0" :precision="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="出品率(%)">
            <el-input-number v-model="form.yieldRate" :min="0" :max="100" :precision="1" controls-position="right" />
          </el-form-item>
        </div>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">工艺参数（JL-06）</span></template>
        <el-form-item label="炉速">
          <el-input v-model="form.ovenSpeed" placeholder="如：450mm/min" />
        </el-form-item>
        <el-form-item label="蛋黄SG">
          <el-input v-model="form.yolkSG" placeholder="如：0.38~0.42" />
        </el-form-item>
        <el-form-item label="蛋清SG">
          <el-input v-model="form.whiteSG" placeholder="如：0.14~0.16" />
        </el-form-item>
        <el-form-item label="混合后SG">
          <el-input v-model="form.mixedSG" placeholder="如：0.28~0.32" />
        </el-form-item>
        <el-form-item label="满杯比重(g)">
          <el-input v-model="form.cupWeight" placeholder="如：165~175" />
        </el-form-item>
        <el-form-item label="下料机注浆重量(g)">
          <el-input v-model="form.fillingWeight" placeholder="如：80~85" />
        </el-form-item>
        <el-form-item label="出炉口重量(g)">
          <el-input v-model="form.exitWeight" placeholder="如：72~78" />
        </el-form-item>
        <el-form-item label="出炉温度(°C)">
          <el-input v-model="form.exitTemp" placeholder="如：≥95" />
        </el-form-item>
        <el-form-item label="包装温度(°C)">
          <el-input v-model="form.packagingTemp" placeholder="如：25~35" />
        </el-form-item>
        <el-form-item label="炉温备注">
          <el-input v-model="form.ovenTempNote" type="textarea" :rows="3" placeholder="各区炉温范围（面火/底火）" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">生产工艺流程</span></template>
        <el-form-item label="工艺流程描述">
          <el-input v-model="form.productionFlow" type="textarea" :rows="5" placeholder="按工序顺序描述生产流程" />
        </el-form-item>
        <el-form-item label="关键控制点(CCP)">
          <el-input v-model="form.criticalControlPoints" type="textarea" :rows="3" placeholder="CCP1: 金探，限值Fe≤2mm；CCP2: 烘烤，中心温度≥95°C" />
        </el-form-item>
        <el-form-item label="过敏原控制措施">
          <el-input v-model="form.allergenControl" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">品质部 + 制造部审核</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="6"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">品质部+制造部审核完成，配方已写入产品台账</el-text>
        <el-text v-else type="info" size="small">提交后由品质部和制造部审核</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', getFormData())">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交审核</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';
import RecipeLineEditor from '@/components/process/RecipeLineEditor.vue';
import type { RecipeLine } from '@/api/process';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');

const rawMatsFromStep2 = computed((): RecipeLine[] => {
  const s2 = props.allStepsData?.[2] as any;
  return (s2?.rawMaterials ?? []).map((m: any): RecipeLine => ({
    materialId: m.id,
    materialCode: m.materialCode,
    materialName: m.name,
    qtyPerBatch: 0,
    unit: 'kg',
  }));
});

const form = reactive({
  sopVersion: 'V1.0',
  effectiveDate: dayjs().format('YYYY-MM-DD'),
  productLine: 'A线',
  recipeLines: [] as RecipeLine[],
  batchSize: 0,
  yieldRate: 0,
  ovenSpeed: '',
  yolkSG: '',
  whiteSG: '',
  mixedSG: '',
  cupWeight: '',
  fillingWeight: '',
  exitWeight: '',
  exitTemp: '',
  packagingTemp: '',
  ovenTempNote: '',
  productionFlow: '',
  criticalControlPoints: '',
  allergenControl: '',
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
  if (form.recipeLines.length === 0 && rawMatsFromStep2.value.length > 0) {
    form.recipeLines = rawMatsFromStep2.value;
  }
});

const getFormData = () => ({ ...form, recipeLines: form.recipeLines.map(r => ({ ...r })) });

const handleSubmit = () => {
  if (form.recipeLines.length === 0) { ElMessage.warning('请填写产品配方'); return; }
  if (!form.productionFlow.trim()) { ElMessage.warning('请填写生产工艺流程'); return; }
  emit('submitted', getFormData());
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step6.vue
git commit -m "feat: Step6 重写为操作规程+配方工艺参数(JL-02+JL-06)"
```

---

## Task 15: 前端 — Step7.vue 重写（JL-07 产品验证记录）

**Files:**
- Modify: `client/src/views/process/Step7.vue`

- [ ] **Step 1: 完整替换 Step7.vue**

```vue
<template>
  <div class="step-view">
    <el-form :model="form" label-width="200px" :disabled="disabled">
      <el-divider>产品验证记录（JL-07）</el-divider>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">试生产基本信息</span></template>
        <el-form-item label="产品名称"><el-input :model-value="productName" disabled /></el-form-item>
        <el-form-item label="项目负责人"><el-input v-model="form.projectManager" /></el-form-item>
        <el-form-item label="试生产日期">
          <el-date-picker v-model="form.trialProductionDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
        <el-form-item label="验证阶段">
          <el-radio-group v-model="form.verificationStage">
            <el-radio value="小试">小试</el-radio>
            <el-radio value="中试">中试</el-radio>
            <el-radio value="大试">大试</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="试生产批次号"><el-input v-model="form.batchNumber" /></el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">实际使用配方（来自Step6，只读）</span></template>
        <el-table :data="recipeFromStep6" border size="small">
          <el-table-column type="index" label="序号" width="55" />
          <el-table-column label="物料编码" prop="materialCode" width="130" />
          <el-table-column label="物料名称" prop="materialName" min-width="160" />
          <el-table-column label="用量(kg/批)" prop="qtyPerBatch" width="120" />
          <el-table-column label="单位" prop="unit" width="80" />
        </el-table>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">原辅料验证</span></template>
        <el-form-item label="原料生产商三证合一"><el-checkbox v-model="form.supplierLicenseVerified" /></el-form-item>
        <el-form-item label="拥有第三方检测标准"><el-checkbox v-model="form.thirdPartyStandard" /></el-form-item>
        <el-form-item label="批次检验报告"><el-checkbox v-model="form.batchInspectionReport" /></el-form-item>
        <el-form-item label="原辅料可靠性结论">
          <el-radio-group v-model="form.materialReliabilityConclusion">
            <el-radio value="可靠">可靠</el-radio>
            <el-radio value="不可靠">不可靠</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">产品理化及安全性检验</span></template>
        <el-form-item label="理化及安全性检验">
          <el-radio-group v-model="form.safetyInspectionConclusion">
            <el-radio value="符合标准">符合标准</el-radio>
            <el-radio value="不符合标准">不符合标准</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生产中潜在危害">
          <el-input v-model="form.potentialHazard" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="控制措施">
          <el-input v-model="form.controlMeasure" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="储运测试结果（必要时）">
          <el-input v-model="form.storageTransportTest" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="顾客试吃意见（必要时）">
          <el-input v-model="form.customerFeedback" type="textarea" :rows="2" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">验证结论</span></template>
        <el-form-item label="验证结论" prop="verificationConclusion">
          <el-radio-group v-model="form.verificationConclusion">
            <el-radio value="合格">合格（可量产）</el-radio>
            <el-radio value="不合格">不合格（需重新研发）</el-radio>
            <el-radio value="需修改">需修改后再验证</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="验证日期">
          <el-date-picker v-model="form.verificationDate" type="date" value-format="YYYY-MM-DD" :disabled="disabled" />
        </el-form-item>
      </el-card>

      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">3人会签（制造部 + 品质部 + 食品安全组长）</span></template>
        <DeptSignoffPanel
          v-if="stepStatus === 'SUBMITTED'"
          :instance-id="instanceId"
          :step-number="7"
          :disabled="disabled"
          @signed="emit('signed')"
        />
        <el-text v-else-if="stepStatus === 'APPROVED'" type="success">食品安全组长已批准，产品正式激活</el-text>
        <el-text v-else type="info" size="small">提交后由制造部、品质部、食品安全小组长依次签署</el-text>
      </el-card>
    </el-form>

    <div v-if="!disabled && stepStatus !== 'SUBMITTED' && stepStatus !== 'APPROVED'" class="action-bar">
      <el-button @click="emit('saved', { ...form })">暂存草稿</el-button>
      <el-button type="primary" @click="handleSubmit">提交验证</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import DeptSignoffPanel from '@/components/process/DeptSignoffPanel.vue';
import type { RecipeLine } from '@/api/process';

const props = defineProps<{
  instanceId: string;
  modelValue?: Record<string, unknown>;
  allStepsData?: Record<number, Record<string, unknown>>;
  disabled?: boolean;
  stepStatus?: string;
}>();

const emit = defineEmits<{
  (e: 'saved', data: Record<string, unknown>): void;
  (e: 'submitted', data: Record<string, unknown>): void;
  (e: 'signed'): void;
}>();

const productName = computed(() => (props.allStepsData?.[1] as any)?.productName ?? '-');
const recipeFromStep6 = computed((): RecipeLine[] => {
  const s6 = props.allStepsData?.[6] as any;
  return s6?.recipeLines ?? [];
});

const form = reactive({
  projectManager: '',
  trialProductionDate: dayjs().format('YYYY-MM-DD'),
  verificationStage: '中试',
  batchNumber: '',
  supplierLicenseVerified: true,
  thirdPartyStandard: true,
  batchInspectionReport: true,
  materialReliabilityConclusion: '可靠',
  safetyInspectionConclusion: '符合标准',
  potentialHazard: '',
  controlMeasure: '',
  storageTransportTest: '',
  customerFeedback: '',
  verificationConclusion: '',
  verificationDate: dayjs().format('YYYY-MM-DD'),
});

onMounted(() => {
  if (props.modelValue) {
    const mv = props.modelValue as any;
    Object.keys(form).forEach(k => { if (mv[k] !== undefined) (form as any)[k] = mv[k]; });
  }
});

const handleSubmit = () => {
  if (!form.verificationConclusion) { ElMessage.warning('请选择验证结论'); return; }
  if (!form.batchNumber.trim()) { ElMessage.warning('请填写试生产批次号'); return; }
  emit('submitted', { ...form });
};
</script>

<style scoped>
.step-view { padding: 16px; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; }
.action-bar { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/process/Step7.vue
git commit -m "feat: Step7 重写为产品验证记录(JL-07)，3人会签"
```

---

## Task 16: 清理 + 验证构建

**Files:**
- Delete: `client/src/views/process/Step8.vue`
- Delete: `client/src/views/process/Step9.vue`
- Modify: `client/src/utils/processValidation.ts`

- [ ] **Step 1: 删除 Step8 和 Step9**

```bash
rm client/src/views/process/Step8.vue
rm client/src/views/process/Step9.vue
```

- [ ] **Step 2: 检查 processValidation.ts 是否还引用 Step8/Step9**

```bash
grep -n "Step8\|Step9\|validateStep8\|validateStep9" client/src/utils/processValidation.ts
```

若有，删除对应的 `validateStep8` 和 `validateStep9` 函数及其导出。

- [ ] **Step 3: 编译前端确认无报错**

```bash
cd client && npx vite build 2>&1 | tail -30
```

Expected: `built in Xs` 无 TypeScript 编译错误

- [ ] **Step 4: 编译后端确认无报错**

```bash
cd server && npm run build 2>&1 | tail -20
```

Expected: `Compilation complete` 无报错

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: 删除Step8/Step9，清理旧验证函数，构建验证通过"
```

---

## Task 17: 端到端验证

> 确保以下主流程在浏览器中可以走通。

- [ ] **Step 1: 启动后端**

```bash
cd server && npm run start:dev
```

Expected: 监听 3000 端口，无启动报错

- [ ] **Step 2: 启动前端**

```bash
cd client && npm run dev
```

Expected: 监听 5173 端口

- [ ] **Step 3: 测试新建研发流程**

浏览器打开 `http://localhost:5173/process`，点击"新建研发流程"，确认：
- 弹窗中可选模板（应显示"产品研发流程（7步）"）
- 创建成功后进入 ProcessDetail
- 步骤导航显示7步

- [ ] **Step 4: 测试 Step1 提交 + 审批后 Product 创建**

填写 Step1，填入产品名称，点提交。提交后只应生成 Step1 的 `ProcessStepData` 和 `ProcessStepApproval` 待签槽位，不应立即创建 Product。用总经办/管理员用户签署 GM 槽位后，再验证 Product draft 已创建：

用数据库或 API 验证 Product draft 已创建：
```bash
cd server && npx ts-node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.product.findMany({where:{status:'draft'},orderBy:{created_at:'desc'},take:3}).then(r=>console.log(JSON.stringify(r,null,2))).finally(()=>p.\$disconnect());
"
```

Expected: Step1 未审批前没有新增 draft Product；GM 签署后出现 status='draft' 的新产品记录，并且 ProcessInstance.productId 指向该 Product。

- [ ] **Step 5: 测试 DeptSignoffPanel 显示**

Step1 提交后，确认审批区域出现 `DeptSignoffPanel`（显示"总经办 待签署"行）

- [ ] **Step 6: 测试 Step2 → Step3 数据预填**

Step1 审批通过后（或手动在 DB 改 currentStep=2），进入 Step2，选择若干原料后提交。进入 Step3，确认"实验材料"表格已预填 Step2 的原料名称。

- [ ] **Step 7: 测试 Step6 → Recipe 写入**

Step6 审批通过后，验证 Recipe 和 RecipeLine 记录已创建：
```bash
cd server && npx ts-node -e "
const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.recipe.findMany({include:{lines:true},orderBy:{created_at:'desc'},take:1}).then(r=>console.log(JSON.stringify(r,null,2))).finally(()=>p.\$disconnect());
"
```

Expected: 出现关联 product_id 的 Recipe，包含 RecipeLine 记录

- [ ] **Step 8: 测试 Step7 完成 → Product active**

Step7 食品安全组长签署后，验证 Product.status 变为 'active'，ProcessInstance.status 变为 'COMPLETED'

- [ ] **Final Commit**

```bash
git add -A
git commit -m "feat: 产品研发流程7步重设计完成，端到端验证通过"
```
