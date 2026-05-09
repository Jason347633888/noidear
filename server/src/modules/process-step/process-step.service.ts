import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';

@Injectable()
export class ProcessStepService {
  constructor(private prisma: PrismaService) {}

  private assertHasProductOrRecipe(productId?: string, recipeId?: string) {
    const hasProduct = typeof productId === 'string' && productId.trim().length > 0;
    const hasRecipe = typeof recipeId === 'string' && recipeId.trim().length > 0;

    if (!hasProduct && !hasRecipe) {
      throw new BadRequestException('工序必须关联产品或配方');
    }
  }

  async findAll(companyId: string) {
    return this.prisma.processStep.findMany({
      where: { company_id: companyId, deleted_at: null },
      orderBy: [{ step_no: 'asc' }, { created_at: 'desc' }],
    });
  }

  async findByProduct(productId: string, companyId: string) {
    return this.prisma.processStep.findMany({
      where: { company_id: companyId, product_id: productId, deleted_at: null },
      orderBy: { step_no: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const step = await this.prisma.processStep.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    });
    if (!step) {
      throw new NotFoundException(`ProcessStep ${id} not found`);
    }
    return step;
  }

  async create(dto: CreateProcessStepDto, companyId: string) {
    this.assertHasProductOrRecipe(dto.product_id, dto.recipe_id);

    return this.prisma.processStep.create({
      data: {
        company_id: companyId,
        product_id: dto.product_id,
        recipe_id: dto.recipe_id,
        step_no: dto.step_no,
        step_name: dto.step_name,
        name: dto.step_name,
        seq: dto.step_no,
        description: dto.description,
        is_ccp: dto.is_ccp,
        control_measures: dto.control_measures,
        critical_limit: dto.critical_limit,
        monitoring_method: dto.monitoring_method,
        monitoring_frequency: dto.monitoring_frequency,
        corrective_action: dto.corrective_action,
        responsible_person: dto.responsible_person,
      },
    });
  }

  async update(id: string, dto: UpdateProcessStepDto, companyId: string) {
    const result = await this.prisma.processStep.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: {
        ...(dto.product_id !== undefined && { product_id: dto.product_id }),
        ...(dto.recipe_id !== undefined && { recipe_id: dto.recipe_id }),
        ...(dto.step_no !== undefined && { step_no: dto.step_no, seq: dto.step_no }),
        ...(dto.step_name !== undefined && { step_name: dto.step_name, name: dto.step_name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.is_ccp !== undefined && { is_ccp: dto.is_ccp }),
        ...(dto.control_measures !== undefined && { control_measures: dto.control_measures }),
        ...(dto.critical_limit !== undefined && { critical_limit: dto.critical_limit }),
        ...(dto.monitoring_method !== undefined && { monitoring_method: dto.monitoring_method }),
        ...(dto.monitoring_frequency !== undefined && { monitoring_frequency: dto.monitoring_frequency }),
        ...(dto.corrective_action !== undefined && { corrective_action: dto.corrective_action }),
        ...(dto.responsible_person !== undefined && { responsible_person: dto.responsible_person }),
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(`ProcessStep ${id} not found`);
    }
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string) {
    const result = await this.prisma.processStep.updateMany({
      where: { id, company_id: companyId, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException(`ProcessStep ${id} not found`);
    }
    return { success: true };
  }
}
