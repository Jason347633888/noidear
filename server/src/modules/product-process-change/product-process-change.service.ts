import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeEventService } from '../change-event/change-event.service';
import { CreateProductProcessChangeDraftDto } from './dto/product-process-change.dto';
import { UNFINISHED_PRODUCT_PROCESS_CHANGE_STATUSES } from './product-process-change.constants';

const UNFINISHED_STATUSES: string[] = [...UNFINISHED_PRODUCT_PROCESS_CHANGE_STATUSES];

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

interface CcpPointInput {
  step_no: number;
  ccp_no: string;
  hazard_type: 'biological' | 'chemical' | 'physical';
  control_measure: string;
  critical_limit: string;
  cl_min?: number | string | null;
  cl_max?: number | string | null;
  cl_unit?: string;
  monitoring_method?: string;
  monitoring_frequency?: string;
  corrective_action?: string;
}

const CCP_HAZARD_TYPES = new Set(['biological', 'chemical', 'physical']);

interface ProductProcessChangePayload {
  recipeLines?: RecipeLineInput[];
  processSteps?: ProcessStepInput[];
  ccpPoints?: CcpPointInput[];
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
  private readonly logger = new Logger(ProductProcessChangeService.name);

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

    if (scopeSet.has('haccp')) {
      const ccpPoints = payload.ccpPoints ?? [];
      if (ccpPoints.length === 0) {
        throw new BadRequestException('CCP 控制点不能为空');
      }
      const seenCcpNo = new Set<string>();
      for (const ccp of ccpPoints) {
        if (typeof ccp.step_no !== 'number' || !Number.isInteger(ccp.step_no) || ccp.step_no < 1) {
          throw new BadRequestException('CCP 编号不能为空');
        }
        if (!ccp.ccp_no || typeof ccp.ccp_no !== 'string') {
          throw new BadRequestException('CCP 编号不能为空');
        }
        if (!ccp.hazard_type || !CCP_HAZARD_TYPES.has(ccp.hazard_type)) {
          throw new BadRequestException('CCP 危害类型不合法');
        }
        if (!ccp.control_measure) {
          throw new BadRequestException('CCP 控制措施不能为空');
        }
        if (!ccp.critical_limit) {
          throw new BadRequestException('CCP 临界值不能为空');
        }
        if (seenCcpNo.has(ccp.ccp_no)) {
          throw new BadRequestException(`CCP 编号重复: ${ccp.ccp_no}`);
        }
        seenCcpNo.add(ccp.ccp_no);
      }
    }
  }

  /**
   * Applies an approved product-process change plan: archives the previous
   * active recipe, creates a new active recipe and lines, replaces process
   * steps when in scope, and records an execution + artifacts row.
   *
   * Runs ALL business writes inside the caller's `tx` so a thrown error rolls
   * everything back atomically. The plan-level failure record is intentionally
   * written through `this.prisma` (a separate connection, OUTSIDE the doomed
   * tx) so the failure marker survives the rollback.
   */
  async applyApprovedChange(
    changeEventId: string,
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const plan = await tx.productProcessChangePlan.findUnique({
      where: { changeEventId },
    });
    if (!plan) return;
    if (plan.status === 'executed') {
      throw new BadRequestException('产品工艺变更已执行');
    }

    try {
      await tx.productProcessChangePlan.update({
        where: { id: plan.id },
        data: { status: 'approved_executing' },
      });

      await this.validatePayload(plan, tx);

      const scopes = Array.isArray(plan.scopes) ? (plan.scopes as string[]) : [];
      const scopeSet = new Set(scopes);
      const payload = (plan.payloadJson ?? {}) as ProductProcessChangePayload;
      const artifacts: Prisma.ChangeEventExecutionArtifactCreateManyInput[] = [];

      let newRecipeId: string | null = null;
      if (scopeSet.has('recipe')) {
        newRecipeId = await this.applyRecipeChange(plan, payload, changeEventId, tx, artifacts);
      }

      if (scopeSet.has('process') || scopeSet.has('process_step')) {
        await this.applyProcessStepChange(plan, payload, changeEventId, tx, artifacts, newRecipeId);
      }

      if (scopeSet.has('haccp')) {
        await this.applyHaccpChange(plan, payload, changeEventId, tx, artifacts);
      }

      const execution = await tx.changeEventExecution.create({
        data: {
          company_id: plan.company_id,
          changeEventId,
          status: 'executed',
          executedAt: new Date(),
        },
      });

      if (artifacts.length > 0) {
        await tx.changeEventExecutionArtifact.createMany({
          data: artifacts.map((a) => ({ ...a, executionId: execution.id })),
        });
      }

      await tx.productProcessChangePlan.update({
        where: { id: plan.id },
        data: {
          status: 'executed',
          executedAt: new Date(),
          executionError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      // Recorded OUTSIDE the doomed tx so the failure marker survives rollback.
      // Wrapped in inner try so a recording failure cannot mask the original error.
      try {
        await this.prisma.productProcessChangePlan.update({
          where: { id: plan.id },
          data: {
            status: 'execution_failed',
            executionError: message,
          },
        });
      } catch (recordErr) {
        this.logger.error(
          `Failed to record execution_failed for plan ${plan.id}: ${
            recordErr instanceof Error ? recordErr.message : recordErr
          }`,
        );
      }
      try {
        await this.prisma.changeEventExecution.upsert({
          where: { changeEventId },
          create: {
            company_id: plan.company_id,
            changeEventId,
            status: 'failed',
            executedAt: new Date(),
            errorMessage: message,
          },
          update: { status: 'failed', errorMessage: message, executedAt: new Date() },
        });
      } catch (recordErr) {
        this.logger.error(
          `Failed to record changeEventExecution failure for ${changeEventId}: ${
            recordErr instanceof Error ? recordErr.message : recordErr
          }`,
        );
      }
      throw err;
    }
  }

  private async applyRecipeChange(
    plan: { id: string; product_id: string; company_id: string },
    payload: ProductProcessChangePayload,
    changeEventId: string,
    tx: Prisma.TransactionClient,
    artifacts: Prisma.ChangeEventExecutionArtifactCreateManyInput[],
  ): Promise<string> {
    const recipeLines = payload.recipeLines ?? [];

    const previousActive = await tx.recipe.findFirst({
      where: { product_id: plan.product_id, status: 'active' },
    });

    await tx.recipe.updateMany({
      where: { product_id: plan.product_id, status: 'active' },
      data: { status: 'archived' },
    });

    const latest = await tx.recipe.findFirst({
      where: { product_id: plan.product_id, company_id: plan.company_id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? previousActive?.version ?? 0) + 1;

    const areaIds = Array.from(new Set(recipeLines.map((l) => l.area_id!).filter(Boolean)));
    const areas = await tx.workshopArea.findMany({
      where: { id: { in: areaIds } },
      select: { id: true, name: true },
    });
    const areaName = new Map(areas.map((a) => [a.id, a.name] as const));

    const newRecipe = await tx.recipe.create({
      data: {
        company_id: plan.company_id,
        product_id: plan.product_id,
        version: nextVersion,
        version_note: payload.versionNote ?? null,
        status: 'active',
        changeEventId,
        lines: {
          create: recipeLines.map((l) => ({
            material_id: l.material_id!,
            qty_per_batch: new Prisma.Decimal(l.qty_per_batch as any),
            unit: l.unit!,
            is_critical: !!l.is_critical,
            notes: l.notes ?? null,
            area_id: l.area_id ?? null,
            area_name_snapshot: l.area_id ? areaName.get(l.area_id) ?? null : null,
          })),
        },
      },
    });

    if (previousActive) {
      artifacts.push({
        executionId: '',
        resourceType: 'recipe',
        resourceId: previousActive.id,
        action: 'archive',
        beforeSnapshot: previousActive as unknown as Prisma.InputJsonValue,
        afterSnapshot: Prisma.JsonNull,
      });
    }
    artifacts.push({
      executionId: '',
      resourceType: 'recipe',
      resourceId: newRecipe.id,
      action: 'create',
      beforeSnapshot: Prisma.JsonNull,
      afterSnapshot: {
        id: newRecipe.id,
        version: newRecipe.version,
        status: newRecipe.status,
      } as unknown as Prisma.InputJsonValue,
    });

    return newRecipe.id;
  }

  private async applyProcessStepChange(
    plan: { id: string; product_id: string; company_id: string },
    payload: ProductProcessChangePayload,
    changeEventId: string,
    tx: Prisma.TransactionClient,
    artifacts: Prisma.ChangeEventExecutionArtifactCreateManyInput[],
    // When recipe scope ran in the same apply, this is the freshly created
    // recipe id. When recipe scope did NOT run, we leave recipe_id as null:
    // safer than silently linking to a stale active recipe.
    recipeId: string | null = null,
  ): Promise<void> {
    const steps = payload.processSteps ?? [];
    if (steps.length === 0) return;

    const existing = await tx.processStep.findMany({
      where: { product_id: plan.product_id, deleted_at: null },
    });

    if (existing.length > 0) {
      await tx.processStep.updateMany({
        where: { product_id: plan.product_id, deleted_at: null },
        data: { deleted_at: new Date() },
      });
      for (const old of existing) {
        artifacts.push({
          executionId: '',
          resourceType: 'process_step',
          resourceId: old.id,
          action: 'archive',
          beforeSnapshot: old as unknown as Prisma.InputJsonValue,
          afterSnapshot: Prisma.JsonNull,
        });
      }
    }

    for (const step of steps) {
      const created = await tx.processStep.create({
        data: {
          company_id: plan.company_id,
          product_id: plan.product_id,
          seq: step.step_no!,
          step_no: step.step_no!,
          step_name: step.step_name ?? step.name ?? '',
          name: step.name ?? step.step_name ?? '',
          description: step.description ?? null,
          is_ccp: !!step.is_ccp,
          recipe_id: recipeId,
          changeEventId,
        },
      });
      artifacts.push({
        executionId: '',
        resourceType: 'process_step',
        resourceId: created.id,
        action: 'create',
        beforeSnapshot: Prisma.JsonNull,
        afterSnapshot: {
          id: created.id,
          step_no: created.step_no,
          name: created.name,
        } as unknown as Prisma.InputJsonValue,
      });
    }
  }

  private async applyHaccpChange(
    plan: { id: string; product_id: string; company_id: string },
    payload: ProductProcessChangePayload,
    changeEventId: string,
    tx: Prisma.TransactionClient,
    artifacts: Prisma.ChangeEventExecutionArtifactCreateManyInput[],
  ): Promise<void> {
    const ccpPoints = payload.ccpPoints ?? [];
    if (ccpPoints.length === 0) return;

    // TODO: handle removal of CCP points absent from payload — requires
    // explicit "remove" semantics (deleted_at?) and is out of scope here.

    for (const ccp of ccpPoints) {
      const step = await tx.processStep.findFirst({
        where: {
          product_id: plan.product_id,
          step_no: ccp.step_no,
          deleted_at: null,
          // Prefer the step created in this apply (recipe-process combo) when present.
          changeEventId,
        },
      }) ?? (await tx.processStep.findFirst({
        where: {
          product_id: plan.product_id,
          step_no: ccp.step_no,
          deleted_at: null,
        },
      }));
      if (!step) {
        throw new BadRequestException(`CCP ${ccp.ccp_no} 找不到对应工序步骤 ${ccp.step_no}`);
      }

      const existing = await tx.cCPPoint.findUnique({
        where: { company_id_ccp_no: { company_id: plan.company_id, ccp_no: ccp.ccp_no } },
      });
      const action = existing ? 'update' : 'create';

      const baseData = {
        process_step_id: step.id,
        hazard_type: ccp.hazard_type,
        control_measure: ccp.control_measure,
        critical_limit: ccp.critical_limit,
        cl_min:
          ccp.cl_min === undefined || ccp.cl_min === null
            ? null
            : new Prisma.Decimal(ccp.cl_min as any),
        cl_max:
          ccp.cl_max === undefined || ccp.cl_max === null
            ? null
            : new Prisma.Decimal(ccp.cl_max as any),
        cl_unit: ccp.cl_unit ?? null,
        monitoring_method: ccp.monitoring_method ?? null,
        monitoring_frequency: ccp.monitoring_frequency ?? null,
        corrective_action: ccp.corrective_action ?? null,
      };

      const upserted = await tx.cCPPoint.upsert({
        where: { company_id_ccp_no: { company_id: plan.company_id, ccp_no: ccp.ccp_no } },
        create: {
          company_id: plan.company_id,
          ccp_no: ccp.ccp_no,
          ...baseData,
        },
        update: { ...baseData },
      });

      artifacts.push({
        executionId: '',
        resourceType: 'ccp_point',
        resourceId: upserted.id,
        action,
        beforeSnapshot: existing
          ? (existing as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        afterSnapshot: {
          id: upserted.id,
          ccp_no: upserted.ccp_no,
          process_step_id: upserted.process_step_id,
        } as unknown as Prisma.InputJsonValue,
      });
    }
  }
}
