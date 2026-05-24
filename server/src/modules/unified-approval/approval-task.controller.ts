import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalTaskActionDto, RejectApprovalTaskDto } from './dto';
import { OwnershipContext } from '../module-access/ownership-context';

@UseGuards(JwtAuthGuard)
@ModuleKey('work_execution')
@Controller('approval-tasks')
export class ApprovalTaskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ApprovalEngineService,
    private readonly resolver: ApprovalAssignmentResolver,
  ) {}

  @Get('my-pending')
  async findMyPending(@Request() req: AuthenticatedRequest) {
    const ownership: OwnershipContext | undefined = (req as any).ownership;
    const userId = req.user.id;

    // Build a scoped where clause using ownership if available
    const where: Record<string, unknown> = { status: 'PENDING' };

    if (ownership) {
      if (ownership.roleCode === 'user') {
        // user: direct assignment OR role-type tasks matching their roleCode
        where['OR'] = [
          { assigneeUserId: ownership.userId },
          { assigneeUserId: null, assigneeRoleCode: ownership.roleCode },
        ];
      } else if (ownership.roleCode === 'leader') {
        // leader can act as assignee directly, OR oversee tasks assigned to their dept members,
        // OR claim ROLE-type tasks matching their roleCode,
        // OR claim DEPARTMENT_ROLE-type tasks matching their departmentId
        const memberIds = ownership.managedDepartmentIds?.length
          ? (
              await this.prisma.user.findMany({
                where: { departmentId: { in: ownership.managedDepartmentIds } },
                select: { id: true },
              })
            ).map((u: { id: string }) => u.id)
          : [];
        where['OR'] = [
          { assigneeUserId: ownership.userId },
          ...(memberIds.length ? [{ assigneeUserId: { in: memberIds } }] : []),
          ...(ownership.managedDepartmentIds?.length
            ? [{ assigneeDepartmentId: { in: ownership.managedDepartmentIds } }]
            : []),
          // ROLE-type tasks: null assigneeUserId with roleCode matching leader's role
          { assigneeUserId: null, assigneeRoleCode: ownership.roleCode },
          // DEPARTMENT_ROLE-type tasks: null assigneeUserId with departmentId matching leader's dept
          ...(ownership.departmentId
            ? [{ assigneeUserId: null, assigneeDepartmentId: ownership.departmentId }]
            : []),
        ];
      }
      // admin: no ownership filter — sees all pending tasks
    }

    const rows = await this.prisma.approvalTask.findMany({
      where,
      include: { instance: true },
      orderBy: { createdAt: 'desc' },
    });
    const visible: typeof rows = [];
    for (const row of rows) {
      try {
        await this.resolver.assertCanAct({ userId, task: row });
        visible.push(row);
      } catch {
        // The resolver is the authorization boundary; unauthorized claimable tasks are hidden.
      }
    }
    return visible;
  }

  @Get('history')
  history(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.prisma.approvalAction.findMany({
      where: { actorId: userId },
      include: { instance: true, task: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const record = await this.prisma.approvalTask.findUnique({
      where: { id },
      include: { instance: { include: { tasks: true, actions: true } } },
    });
    if (!record) throw new NotFoundException(`ApprovalTask ${id} not found`);
    try {
      await this.resolver.assertCanAct({ userId, task: record });
    } catch {
      // Still allow viewing if user is the instance creator
      if (record.instance?.createdById !== userId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return record;
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApprovalTaskActionDto, @Request() req: AuthenticatedRequest) {
    return this.engine.approveTask(id, req.user.id, dto.comment ?? '', dto.metadata);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectApprovalTaskDto, @Request() req: AuthenticatedRequest) {
    return this.engine.rejectTask(id, req.user.id, dto.comment, dto.metadata);
  }
}
