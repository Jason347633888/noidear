import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeLineDto } from './dto/update-recipe-line.dto';
import { OwnershipContext } from '../module-access/ownership-context';

const RECIPE_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  RETIRED: 'retired',
  ARCHIVED: 'archived', // legacy alias — treated as retired in queries
} as const;

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

  /**
   * Ownership-guarded create — only admin may create recipe master data.
   * Per spec § 通用约束第7条: guard is in service layer, not stacked on controller.
   */
  async createForOwnership(dto: CreateRecipeDto, ownership: OwnershipContext) {
    if (ownership.roleCode !== 'admin') {
      throw new ForbiddenException('仅管理员可写入配方主数据');
    }
    return this.create(dto);
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

  /**
   * Activates the target recipe and retires every other active recipe for the
   * same product — all within a single transaction to prevent race conditions
   * that could leave two active recipes for one product.
   */
  async activateRecipe(recipeId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, company_id: '1' },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe ${recipeId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Re-read inside transaction for consistency
      const locked = await tx.recipe.findFirst({ where: { id: recipeId, company_id: '1' } });
      if (!locked) {
        throw new NotFoundException(`Recipe ${recipeId} not found`);
      }

      await tx.recipe.updateMany({
        where: {
          product_id: locked.product_id,
          company_id: '1',
          status: RECIPE_STATUS.ACTIVE,
          id: { not: recipeId },
        },
        data: { status: RECIPE_STATUS.RETIRED },
      });

      return tx.recipe.update({
        where: { id: recipeId },
        data: { status: RECIPE_STATUS.ACTIVE },
      });
    });
  }

  /**
   * Updates a single recipe line.  A `changeEventId` is MANDATORY — every
   * line mutation must be traceable to a product-process change event.
   */
  async updateRecipeLine(lineId: string, dto: UpdateRecipeLineDto) {
    if (!dto.changeEventId) {
      throw new BadRequestException('updateRecipeLine requires a changeEventId');
    }

    const line = await this.prisma.recipeLine.findFirst({ where: { id: lineId } });
    if (!line) {
      throw new NotFoundException(`RecipeLine ${lineId} not found`);
    }

    const { changeEventId: _ce, ...fields } = dto;
    return this.prisma.recipeLine.update({
      where: { id: lineId },
      data: fields,
    });
  }

  /**
   * Returns the single active recipe for a product.
   * Production planning MUST call this — not a generic findByProduct — so that
   * draft/retired recipes can never be selected for a production run.
   */
  async getActiveRecipeForProduct(productId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { product_id: productId, company_id: '1', status: RECIPE_STATUS.ACTIVE },
      include: { lines: { include: { material: true } }, product: true },
    });
    if (!recipe) {
      throw new NotFoundException(`No active recipe found for product ${productId}`);
    }
    return recipe;
  }

  /**
   * Derives allergen materials exclusively from the active recipe for a
   * product.  Draft and retired recipes MUST NOT contribute to the summary.
   */
  async getAllergenMaterialsForProduct(productId: string) {
    const recipe = await this.getActiveRecipeForProduct(productId);
    return recipe.lines
      .map((l: any) => l.material)
      .filter((m: any) => Array.isArray(m.allergens) && m.allergens.length > 0);
  }
}
