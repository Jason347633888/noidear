import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessInstanceDto, SubmitStepDto, ApproveStepDto, UpdateProductNameDto } from './dto';
import { ProcessStatus } from '@prisma/client';

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
      },
    });
    if (!instance) {
      throw new NotFoundException(`流程实例 ${instanceId} 不存在`);
    }
    return instance;
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

  async submitStep(instanceId: string, userId: string, dto: SubmitStepDto): Promise<unknown> {
    throw new Error('Not implemented yet');
  }

  async approveStep(instanceId: string, userId: string, dto: ApproveStepDto): Promise<unknown> {
    throw new Error('Not implemented yet');
  }
}
