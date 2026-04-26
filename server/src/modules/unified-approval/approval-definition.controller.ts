import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

function assertAdmin(req: any) {
  const role = req?.user?.role ?? req?.user?.roleObj?.code;
  if (role !== 'admin') throw new ForbiddenException('仅管理员可操作审批定义');
}

class CreateApprovalDefinitionDto {
  @IsString() module!: string;
  @IsString() resourceType!: string;
  @IsString() triggerKey!: string;
  @IsString() name!: string;
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsString() @IsIn(['active', 'inactive']) status?: string;
  @IsArray() steps!: unknown[];
}

class UpdateApprovalDefinitionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() @IsIn(['active', 'inactive']) status?: string;
  @IsOptional() @IsArray() steps?: unknown[];
}

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
