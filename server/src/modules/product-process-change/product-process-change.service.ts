import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeEventService } from '../change-event/change-event.service';
import { CreateProductProcessChangeDraftDto } from './dto/product-process-change.dto';

const UNFINISHED_STATUSES = ['draft', 'pending_approval', 'approved_executing', 'execution_failed'];

interface RecipeLineInput {
  material_id?: string;
  qty_per_batch?: number | string | null;
  unit?: string;
  area_id?: string;
  is_critical?: boolean;
  notes?: string;
}

interface ProcessStepInput {
  step_no?: number;
  step_name?: string;
  name?: string;
  description?: string;
  is_ccp?: boolean;
}

interface ProductProcessChangePayload {
  recipeLines?: RecipeLineInput[];
  processSteps?: ProcessStepInput[];
  baseRecipeId?: string;
  baseRecipeVersion?: number;
  versionNote?: string;
}

function deriveChangeType(scopes: string[]): string {
  if (scopes.includes('recipe')) return 'recipe';
  if (scopes.includes('process')) return 'process';
  return 'product';
}

@Injectable()
export class ProductProcessChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changeEventService: ChangeEventService,
  ) {}

  async createDraft(dto: CreateProductProcessChangeDraftDto, actorId: string) {
    const { productId, scopes, payloadJson } = dto;

    const existing = await this.prisma.productProcessChangePlan.findFirst({
      where: { product_id: productId, status: { in: UNFINISHED_STATUSES } },
    });
    if (existing) {
      throw new BadRequestException('该产品已有未完成的产品工艺变更');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, deleted_at: null },
    });
    if (!product) {
      throw new BadRequestException('产品不存在或已删除');
    }

    const payload = (payloadJson ?? {}) as ProductProcessChangePayload;

    return this.prisma.$transaction(async (tx) => {
      const changeEvent = await this.changeEventService.createDraftEvent(
        {
          change_type: deriveChangeType(scopes),
          title: `产品工艺变更：${product.name}`,
          description: payload.versionNote ?? '产品工艺变更草稿',
          relations: [
            {
              targetType: 'product',
              targetId: product.id,
              targetLabel: product.name,
            },
          ],
        } as any,
        actorId,
        tx,
      );

      const plan = await tx.productProcessChangePlan.create({
        data: {
          company_id: product.company_id,
          changeEventId: changeEvent.id,
          product_id: product.id,
          scopes: scopes as unknown as Prisma.InputJsonValue,
          baseRecipeId: payload.baseRecipeId ?? null,
          baseRecipeVersion: payload.baseRecipeVersion ?? null,
          status: 'draft',
          payloadJson: (payloadJson ?? {}) as Prisma.InputJsonValue,
          createdById: actorId,
        },
      });

      return plan;
    });
  }

  async submitForApproval(planId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.productProcessChangePlan.findUnique({
        where: { id: planId },
        include: { changeEvent: true },
      });
      if (!plan) {
        throw new NotFoundException('产品工艺变更不存在');
      }
      if (plan.status !== 'draft') {
        throw new BadRequestException('当前状态不能提交审批');
      }

      await this.validatePayload(plan, tx);

      await tx.productProcessChangePlan.update({
        where: { id: plan.id },
        data: {
          status: 'pending_approval',
          lockedAt: new Date(),
          validationResult: { ok: true } as Prisma.InputJsonValue,
        },
      });

      await this.changeEventService.submitForApproval(plan.changeEventId, actorId, tx);

      return plan;
    });
  }

  /**
   * Validates the plan's payloadJson against current authoritative data.
   * Designed to be reused by Task 5's `applyApprovedChange` flow.
   */
  private async validatePayload(
    plan: { product_id: string; scopes: Prisma.JsonValue; payloadJson: Prisma.JsonValue },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const scopes = Array.isArray(plan.scopes) ? (plan.scopes as string[]) : [];
    const scopeSet = new Set(scopes);
    const payload = (plan.payloadJson ?? {}) as ProductProcessChangePayload;

    const product = await tx.product.findFirst({
      where: { id: plan.product_id, deleted_at: null },
    });
    if (!product) {
      throw new BadRequestException('产品不存在或已删除');
    }

    if (scopeSet.has('recipe')) {
      const recipeLines = payload.recipeLines ?? [];
      if (recipeLines.length === 0) {
        throw new BadRequestException('配方行不能为空');
      }
      for (const line of recipeLines) {
        if (!line.material_id) throw new BadRequestException('配方行物料不能为空');
        if (!line.qty_per_batch) throw new BadRequestException('配方行用量不能为空');
        if (!line.unit) throw new BadRequestException('配方行单位不能为空');
        if (!line.area_id) throw new BadRequestException('配方行配料区不能为空');
      }

      const materialIds = Array.from(new Set(recipeLines.map((l) => l.material_id!).filter(Boolean)));
      const areaIds = Array.from(new Set(recipeLines.map((l) => l.area_id!).filter(Boolean)));

      const materials = await tx.material.findMany({
        where: { id: { in: materialIds } },
        select: { id: true },
      });
      if (materials.length !== materialIds.length) {
        throw new BadRequestException('配方行物料不存在');
      }

      const areas = await tx.workshopArea.findMany({
        where: { id: { in: areaIds }, deleted_at: null },
        select: { id: true },
      });
      if (areas.length !== areaIds.length) {
        throw new BadRequestException('配方行配料区不存在');
      }

      // Either base on existing active recipe or allow recipe-only-create when baseRecipeVersion is supplied.
      if (!payload.baseRecipeVersion) {
        const activeRecipe = await tx.recipe.findFirst({
          where: { product_id: plan.product_id, status: 'active' },
          select: { id: true },
        });
        if (!activeRecipe) {
          throw new BadRequestException('当前产品无生效配方，请先指定基线版本');
        }
      }
    }

    if (scopeSet.has('process')) {
      const processSteps = payload.processSteps ?? [];
      if (processSteps.length === 0) {
        throw new BadRequestException('工艺步骤不能为空');
      }
      const seen = new Set<number>();
      for (const step of processSteps) {
        if (typeof step.step_no !== 'number') {
          throw new BadRequestException('工艺步骤序号不能为空');
        }
        if (seen.has(step.step_no)) {
          throw new BadRequestException(`工艺步骤序号重复：${step.step_no}`);
        }
        seen.add(step.step_no);
      }
    }
  }
}
