import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalAssignmentDefinition, ResolvedAssignment } from './types';

interface CanActInput {
  userId: string;
  task: {
    assigneeUserId?: string | null;
    assigneeRoleCode?: string | null;
    assigneeDepartmentId?: string | null;
    assigneePermissionCode?: string | null;
    status: string;
  };
}

@Injectable()
export class ApprovalAssignmentResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAssignment(assignment: ApprovalAssignmentDefinition): Promise<ResolvedAssignment> {
    if (assignment.type === 'user') {
      if (!assignment.userId) throw new NotFoundException('审批定义缺少 userId');
      return { assignment, assigneeUserIds: [assignment.userId], claimMode: 'DIRECT' };
    }

    if (assignment.type === 'role') {
      if (!assignment.roleCode) throw new NotFoundException('审批定义缺少 roleCode');
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          OR: [{ role: assignment.roleCode }, { roleObj: { code: assignment.roleCode } }],
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeRoleCode: assignment.roleCode,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'department') {
      const department = assignment.departmentId
        ? { id: assignment.departmentId }
        : await this.prisma.department.findUnique({
            where: { code: assignment.departmentCode ?? '' },
            select: { id: true },
          });
      if (!department?.id) throw new NotFoundException('审批定义找不到部门');

      const users = await this.prisma.user.findMany({
        where: { status: 'active', departmentId: department.id },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneeDepartmentId: department.id,
        claimMode: 'CLAIMABLE',
      };
    }

    if (assignment.type === 'permission') {
      if (!assignment.permissionCode) throw new NotFoundException('审批定义缺少 permissionCode');
      const users = await this.prisma.user.findMany({
        where: {
          status: 'active',
          userPermissions: {
            some: {
              fineGrainedPermission: { code: assignment.permissionCode },
            },
          },
        },
        select: { id: true },
      });
      return {
        assignment,
        assigneeUserIds: users.map((u: { id: string }) => u.id),
        assigneePermissionCode: assignment.permissionCode,
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
      include: {
        roleObj: true,
        userPermissions: { include: { fineGrainedPermission: true } },
      },
    })) as any;
    if (!user) throw new ForbiddenException('用户不存在');

    const roleCode = (user.roleObj as any)?.code ?? (user.role as string);
    if (roleCode === 'admin') return;
    if (input.task.assigneeUserId && input.task.assigneeUserId === input.userId) return;
    if (input.task.assigneeRoleCode && input.task.assigneeRoleCode === roleCode) return;
    if (input.task.assigneeDepartmentId && input.task.assigneeDepartmentId === user.departmentId) return;
    if (
      input.task.assigneePermissionCode &&
      (user.userPermissions as any[]).some(
        (p: any) => p.fineGrainedPermission?.code === input.task.assigneePermissionCode,
      )
    ) {
      return;
    }

    throw new ForbiddenException('无权处理该审批任务');
  }
}
