import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessInstanceDto, SubmitStepDto, ApproveStepDto, UpdateProductNameDto } from './dto';
import { ProcessStatus, ProcessStepStatus } from '@prisma/client';

@Injectable()
export class ProcessService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultTemplate() {
    const template = await this.prisma.processTemplate.findFirst({
      where: { isActive: true },
    });
    if (!template) {
      throw new NotFoundException('未找到激活的流程模板');
    }
    return template;
  }

  async listInstances(userId: string) {
    return this.prisma.processInstance.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { name: true } } },
    });
  }

  async getInstance(instanceId: string) {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: true,
        createdBy: { select: { id: true, name: true } },
        stepData: {
          include: {
            submittedBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { stepNumber: 'asc' },
        },
      },
    });
    if (!instance) {
      throw new NotFoundException(`流程实例 ${instanceId} 不存在`);
    }
    return { ...instance, stepDataList: instance.stepData };
  }

  async createInstance(userId: string, dto: CreateProcessInstanceDto) {
    return this.prisma.processInstance.create({
      data: {
        templateId: dto.templateId,
        productName: dto.productName ?? '',
        createdById: userId,
        updatedAt: new Date(),
      },
      include: { template: { select: { name: true } } },
    });
  }

  async getStepData(instanceId: string, stepNumber: number) {
    await this.getInstance(instanceId);
    const stepData = await this.prisma.processStepData.findUnique({
      where: { instanceId_stepNumber: { instanceId, stepNumber } },
    });
    if (!stepData) {
      return { stepNumber, data: {}, status: 'PENDING' };
    }
    return stepData;
  }

  async deleteInstance(instanceId: string, userId: string) {
    const instance = await this.getInstance(instanceId);
    if (instance.createdById !== userId) {
      throw new ForbiddenException('只有创建者才能删除流程实例');
    }
    if (instance.status === ProcessStatus.COMPLETED) {
      throw new ForbiddenException('已完成的流程实例不能删除');
    }
    return this.prisma.processInstance.delete({ where: { id: instanceId } });
  }

  async updateProductName(instanceId: string, dto: UpdateProductNameDto) {
    await this.getInstance(instanceId);
    return this.prisma.processInstance.update({
      where: { id: instanceId },
      data: { productName: dto.productName, updatedAt: new Date() },
    });
  }

  async submitStep(instanceId: string, userId: string, dto: SubmitStepDto) {
    const instance = await this.getInstance(instanceId);
    if (dto.stepNumber !== instance.currentStep) {
      throw new ForbiddenException(`当前步骤为 ${instance.currentStep}，不能提交步骤 ${dto.stepNumber}`);
    }

    const isDraft = dto.saveAsDraft === true;
    const stepStatus = isDraft ? ProcessStepStatus.IN_PROGRESS : ProcessStepStatus.SUBMITTED;
    const isApprovalStep = dto.stepNumber === 7 || dto.stepNumber === 8;

    const stepData = await this.prisma.processStepData.upsert({
      where: { instanceId_stepNumber: { instanceId, stepNumber: dto.stepNumber } },
      create: {
        instanceId,
        stepNumber: dto.stepNumber,
        data: dto.data as object,
        status: stepStatus,
        submittedById: userId,
        submittedAt: isDraft ? null : new Date(),
        updatedAt: new Date(),
      },
      update: {
        data: dto.data as object,
        status: stepStatus,
        submittedById: userId,
        submittedAt: isDraft ? undefined : new Date(),
        updatedAt: new Date(),
      },
    });

    if (!isDraft && !isApprovalStep) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (dto.stepNumber === 9) {
        updateData['status'] = ProcessStatus.COMPLETED;
      } else {
        updateData['currentStep'] = dto.stepNumber + 1;
      }
      if (dto.stepNumber === 1 && dto.data['productName']) {
        updateData['productName'] = dto.data['productName'];
      }
      await this.prisma.processInstance.update({
        where: { id: instanceId },
        data: updateData,
      });
    }

    return stepData;
  }

  async approveStep(instanceId: string, userId: string, dto: ApproveStepDto) {
    const stepData = await this.prisma.processStepData.findUnique({
      where: { instanceId_stepNumber: { instanceId, stepNumber: dto.stepNumber } },
    });

    if (!stepData || stepData.status !== ProcessStepStatus.SUBMITTED) {
      throw new ForbiddenException('步骤数据未提交或状态不正确，无法审批');
    }

    if (dto.action === 'approve') {
      await this.prisma.processStepData.update({
        where: { id: stepData.id },
        data: {
          status: ProcessStepStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          approvalComment: dto.comment ?? null,
          updatedAt: new Date(),
        },
      });
      return this.prisma.processInstance.update({
        where: { id: instanceId },
        data: { currentStep: dto.stepNumber + 1, updatedAt: new Date() },
      });
    }

    await this.prisma.processStepData.update({
      where: { id: stepData.id },
      data: {
        status: ProcessStepStatus.REJECTED,
        approvedById: userId,
        approvedAt: new Date(),
        approvalComment: dto.comment ?? null,
        updatedAt: new Date(),
      },
    });
    return this.prisma.processInstance.update({
      where: { id: instanceId },
      data: { currentStep: dto.stepNumber - 1, updatedAt: new Date() },
    });
  }
}
