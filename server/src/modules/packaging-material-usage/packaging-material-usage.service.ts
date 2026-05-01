import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePackagingMaterialUsageDto } from './dto/create-packaging-material-usage.dto';

@Injectable()
export class PackagingMaterialUsageService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.packagingMaterialUsage.findMany({
      where: { company_id: '1', deleted_at: null },
      orderBy: { usage_date: 'desc' },
      take: 200,
    });
  }

  async create(dto: CreatePackagingMaterialUsageDto) {
    const material = await this.prisma.material.findFirst({
      where: { id: dto.material_id, deletedAt: null, status: 'active' },
    });
    if (!material) throw new BadRequestException('物料不存在或已停用');

    if (!dto.production_batch_id) {
      throw new BadRequestException('生产批次不能为空');
    }

    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: dto.production_batch_id },
      select: { id: true },
    });
    if (!batch) throw new NotFoundException('生产批次不存在');

    return this.prisma.packagingMaterialUsage.create({
      data: {
        company_id: '1',
        production_batch_id: dto.production_batch_id,
        material_id: material.id,
        material_name: material.name,
        material_code: material.materialCode,
        used_weight: dto.used_weight,
        waste_weight: dto.waste_weight,
        unit: dto.unit || material.unit,
        usage_date: dto.usage_date ? new Date(dto.usage_date) : new Date(),
        operator_id: dto.operator_id,
        notes: dto.notes,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.packagingMaterialUsage.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
