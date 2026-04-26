import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApprovalTodoBridge {
  constructor(private readonly prisma: PrismaService) {}

  async createTaskTodos(input: {
    tx: any;
    task: {
      id: string;
      assigneeUserId?: string | null;
      stepName: string;
      instance: { title: string };
    };
    candidateUserIds: string[];
  }) {
    const userIds = input.task.assigneeUserId
      ? [input.task.assigneeUserId]
      : input.candidateUserIds;

    for (const userId of [...new Set(userIds)]) {
      await input.tx.todoTask.create({
        data: {
          userId,
          type: 'approval_task',
          relatedId: input.task.id,
          title: `${input.task.stepName}：${input.task.instance.title}`,
          description: input.task.instance.title,
          status: 'pending',
          priority: 'normal',
        },
      });
    }
  }

  async closeTaskTodos(tx: any, taskId: string, completedBy: string) {
    await tx.todoTask.updateMany({
      where: { type: 'approval_task', relatedId: taskId, status: 'pending' },
      data: { status: 'completed', completedAt: new Date(), completedBy },
    });
  }

  async cancelInstanceTodos(tx: any, instanceId: string, actorId: string) {
    const tasks: Array<{ id: string }> = await tx.approvalTask.findMany({
      where: { instanceId },
      select: { id: true },
    });

    await tx.todoTask.updateMany({
      where: {
        type: 'approval_task',
        relatedId: { in: tasks.map((t) => t.id) },
        status: 'pending',
      },
      data: { status: 'completed', completedAt: new Date(), completedBy: actorId },
    });
  }
}
