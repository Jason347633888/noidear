import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { StartApprovalDto } from './dto';
import { Ownership } from '../../shared/decorators/ownership.decorator';
import { OwnershipContext } from '../module-access/ownership-context';

interface ApprovalTaskRecord {
  assigneeUserId: string | null;
  assigneeRoleCode: string | null;
  assigneeDepartmentId: string | null;
}

@UseGuards(JwtAuthGuard)
@ModuleKey('work_execution')
@Controller('approval-instances')
export class ApprovalInstanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ApprovalEngineService,
  ) {}

  @Post()
  start(@Body() dto: StartApprovalDto, @Request() req: AuthenticatedRequest) {
    return this.engine.startApproval({ ...dto, createdById: req.user.id });
  }

  @Get()
  async findAll(@Ownership() ownership: OwnershipContext) {
    const where: Record<string, unknown> = {};

    if (ownership.roleCode === 'user') {
      where['createdById'] = ownership.userId;
    } else if (ownership.roleCode === 'leader') {
      const memberIds = ownership.managedDepartmentIds?.length
        ? (
            await this.prisma.user.findMany({
              where: { departmentId: { in: ownership.managedDepartmentIds } },
              select: { id: true },
            })
          ).map((u: { id: string }) => u.id)
        : [];
      where['createdById'] = { in: memberIds };
    }
    // admin: no filter

    return this.prisma.approvalInstance.findMany({
      where,
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('by-resource/:resourceType/:resourceId')
  async findByResource(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
    @Ownership() ownership: OwnershipContext,
  ) {
    const records = await this.prisma.approvalInstance.findMany({
      where: { resourceType, resourceId },
      include: { tasks: true, actions: true },
      orderBy: { createdAt: 'desc' },
    });

    if (ownership.roleCode === 'admin') {
      return records;
    }

    const allowedIds = await this.resolveAllowedCreatorIds(ownership);
    return records.filter(
      (r: { createdById: string; tasks?: ApprovalTaskRecord[] }) =>
        allowedIds.has(r.createdById) || this.isTaskCandidate(r.tasks, ownership),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Ownership() ownership: OwnershipContext) {
    const record = await this.prisma.approvalInstance.findUnique({
      where: { id },
      include: { tasks: true, actions: true, definition: true },
    });
    if (!record) throw new NotFoundException(`ApprovalInstance ${id} not found`);

    if (ownership.roleCode !== 'admin') {
      const allowedIds = await this.resolveAllowedCreatorIds(ownership);
      const isCreatorOrSubordinate = allowedIds.has(record.createdById);
      const isCandidate = this.isTaskCandidate((record as any).tasks ?? [], ownership);
      if (!isCreatorOrSubordinate && !isCandidate) {
        throw new ForbiddenException('Access denied to this approval instance');
      }
    }

    return record;
  }

  private async resolveAllowedCreatorIds(ownership: OwnershipContext): Promise<Set<string>> {
    if (ownership.roleCode === 'user') {
      return new Set([ownership.userId]);
    }
    // leader
    const memberIds = ownership.managedDepartmentIds?.length
      ? (
          await this.prisma.user.findMany({
            where: { departmentId: { in: ownership.managedDepartmentIds } },
            select: { id: true },
          })
        ).map((u: { id: string }) => u.id)
      : [];
    return new Set(memberIds);
  }

  private isTaskCandidate(tasks: ApprovalTaskRecord[] | undefined, ownership: OwnershipContext): boolean {
    if (!tasks || tasks.length === 0) return false;
    return tasks.some((task) => {
      // 直接指派给用户：仅匹配 userId
      if (task.assigneeUserId !== null) {
        return task.assigneeUserId === ownership.userId;
      }
      // 同时设置 roleCode 和 departmentId（DEPT_ROLE 类型）：必须两者都匹配
      // 仅设置其中一项：匹配该项即可
      const roleMatch = task.assigneeRoleCode === null || task.assigneeRoleCode === ownership.roleCode;
      const deptMatch = task.assigneeDepartmentId === null || task.assigneeDepartmentId === ownership.departmentId;
      return roleMatch && deptMatch && (task.assigneeRoleCode !== null || task.assigneeDepartmentId !== null);
    });
  }
}
