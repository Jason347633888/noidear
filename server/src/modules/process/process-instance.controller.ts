import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProcessStepApprovalService } from './process-step-approval.service';

@ApiTags('流程实例')
@UseGuards(JwtAuthGuard)
@Controller('process/instances')
export class ProcessInstanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ProcessStepApprovalService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取流程实例列表' })
  async findAll() {
    const instances = await this.prisma.processInstance.findMany({
      include: { stepData: true },
    });
    return { code: 0, data: instances, message: 'success' };
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: '查我的待签任务' })
  async getPendingApprovals(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const list = await this.approvalService.listPendingForUser(userId);
    return { code: 0, data: list, message: 'success' };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取流程实例详情' })
  async findOne(@Param('id') id: string) {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id },
      include: { stepData: true },
    });
    if (!instance) {
      throw new NotFoundException('流程实例不存在');
    }
    return { code: 0, data: instance, message: 'success' };
  }

  @Post()
  @ApiOperation({ summary: '创建流程实例' })
  async create(@Body() data: any, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const instance = await this.prisma.processInstance.create({
      data: {
        templateId: data.templateId,
        productName: data.productName || '',
        createdById: userId,
        status: 'DRAFT',
        currentStep: 1,
      },
    });
    return { code: 0, data: instance, message: 'success' };
  }

  @Post(':id/steps')
  @ApiOperation({ summary: '提交流程步骤' })
  async submitStep(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;

    const instance = await this.prisma.processInstance.findUnique({
      where: { id },
    });
    if (!instance) {
      throw new NotFoundException('流程实例不存在');
    }

    const { stepNumber, data, saveAsDraft } = body;

    const savedStepData = await this.prisma.processStepData.upsert({
      where: {
        instanceId_stepNumber: {
          instanceId: id,
          stepNumber: stepNumber || instance.currentStep,
        },
      },
      update: {
        data: data || {},
        status: saveAsDraft ? 'PENDING' : 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
      },
      create: {
        instanceId: id,
        stepNumber: stepNumber || instance.currentStep,
        data: data || {},
        status: saveAsDraft ? 'PENDING' : 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
      },
    });

    if (!saveAsDraft) {
      const actualStepNumber = stepNumber || instance.currentStep;
      const template = await this.prisma.processTemplate.findUnique({
        where: { id: instance.templateId },
      });
      const steps = (template?.steps as any[]) ?? [];
      const stepConfig = steps.find((s: any) => s.stepNumber === actualStepNumber);
      if (!stepConfig) throw new BadRequestException('步骤配置不存在');

      const requiredApprovals = stepConfig.requiredApprovals ?? [];
      if (requiredApprovals.length > 0) {
        await this.approvalService.ensureApprovalSlots(id, actualStepNumber, requiredApprovals);
      } else {
        // Step3 无需审批人，只有 trialConclusion==='通过' 才自动批准并推进
        const isStep3Pass = actualStepNumber === 3 && (data as any)?.trialConclusion === '通过';
        if (!isStep3Pass) {
          throw new BadRequestException('无审批步骤必须满足通过条件后才能提交');
        }

        const maxStep = steps.length;
        const nextStep = actualStepNumber + 1;
        await this.prisma.$transaction([
          this.prisma.processStepData.update({
            where: { instanceId_stepNumber: { instanceId: id, stepNumber: actualStepNumber } },
            data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
          }),
          this.prisma.processInstance.update({
            where: { id },
            data: {
              currentStep: nextStep > maxStep ? maxStep : nextStep,
              status: 'IN_PROGRESS',
            },
          }),
        ]);
      }
    }

    return { code: 0, data: savedStepData, message: 'success' };
  }

  @Post(':id/steps/:stepNumber/approvals')
  @ApiOperation({ summary: '提交会签' })
  async submitApproval(
    @Param('id') id: string,
    @Param('stepNumber') stepNumber: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const { action, comment = '', role: requestedRole } = body;
    const result = await this.approvalService.submitApproval(
      id, parseInt(stepNumber), userId, action, comment, requestedRole,
    );
    return { code: 0, data: result, message: 'success' };
  }

  @Get(':id/approvals')
  @ApiOperation({ summary: '查询步骤会签记录' })
  async getApprovals(
    @Param('id') id: string,
    @Query('stepNumber') stepNumber?: string,
  ) {
    const approvals = await this.approvalService.listApprovals(
      id, stepNumber ? parseInt(stepNumber) : undefined,
    );
    return { code: 0, data: approvals, message: 'success' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除流程实例' })
  async remove(@Param('id') id: string) {
    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) {
      throw new NotFoundException('流程实例不存在');
    }
    await this.prisma.processStepData.deleteMany({ where: { instanceId: id } });
    await this.prisma.processInstance.delete({ where: { id } });
    return { code: 0, data: { success: true }, message: 'success' };
  }
}
