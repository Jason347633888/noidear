import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalTodoBridge } from './approval-todo.bridge';
import { ApprovalNotificationBridge } from './approval-notification.bridge';
import { ApprovalCallbackRegistry } from './approval-callback.registry';
import type { ApprovalStepDefinition, StartApprovalInput } from './types';

@Injectable()
export class ApprovalEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ApprovalAssignmentResolver,
    private readonly todoBridge: ApprovalTodoBridge,
    private readonly notificationBridge: ApprovalNotificationBridge,
    private readonly callbackRegistry: ApprovalCallbackRegistry,
  ) {}

  async startApproval(input: StartApprovalInput) {
    const runner = async (tx: any) => {
      const definition = await tx.approvalDefinition.findFirst({
        where: { resourceType: input.resourceType, triggerKey: input.triggerKey, status: 'active' },
        orderBy: { version: 'desc' },
      });
      if (!definition) throw new NotFoundException('审批定义不存在');

      const steps = definition.steps as ApprovalStepDefinition[];
      const firstStep = steps[0];
      if (!firstStep) throw new BadRequestException('审批定义缺少步骤');

      const instance = await tx.approvalInstance.create({
        data: {
          definitionId: definition.id,
          definitionVersion: definition.version,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          resourceStep: input.resourceStep,
          triggerKey: input.triggerKey,
          title: input.title,
          currentStepKey: firstStep.stepKey,
          createdById: input.createdById,
        },
      });

      await this.createTasksForStep(tx, instance, firstStep);
      await tx.approvalAction.create({
        data: {
          instanceId: instance.id,
          actorId: input.createdById,
          action: 'COMMENT',
          comment: '审批流程已发起',
          snapshot: { resourceType: input.resourceType, resourceId: input.resourceId, triggerKey: input.triggerKey },
        },
      });

      return instance;
    };

    return input.tx ? runner(input.tx) : this.prisma.$transaction(runner);
  }

  private async createTasksForStep(tx: any, instance: any, step: ApprovalStepDefinition) {
    for (const assignment of step.assignments) {
      const resolved = await this.resolver.resolveAssignment(assignment);
      const directUserIds = resolved.claimMode === 'DIRECT' ? resolved.assigneeUserIds : [null];

      for (const userId of directUserIds) {
        const task = await tx.approvalTask.create({
          data: {
            instanceId: instance.id,
            stepKey: step.stepKey,
            stepName: step.stepName,
            approvalMode: step.mode,
            assignmentType: assignment.type,
            assigneeUserId: userId,
            assigneeRoleCode: resolved.assigneeRoleCode,
            assigneeDepartmentId: resolved.assigneeDepartmentId,
            assigneePermissionCode: resolved.assigneePermissionCode,
            claimMode: resolved.claimMode,
            dueAt: step.dueHours ? new Date(Date.now() + step.dueHours * 60 * 60 * 1000) : undefined,
          },
          include: { instance: true },
        });
        await this.todoBridge.createTaskTodos({ tx, task, candidateUserIds: resolved.assigneeUserIds });
        await this.notificationBridge.notifyTaskCreated(resolved.assigneeUserIds, instance.title, task.id);
      }
    }
  }

  async approveTask(taskId: string, actorId: string, comment = '') {
    return this.completeTask(taskId, actorId, 'APPROVED', comment);
  }

  async rejectTask(taskId: string, actorId: string, comment: string) {
    return this.completeTask(taskId, actorId, 'REJECTED', comment);
  }

  private async completeTask(taskId: string, actorId: string, status: 'APPROVED' | 'REJECTED', comment: string) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.approvalTask.findUnique({
        where: { id: taskId },
        include: { instance: { include: { definition: true } } },
      });
      if (!task) throw new NotFoundException('审批任务不存在');
      if (task.status !== 'PENDING') throw new BadRequestException('审批任务已经处理');

      await this.resolver.assertCanAct({ userId: actorId, task });

      const updated = await tx.approvalTask.update({
        where: { id: taskId },
        data: { status, actedById: actorId, claimedById: actorId, comment, actedAt: new Date() },
      });
      await tx.approvalAction.create({
        data: {
          instanceId: task.instanceId,
          taskId,
          actorId,
          action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
          comment,
          snapshot: {
            stepKey: task.stepKey,
            approvalMode: task.approvalMode,
            assignmentType: task.assignmentType,
            assigneeUserId: task.assigneeUserId,
            assigneeRoleCode: task.assigneeRoleCode,
            assigneeDepartmentId: task.assigneeDepartmentId,
            assigneePermissionCode: task.assigneePermissionCode,
          },
        },
      });
      await this.todoBridge.closeTaskTodos(tx, taskId, actorId);

      if (status === 'REJECTED') {
        await tx.approvalTask.updateMany({
          where: { instanceId: task.instanceId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        await tx.approvalInstance.update({
          where: { id: task.instanceId },
          data: { status: 'REJECTED', completedAt: new Date() },
        });
        await this.todoBridge.cancelInstanceTodos(tx, task.instanceId, actorId);
        await this.notificationBridge.notifyRequester(task.instance.createdById, 'rejected', task.instance.title);
        return updated;
      }

      await this.advanceIfStepComplete(tx, task, actorId, comment);
      return updated;
    });
  }

  private async advanceIfStepComplete(tx: any, task: any, actorId: string, comment: string) {
    const pending = await tx.approvalTask.findMany({
      where: { instanceId: task.instanceId, stepKey: task.stepKey, status: 'PENDING' },
    });

    const isComplete =
      task.approvalMode === 'single' ||
      task.approvalMode === 'countersign_any' ||
      pending.length === 0;

    if (!isComplete) return;

    if (task.approvalMode === 'countersign_any') {
      await tx.approvalTask.updateMany({
        where: { instanceId: task.instanceId, stepKey: task.stepKey, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      await this.todoBridge.cancelInstanceTodos(tx, task.instanceId, actorId);
    }

    const steps = task.instance.definition.steps as ApprovalStepDefinition[];
    const currentIndex = steps.findIndex((s) => s.stepKey === task.stepKey);
    const currentStep = steps[currentIndex];
    const nextStep = steps[currentIndex + 1];

    if (nextStep) {
      await tx.approvalInstance.update({
        where: { id: task.instanceId },
        data: { currentStepKey: nextStep.stepKey },
      });
      await this.createTasksForStep(tx, task.instance, nextStep);
      return;
    }

    await this.callbackRegistry.invoke(currentStep.onApproved, {
      tx,
      instanceId: task.instanceId,
      resourceType: task.instance.resourceType,
      resourceId: task.instance.resourceId,
      resourceStep: task.instance.resourceStep,
      triggerKey: task.instance.triggerKey,
      actorId,
      taskId: task.id,
      comment,
    });
    await tx.approvalInstance.update({
      where: { id: task.instanceId },
      data: { status: 'APPROVED', completedAt: new Date() },
    });
    await this.notificationBridge.notifyRequester(task.instance.createdById, 'approved', task.instance.title);
  }
}
