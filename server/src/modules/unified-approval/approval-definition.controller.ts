import { ModuleKey } from '../../shared/decorators/module-key.decorator';
import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApprovalDefinitionDto, StepDto, UpdateApprovalDefinitionDto } from './dto/approval-definition.dto';

function assertAdmin(req: any) {
  const roleCode = req?.user?.roleCode;
  if (roleCode !== 'admin') throw new ForbiddenException('仅管理员可操作审批定义');
}

@UseGuards(JwtAuthGuard)
@ModuleKey('document_approval')
@Controller('approval-definitions')
export class ApprovalDefinitionController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStepsValid(def: { steps: unknown }) {
    const steps = (def.steps as any[]) ?? [];
    if (!Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestException('审批模板缺少步骤');
    }
    for (const raw of steps) {
      const instance = plainToInstance(StepDto, raw);
      try {
        await validateOrReject(instance, { whitelist: true, forbidNonWhitelisted: true });
      } catch (err) {
        throw new BadRequestException(`审批模板步骤配置已失效 (invalid steps): ${JSON.stringify(err)}`);
      }
    }
  }

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
  async update(@Param('id') id: string, @Body() body: UpdateApprovalDefinitionDto, @Request() req: any) {
    assertAdmin(req);
    // If the PATCH sets status to 'active', validate the steps that will actually be saved:
    // if the request includes new steps, validate those; otherwise fall back to current steps.
    if ((body as any).status === 'active') {
      const current = await this.prisma.approvalDefinition.findUnique({ where: { id } });
      if (!current) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
      const stepsToValidate = body.steps ?? (current as any).steps;
      await this.assertStepsValid({ steps: stepsToValidate });
    }
    return this.prisma.approvalDefinition.update({ where: { id }, data: body as any });
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @Request() req: any) {
    assertAdmin(req);
    const current = await this.prisma.approvalDefinition.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
    await this.assertStepsValid(current);
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'active' } });
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string, @Request() req: any) {
    assertAdmin(req);
    const current = await this.prisma.approvalDefinition.findUnique({ where: { id } });
    if (!current) throw new NotFoundException(`ApprovalDefinition ${id} not found`);
    if (current.status === 'disabled_legacy') {
      throw new BadRequestException(
        '该模板处于 disabled_legacy 状态，必须先修改 steps 后再 activate，禁止直接 deactivate。',
      );
    }
    return this.prisma.approvalDefinition.update({ where: { id }, data: { status: 'inactive' } });
  }
}
