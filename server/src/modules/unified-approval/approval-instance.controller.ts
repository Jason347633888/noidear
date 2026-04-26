import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  start(@Body() dto: StartApprovalDto, @Request() req: any) {
    return this.engine.startApproval({ ...dto, createdById: req.user?.id ?? req.user?.userId ?? req.user?.sub });
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
  findOne(@Param('id') id: string) {
    return this.prisma.approvalInstance.findUnique({
      where: { id },
      include: { tasks: true, actions: true, definition: true },
    });
  }
}
