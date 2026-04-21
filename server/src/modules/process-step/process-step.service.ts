import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProcessStepDto } from './dto/create-process-step.dto';
import { UpdateProcessStepDto } from './dto/update-process-step.dto';

@Injectable()
export class ProcessStepService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.processStep.findMany({
      where: { company_id: '1', deleted_at: null },
      orderBy: [{ step_no: 'asc' }, { created_at: 'desc' }],
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.processStep.findMany({
      where: { company_id: '1', product_id: productId, deleted_at: null },
      orderBy: { step_no: 'asc' },
    });
  }

  async findOne(id: string) {
    const step = await this.prisma.processStep.findFirst({
      where: { id, company_id: '1', deleted_at: null },
    });
    if (!step) {
      throw new NotFoundException(`ProcessStep ${id} not found`);
    }
    return step;
  }

  async create(dto: CreateProcessStepDto) {
    return this.prisma.processStep.create({
      data: {
        company_id: '1',
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

  async update(id: string, dto: UpdateProcessStepDto) {
    await this.findOne(id);
    return this.prisma.processStep.update({
      where: { id },
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
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.processStep.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
