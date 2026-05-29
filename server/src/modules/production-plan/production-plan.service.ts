import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductionPlanDto } from './dto/production-plan.dto';

/**
 * Task types derived for each plan item when a production plan is released.
 * Order is significant — tasks are created in this sequence.
 */
const DEFAULT_TASK_TYPES = ['mixing', 'inspection', 'packaging'] as const;

@Injectable()
export class ProductionPlanService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a draft production plan with nested plan items.
   * Plans start in `draft` status and only derive execution tasks on release.
   */
  async create(dto: CreateProductionPlanDto, companyId: string, userId?: string) {
    return this.prisma.productionPlan.create({
      data: {
        company_id: companyId,
        planNo: dto.planNo,
        planDate: new Date(dto.planDate),
        ...(dto.lineId !== undefined ? { lineId: dto.lineId } : {}),
        status: 'draft',
        ...(userId !== undefined ? { createdById: userId } : {}),
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            ...(item.recipeId !== undefined ? { recipeId: item.recipeId } : {}),
            plannedQty: item.plannedQty,
            unit: item.unit,
            ...(item.lineId !== undefined ? { lineId: item.lineId } : {}),
            ...(item.shiftId !== undefined ? { shiftId: item.shiftId } : {}),
            status: 'planned',
          })),
        },
      },
      include: { items: true },
    });
  }

  /**
   * Release a draft plan: derive execution tasks per plan item and flip status.
   *
   * Guards against re-release by only allowing transition from `draft`; this
   * keeps task derivation idempotent (combined with the createMany
   * `skipDuplicates`). Product batches are NOT created here — they are
   * created/confirmed later (packaging/finished-goods) and linked back via
   * `planItemId`.
   */
  async releasePlan(planId: string, companyId: string, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.productionPlan.findUnique({
        where: { id: planId },
        include: { items: true },
      });

      if (!plan || plan.company_id !== companyId) {
        throw new NotFoundException('生产计划不存在');
      }

      if (plan.status !== 'draft') {
        throw new BadRequestException('只有草稿状态的生产计划才能下达');
      }

      const tasks = plan.items.flatMap((item) =>
        DEFAULT_TASK_TYPES.map((taskType) => ({
          planItemId: item.id,
          taskType,
          status: 'pending',
        })),
      );

      if (tasks.length > 0) {
        await tx.productionTask.createMany({
          data: tasks,
          skipDuplicates: true,
        });
      }

      return tx.productionPlan.update({
        where: { id: planId },
        data: {
          status: 'released',
          releasedAt: new Date(),
          ...(userId !== undefined ? { releasedById: userId } : {}),
        },
      });
    });
  }
}
