import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalAssignmentDefinition, ResolvedAssignment } from './types';

interface CanActInput {
  userId: string;
  task: {
    assigneeUserId?: string | null;
    assigneeRoleCode?: string | null;
    assigneeDepartmentId?: string | null;
    status: string;
  };
}

@Injectable()
export class ApprovalAssignmentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAssignment(assignment: ApprovalAssignmentDefinition): Promise<ResolvedAssignment> {
    if (assignment.type === 'USER') {
      if (!assignment.userId) throw new NotFoundException('审批定义缺少 userId');
      return { assignment, assigneeUserIds: [assignment.userId], claimMode: 'DIRECT' };
    }

    if (assignment.type === 'ROLE') {
      if (!assignment.roleCode) throw new NotFoundException('审批定义缺少 roleCode');
      const users = await this.prisma.user.findMany({
        where: { status: 'active', roleObj: { code: assignment.roleCode } },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeRoleCode: assignment.roleCode,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'DEPARTMENT_ROLE') {
      if (!assignment.departmentId || !assignment.roleCode) {
        throw new NotFoundException('审批定义缺少 departmentId 或 roleCode');
      }
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          departmentId: assignment.departmentId,
          roleObj: { code: assignment.roleCode },
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeRoleCode: assignment.roleCode,
        assigneeDepartmentId: assignment.departmentId,
        claimMode: 'CLAIMABLE',
      };
    }

    throw new NotFoundException('不支持的审批分配类型');
  }

  async assertCanAct(input: CanActInput): Promise<void> {
    if (input.task.status !== 'PENDING') {
      throw new ForbiddenException('审批任务不是待处理状态');
    }
    const user = (await this.prisma.user.findUnique({
      where: { id: input.userId },
      include: { roleObj: true },
    })) as any;
    if (!user) throw new ForbiddenException('用户不存在');
    const roleCode = user.roleObj?.code as string | undefined;
    if (!roleCode) throw new ForbiddenException('用户缺少正式角色');
    if (roleCode === 'admin') return;

    if (input.task.assigneeUserId && input.task.assigneeUserId === input.userId) return;
    if (input.task.assigneeRoleCode && input.task.assigneeRoleCode === roleCode) {
      if (input.task.assigneeDepartmentId) {
        if (input.task.assigneeDepartmentId === user.departmentId) return;
      } else {
        return;
      }
    }
    if (
      input.task.assigneeDepartmentId &&
      !input.task.assigneeRoleCode &&
      input.task.assigneeDepartmentId === user.departmentId
    ) return;

    throw new ForbiddenException('无权处理该审批任务');
  }
}
