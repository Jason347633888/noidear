import { Body, Controller, Get, NotFoundException, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';
import { StartApprovalDto } from './dto';

@UseGuards(JwtAuthGuard)
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
  findAll() {
    return this.prisma.approvalInstance.findMany({
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('by-resource/:resourceType/:resourceId')
  findByResource(@Param('resourceType') resourceType: string, @Param('resourceId') resourceId: string) {
    return this.prisma.approvalInstance.findMany({
      where: { resourceType, resourceId },
      include: { tasks: true, actions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const record = await this.prisma.approvalInstance.findUnique({
      where: { id },
      include: { tasks: true, actions: true, definition: true },
    });
    if (!record) throw new NotFoundException(`ApprovalInstance ${id} not found`);
    return record;
  }
}
