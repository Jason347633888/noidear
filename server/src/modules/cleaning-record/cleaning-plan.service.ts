import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCleaningPlanTemplateInput {
  company_id: string;
  name: string;
  area_type: string;
  version: string;
  effective_from?: Date;
  items: CleaningPlanTemplateItem[];
}

export interface CleaningPlanTemplateItem {
  target_name: string;
  target_type: string;
  method?: string;
  requires_disinfection?: boolean;
  disinfectant?: string;
  target_concentration?: number;
  normal_range?: string;
  is_mandatory?: boolean;
  requires_verification?: boolean;
  sequence?: number;
}

@Injectable()
export class CleaningPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(input: CreateCleaningPlanTemplateInput) {
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('模板至少需要一个清洁项目');
    }

    return this.prisma.cleaningPlanTemplate.create({
      data: {
        company_id: input.company_id,
        name: input.name,
        area_type: input.area_type,
        version: input.version,
        status: 'draft',
        effective_from: input.effective_from ?? null,
        items: input.items as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async cloneTemplateToArea(
    templateId: string,
    areaPointId: string,
    version: string,
    effectiveFrom: Date,
    frequency: string = 'daily',
  ) {
    const template = await this.prisma.cleaningPlanTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      throw new NotFoundException(`清洁计划模板不存在: ${templateId}`);
    }

    const area = await this.prisma.workshopArea.findUnique({
      where: { id: areaPointId },
    });
    if (!area) {
      throw new NotFoundException(`区域点位不存在: ${areaPointId}`);
    }

    const templateItems = template.items as unknown as CleaningPlanTemplateItem[];

    const plan = await this.prisma.cleaningPlan.create({
      data: {
        company_id: template.company_id,
        area_point_id: areaPointId,
        template_id: templateId,
        version,
        frequency,
        effective_from: effectiveFrom,
        status: 'draft',
      },
    });

    await this.prisma.cleaningPlanItem.createMany({
      data: templateItems.map((item, index) => ({
        plan_id: plan.id,
        target_name: item.target_name,
        target_type: item.target_type,
        method: item.method ?? null,
        requires_disinfection: item.requires_disinfection ?? false,
        disinfectant: item.disinfectant ?? null,
        target_concentration: item.target_concentration ?? null,
        normal_range: item.normal_range ?? null,
        is_mandatory: item.is_mandatory ?? true,
        requires_verification: item.requires_verification ?? false,
        sequence: item.sequence ?? index,
      })),
    });

    return this.prisma.cleaningPlan.findUnique({
      where: { id: plan.id },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
  }

  async activatePlan(planId: string) {
    const plan = await this.prisma.cleaningPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`清洁计划不存在: ${planId}`);
    }

    if (plan.status === 'active') {
      throw new BadRequestException('该计划已处于激活状态，不能重复激活');
    }

    return this.prisma.$transaction(async (tx) => {
      // Retire any existing active plan for the same area point
      const activePlans = await tx.cleaningPlan.findMany({
        where: {
          area_point_id: plan.area_point_id,
          company_id: plan.company_id,
          status: 'active',
        },
      });

      if (activePlans.length > 0) {
        await tx.cleaningPlan.updateMany({
          where: {
            area_point_id: plan.area_point_id,
            company_id: plan.company_id,
            status: 'active',
          },
          data: {
            status: 'retired',
            effective_to: new Date(),
          },
        });
      }

      return tx.cleaningPlan.update({
        where: { id: planId },
        data: { status: 'active' },
        include: { items: { orderBy: { sequence: 'asc' } } },
      });
    });
  }

  async listActivePlans(areaPointId?: string) {
    return this.prisma.cleaningPlan.findMany({
      where: {
        status: 'active',
        ...(areaPointId ? { area_point_id: areaPointId } : {}),
      },
      include: {
        area_point: { select: { id: true, name: true, type: true } },
        items: { orderBy: { sequence: 'asc' } },
      },
      orderBy: { effective_from: 'desc' },
    });
  }

  async listTemplates(companyId: string, areaType?: string) {
    return this.prisma.cleaningPlanTemplate.findMany({
      where: {
        company_id: companyId,
        ...(areaType ? { area_type: areaType } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
