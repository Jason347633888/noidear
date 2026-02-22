import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  QueryMaterialDto,
} from './dto/material.dto';

@Injectable()
export class MaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createMaterialDto: CreateMaterialDto) {
    try {
      return await this.prisma.material.create({
        data: createMaterialDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Material code already exists');
      }
      throw error;
    }
  }

  async findAll(query: QueryMaterialDto) {
    const { page = 1, limit = 10, search, categoryId, status } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(search, categoryId, status);

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        skip,
        take: limit,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.material.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(search?: string, categoryId?: string, status?: string) {
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { materialCode: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  async findOne(id: string) {
    const material = await this.prisma.material.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!material || material.deletedAt) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async update(id: string, updateMaterialDto: UpdateMaterialDto) {
    await this.findOne(id);

    return this.prisma.material.update({
      where: { id },
      data: updateMaterialDto,
    });
  }

  async remove(id: string) {
    const material = await this.findOne(id);

    return this.prisma.material.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
