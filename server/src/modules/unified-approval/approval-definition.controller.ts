import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApprovalDefinitionDto, UpdateApprovalDefinitionDto } from './dto/approval-definition.dto';

function assertAdmin(req: any) {
  const roleCode = req?.user?.roleCode;
  if (roleCode !== 'admin') throw new ForbiddenException('仅管理员可操作审批定义');
}

@UseGuards(JwtAuthGuard)
@ModuleKey('document_approval')
@Controller('approval-definitions')
export class ApprovalDefinitionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(@Query('resourceType') resourceType?: string) {
    return this.prisma.approvalDefinition.findMany({
      where: { ...(resourceType ? { resourceType } : {}) },
      orderBy: [{ resourceType: 'asc' }, { triggerKey: 'asc' }, { version: 'desc' }],
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const record = await this.prisma.approvalDefinition.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
    return record;
  }

  @Post()
  create(@Body() body: CreateApprovalDefinitionDto, @Request() req: any) {
    assertAdmin(req);
    return this.prisma.approvalDefinition.create({ data: body as any });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateApprovalDefinitionDto, @Request() req: any) {
    assertAdmin(req);
    return this.prisma.approvalDefinition.update({ where: { id }, data: body as any });
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @Request() req: any) {
    assertAdmin(req);
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'active' } });
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @Request() req: any) {
    assertAdmin(req);
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'inactive' } });
  }
}
