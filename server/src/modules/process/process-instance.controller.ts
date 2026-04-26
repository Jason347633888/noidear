import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('流程实例')
@UseGuards(JwtAuthGuard)
@Controller('process/instances')
export class ProcessInstanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: '获取流程实例列表' })
  async findAll() {
    const instances = await this.prisma.processInstance.findMany({
      include: { stepData: true },
    });
    return { code: 0, data: instances, message: 'success' };
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

    await this.prisma.processStepData.upsert({
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
      const nextStep = (stepNumber || instance.currentStep) + 1;
      const template = await this.prisma.processTemplate.findUnique({
        where: { id: instance.templateId },
      });
      const steps = (template?.steps as any[]) || [];
      const maxStep = steps.length;

      await this.prisma.processInstance.update({
        where: { id },
        data: {
          currentStep: nextStep > maxStep ? maxStep : nextStep,
          status: nextStep > maxStep ? 'COMPLETED' : 'IN_PROGRESS',
        },
      });
    }

    return { code: 0, data: { success: true }, message: 'success' };
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

  @Post(':id/approve')
  @ApiOperation({ summary: '审批流程步骤' })
  async approveStep(
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

    const { stepNumber, action, comment } = body;

    await this.prisma.processStepData.updateMany({
      where: {
        instanceId: id,
        stepNumber: stepNumber || instance.currentStep,
      },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        approvedById: userId,
        approvedAt: new Date(),
        approvalComment: comment || '',
      },
    });

    return { code: 0, data: { success: true }, message: 'success' };
  }
}
