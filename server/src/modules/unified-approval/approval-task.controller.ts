import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalAssignmentResolver } from './approval-assignment.resolver';
import { ApprovalTaskActionDto, RejectApprovalTaskDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('approval-tasks')
export class ApprovalTaskController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ApprovalEngineService,
    private readonly resolver: ApprovalAssignmentResolver,
  ) {}

  @Get('my-pending')
  async findMyPending(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const rows = await this.prisma.approvalTask.findMany({
      where: { status: 'PENDING' },
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
  history(@Request() req: any) {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    return this.prisma.approvalAction.findMany({
      where: { actorId: userId },
      include: { instance: true, task: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.approvalTask.findUnique({
      where: { id },
      include: { instance: { include: { tasks: true, actions: true } } },
    });
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApprovalTaskActionDto, @Request() req: any) {
    return this.engine.approveTask(id, req.user?.id ?? req.user?.userId ?? req.user?.sub, dto.comment ?? '');
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectApprovalTaskDto, @Request() req: any) {
    return this.engine.rejectTask(id, req.user?.id ?? req.user?.userId ?? req.user?.sub, dto.comment);
  }
}
