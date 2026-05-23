import { ModuleKey } from '../../shared/decorators/module-key.decorator';
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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/authenticated-user';
import { ApprovalEngineService } from '../unified-approval/approval-engine.service';

@ApiTags('流程实例')
@UseGuards(JwtAuthGuard)
@ModuleKey('production_execution')
@Controller('process/instances')
export class ProcessInstanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalEngine: ApprovalEngineService,
  ) {}

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
  async create(@Body() data: any, @Request() req: AuthenticatedRequest) {
    const userId = req.user.id;

    const productId = typeof data.productId === 'string' && data.productId.trim()
      ? data.productId.trim()
      : undefined;
    const product = productId
      ? await this.prisma.product.findFirst({
          where: { id: productId, deleted_at: null },
        })
      : null;

    if (productId && !product) {
      throw new BadRequestException('产品不存在或已删除');
    }

    const instance = await this.prisma.processInstance.create({
      data: {
        templateId: data.templateId,
        productId: product?.id,
        productName: product?.name ?? data.productName ?? '',
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
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;

    const instance = await this.prisma.processInstance.findUnique({
      where: { id },
    });
    if (!instance) {
      throw new NotFoundException('流程实例不存在');
    }

    const { stepNumber, data, saveAsDraft } = body;
    const actualStepNumber: number = stepNumber || instance.currentStep;

    const savedStepData = await this.prisma.processStepData.upsert({
      where: {
        instanceId_stepNumber: {
          instanceId: id,
          stepNumber: actualStepNumber,
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
        stepNumber: actualStepNumber,
        data: data || {},
        status: saveAsDraft ? 'PENDING' : 'SUBMITTED',
        submittedById: userId,
        submittedAt: new Date(),
      },
    });

    if (!saveAsDraft) {
      const template = await this.prisma.processTemplate.findUnique({
        where: { id: instance.templateId },
      });
      const steps = (template?.steps as any[]) ?? [];
      const stepConfig = steps.find((s: any) => s.stepNumber === actualStepNumber);
      if (!stepConfig) throw new BadRequestException('步骤配置不存在');

      const requiredApprovals: any[] = stepConfig.requiredApprovals ?? [];

      if (requiredApprovals.length > 0) {
        // 统一审批：步骤需要审批时，必须由 ApprovalDefinition 配置后通过 ApprovalEngineService 启动；
        // 不再保留旧 ProcessStepApproval 会签兜底通道。
        const productName =
          (data as any)?.productName ||
          instance.productName ||
          `流程实例 ${id}`;
        const approvalInstance = await this.approvalEngine.startApproval({
          resourceType: 'process_instance',
          resourceId: id,
          resourceStep: `step:${actualStepNumber}`,
          triggerKey: `step:${actualStepNumber}`,
          title: `${productName} — ${stepConfig.name ?? `步骤${actualStepNumber}`}审批`,
          createdById: userId,
        });
        await this.prisma.processStepData.update({
          where: { instanceId_stepNumber: { instanceId: id, stepNumber: actualStepNumber } },
          data: { approvalInstanceId: approvalInstance.id },
        });
      } else {
        // Step3: auto-approve when trialConclusion === '通过'
        const isStep3Pass =
          actualStepNumber === 3 && (data as any)?.trialConclusion === '通过';
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
