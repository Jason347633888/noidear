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
