import { Injectable } from '@nestjs/common';
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
    return this.prisma.packagingMaterialUsage.create({
      data: {
        ...dto,
        company_id: '1',
        usage_date: dto.usage_date ? new Date(dto.usage_date) : new Date(),
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
