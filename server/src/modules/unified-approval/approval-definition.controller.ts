import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
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
  findOne(@Param('id') id: string) {
    return this.prisma.approvalDefinition.findUnique({ where: { id } });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.approvalDefinition.create({ data: body });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: body });
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'active' } });
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'inactive' } });
  }
}
