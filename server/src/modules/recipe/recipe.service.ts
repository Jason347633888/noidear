import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipeService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.recipe.findMany({
      where: { company_id: '1' },
      include: { lines: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.recipe.findMany({
      where: { product_id: productId, company_id: '1' },
      include: { lines: true },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, company_id: '1' },
      include: { lines: true },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${id} not found`);
    }
    return recipe;
  }

  async create(dto: CreateRecipeDto) {
    // Destructure known-schema fields; `name` and `is_allergen` are spec-only
    // and not yet present in the DB schema — exclude them from Prisma calls.
    const { product_id, version_note, lines } = dto;
    const schemaLines = lines.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ is_allergen: _ia, ...rest }) => rest,
    );

    // Archive all existing active recipes for this product
    await this.prisma.recipe.updateMany({
      where: { product_id, status: 'active', company_id: '1' },
      data: { status: 'archived' },
    });

    // Find the latest version number
    const latest = await this.prisma.recipe.findFirst({
      where: { product_id, company_id: '1' },
      orderBy: { version: 'desc' },
    });

    return this.prisma.recipe.create({
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
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.recipe.delete({
      where: { id },
    });
  }
}
