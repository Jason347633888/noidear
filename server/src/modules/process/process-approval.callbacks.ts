import type { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalCallbackContext } from '../unified-approval/types';

export async function applyProcessStepApproved(
  _prisma: PrismaService,
  context: ApprovalCallbackContext,
): Promise<void> {
  const tx = context.tx as any;
  const stepNumber = Number(String(context.resourceStep ?? '').replace('step:', ''));

  const instance = await tx.processInstance.findUnique({
    where: { id: context.resourceId },
    include: { template: true },
  });
  if (!instance) throw new Error('流程实例不存在');

  const stepData = await tx.processStepData.findUnique({
    where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
  });
  if (!stepData || stepData.status !== 'SUBMITTED') {
    throw new Error('步骤必须先提交后才能审批');
  }

  const steps = (instance.template?.steps as any[]) ?? [];
  const maxStep = steps.length;
  const isLast = stepNumber >= maxStep;
  const data = (stepData.data as any) ?? {};

  const instanceUpdate: Record<string, unknown> = {
    currentStep: isLast ? maxStep : stepNumber + 1,
    status: isLast ? 'COMPLETED' : 'IN_PROGRESS',
  };

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

  const resolvedProductId: string | undefined = (instanceUpdate.productId as string | undefined) ?? instance.productId;

  if (stepNumber === 5 && resolvedProductId) {
    await tx.product.update({
      where: { id: resolvedProductId },
      data: {
        shelf_life_days: data.shelfLifeDays ? parseInt(data.shelfLifeDays as string, 10) : undefined,
        nutrition_energy: data.nutritionEnergy ? parseFloat(data.nutritionEnergy as string) : undefined,
        nutrition_protein: data.nutritionProtein ? parseFloat(data.nutritionProtein as string) : undefined,
        nutrition_fat: data.nutritionFat ? parseFloat(data.nutritionFat as string) : undefined,
        nutrition_trans_fat: data.nutritionTransFat ? parseFloat(data.nutritionTransFat as string) : undefined,
        nutrition_carb: data.nutritionCarb ? parseFloat(data.nutritionCarb as string) : undefined,
        nutrition_sodium: data.nutritionSodium ? parseFloat(data.nutritionSodium as string) : undefined,
        product_type: data.productType,
        processing_method: data.processingMethod,
        standard_code: data.productStandard,
        storage_method: data.storageConditions,
        consumption_method: data.consumptionMethod,
        label_allergens: Array.isArray(data.allergens)
          ? (data.allergens as string[]).join('、')
          : (data.allergens as string | undefined),
        consumer_notice: data.consumerNotice,
      },
    });
  }

  if (stepNumber === 6 && resolvedProductId) {
    const recipe = await tx.recipe.create({
      data: {
        company_id: '1',
        product_id: resolvedProductId,
        version: 1,
        version_note: '研发首版',
        status: 'draft',
      },
    });
    const recipeLines = (data.recipeLines as any[]) ?? [];
    const areaSnapshots: Record<string, string> = {};
    for (const line of recipeLines.filter((l: any) => l.materialId)) {
      const areaId: string | undefined = line.areaId ?? line.area_id;
      if (!areaId) {
        throw new Error(`配方行缺少配料区域（材料 ${line.materialId}）`);
      }
      if (!areaSnapshots[areaId]) {
        const area = await tx.workshopArea.findFirst({
          where: { id: areaId, company_id: '1', status: 'active', deleted_at: null },
        });
        if (!area) {
          throw new Error(`配料区域不存在或已停用：${areaId}`);
        }
        areaSnapshots[areaId] = area.name;
      }
    }
    await tx.recipeLine.createMany({
      data: recipeLines
        .filter((line: any) => line.materialId)
        .map((line: any) => {
          const areaId: string = line.areaId ?? line.area_id;
          return {
            recipe_id: recipe.id,
            material_id: line.materialId,
            qty_per_batch: parseFloat(line.qtyPerBatch) || 0,
            unit: line.unit || 'kg',
            is_critical: line.isCritical ?? false,
            notes: line.notes ?? '',
            area_id: areaId,
            area_name_snapshot: areaSnapshots[areaId],
          };
        }),
    });
  }

  if (isLast && resolvedProductId) {
    await tx.product.update({
      where: { id: resolvedProductId },
      data: { status: 'active' },
    });
  }

  await tx.processStepData.update({
    where: { instanceId_stepNumber: { instanceId: instance.id, stepNumber } },
    data: {
      status: 'APPROVED',
      approvedById: context.actorId,
      approvedAt: new Date(),
    },
  });

  await tx.processInstance.update({
    where: { id: instance.id },
    data: instanceUpdate,
  });
}
