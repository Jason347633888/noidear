import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFragileItemInspectionDto } from './dto/create-fragile-item-inspection.dto';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

@Injectable()
export class FragileItemInspectionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFragileItemInspectionDto, companyId: string) {
    const productionBatch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true, productId: true },
    });

    if (!productionBatch || !productionBatch.productId) {
      throw new BadRequestException('生产批次不存在');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productionBatch.productId },
      select: { company_id: true },
    });

    if (!product || product.company_id !== companyId) {
      throw new BadRequestException('生产批次不存在');
    }

    return this.prisma.fragileItemInspection.create({
      data: {
        ...dto,
        company_id: companyId,
        inspected_at: new Date(dto.inspected_at),
      },
    });
  }

  async findAll(startDate?: string, endDate?: string, ownership?: OwnershipContext) {
    const where: Record<string, unknown> = {
      company_id: '1',
      ...(startDate || endDate
        ? {
            inspected_at: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    // Ownership scoping — FragileItemInspection.inspector_id is the user FK
    if (ownership && ownership.roleCode !== 'admin') {
      if (ownership.roleCode === 'user') {
        where['inspector_id'] = ownership.userId;
      } else if (ownership.roleCode === 'leader') {
        const memberIds = await userIdsInDepts(this.prisma, ownership.managedDepartmentIds);
        if (memberIds.length === 0) return [];
        where['inspector_id'] = { in: memberIds };
      }
    }

    return this.prisma.fragileItemInspection.findMany({
      where,
      orderBy: { inspected_at: 'desc' },
      take: 200,
    });
  }

  async remove(id: string) {
    return this.prisma.fragileItemInspection.delete({ where: { id } });
  }
}
