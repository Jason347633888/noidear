import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  async findAll(archive = false) {
    return this.prisma.recipe.findMany({
      where: archive
        ? {
            company_id: '1',
            OR: [
              { status: 'archived' },
              { product: { deleted_at: { not: null } } },
              { product: { status: { not: 'active' } } },
            ],
          }
        : {
            company_id: '1',
            status: { in: ['draft', 'active'] },
            product: { deleted_at: null, status: 'active' },
          },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByProduct(productId: string, archive = false) {
    return this.prisma.recipe.findMany({
      where: {
        product_id: productId,
        company_id: '1',
        ...(archive
          ? {}
          : {
              status: { in: ['draft', 'active'] },
              product: { deleted_at: null, status: 'active' },
            }),
      },
      include: { lines: { include: { material: true } }, product: true },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, company_id: '1' },
      include: { lines: { include: { material: true } }, product: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.recipe.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async create(dto: CreateRecipeDto) {
    const { product_id, version_note, lines } = dto;

    return this.prisma.$transaction(async (tx) => {
      const areaSnapshots: Record<string, string> = {};
      for (const line of lines) {
        if (!areaSnapshots[line.area_id]) {
          const area = await tx.workshopArea.findFirst({
            where: { id: line.area_id, company_id: '1', status: 'active', deleted_at: null },
          });
          if (!area) {
            throw new BadRequestException(`配料区域不存在或已停用：${line.area_id}`);
          }
          areaSnapshots[line.area_id] = area.name;
        }
      }

      const schemaLines = lines.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ is_allergen: _ia, ...rest }) => ({
          ...rest,
          area_name_snapshot: areaSnapshots[rest.area_id],
        }),
      );

      await tx.recipe.updateMany({
        where: { product_id, status: 'active', company_id: '1' },
        data: { status: 'archived' },
      });

      const latest = await tx.recipe.findFirst({
        where: { product_id, company_id: '1' },
        orderBy: { version: 'desc' },
      });

      return tx.recipe.create({
        data: {
          company_id: '1',
          product_id,
          version: (latest?.version ?? 0) + 1,
          version_note,
          status: 'active',
          lines: { create: schemaLines },
        },
        include: { lines: true },
      });
    });
  }

  async remove(id: string) {
    return this.archive(id);
  }
}
