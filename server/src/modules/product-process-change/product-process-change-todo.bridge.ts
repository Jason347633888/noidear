import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductProcessChangeTodoBridge {
  private readonly logger = new Logger(ProductProcessChangeTodoBridge.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 失败时通过独立连接写一条待办，给 plan 提交者（或回退给当前操作者）。
   * 写失败 todo 失败时仅记日志，不抛 —— 不能遮蔽原始业务异常。
   */
  async createFailureTodo(input: {
    plan: { id: string; product_id: string; createdById: string | null };
    actorId: string;
    errorMessage: string;
    productName: string;
  }): Promise<void> {
    const userId = input.plan.createdById ?? input.actorId;
    try {
      await this.prisma.todoTask.upsert({
        where: {
          userId_type_relatedId: {
            userId,
            type: 'change_execution_failed',
            relatedId: input.plan.id,
          },
        },
        create: {
          userId,
          type: 'change_execution_failed',
          relatedId: input.plan.id,
          title: `产品工艺变更落库失败：${input.productName}`,
          description: input.errorMessage,
          status: 'pending',
          priority: 'high',
        },
        update: {
          status: 'pending',
          description: input.errorMessage,
          completedAt: null,
          completedBy: null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Failed to write change_execution_failed todo for plan ${input.plan.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /** 重试或重新成功落库时关闭对应 pending 待办（幂等）。 */
  async closeFailureTodo(planId: string, completedBy: string): Promise<void> {
    await this.prisma.todoTask.updateMany({
      where: { type: 'change_execution_failed', relatedId: planId, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy },
    });
  }
}
