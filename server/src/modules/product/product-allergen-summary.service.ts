import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_STATUS = 'active';

export interface AllergenEntry {
  allergenCode: string;
  allergenName: string;
  containsAllergen: boolean;
  crossContactRisk: string | null;
  materialIds: string[];
}

export interface ProductAllergenSummaryResult {
  productId: string;
  recipeId: string;
  recipeVersion: number;
  materialProfileIds: string[];
  allergenSummary: AllergenEntry[];
  generatedAt: Date;
}

@Injectable()
export class ProductAllergenSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async deriveProductAllergenSummary(
    productId: string,
    companyId: string,
    recipeId?: string,
  ): Promise<ProductAllergenSummaryResult> {
    const recipe = await this.loadRecipe(productId, companyId, recipeId);
    const materialIds = recipe.lines.map((l: { material_id: string }) => l.material_id);
    const profilesByMaterial = await this.loadProfilesForMaterials(materialIds, companyId);

    const allProfiles = profilesByMaterial.flat();
    const materialProfileIds = allProfiles.map((p: { id: string }) => p.id);
    const allergenSummary = this.buildAllergenSummary(allProfiles);

    return {
      productId,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      materialProfileIds,
      allergenSummary,
      generatedAt: new Date(),
    };
  }

  private async loadRecipe(productId: string, companyId: string, recipeId?: string) {
    const where = recipeId
      ? { id: recipeId, company_id: companyId, product_id: productId }
      : { product_id: productId, company_id: companyId, status: ACTIVE_STATUS };

    const recipe = await this.prisma.recipe.findFirst({
      where,
      include: { lines: { select: { material_id: true } } },
      orderBy: recipeId ? undefined : { version: 'desc' },
    });

    if (!recipe) {
      throw new NotFoundException(
        `产品 ${productId} 没有有效的配方${recipeId ? `（配方 ${recipeId} 不存在）` : ''}`,
      );
    }

    return recipe;
  }

  private async loadProfilesForMaterials(materialIds: string[], companyId: string) {
    return Promise.all(
      materialIds.map((materialId) =>
        this.prisma.materialAllergenProfile.findMany({
          where: { material_id: materialId, company_id: companyId, status: ACTIVE_STATUS },
        }),
      ),
    );
  }

  private buildAllergenSummary(
    profiles: Array<{
      id: string;
      allergen_code: string;
      allergen_name: string;
      contains_allergen: boolean;
      cross_contact_risk: string | null;
      material_id: string;
    }>,
  ): AllergenEntry[] {
    const byCode = new Map<string, AllergenEntry>();

    for (const profile of profiles) {
      const existing = byCode.get(profile.allergen_code);
      if (existing) {
        byCode.set(profile.allergen_code, {
          ...existing,
          containsAllergen: existing.containsAllergen || profile.contains_allergen,
          crossContactRisk: existing.crossContactRisk ?? profile.cross_contact_risk,
          materialIds: existing.materialIds.includes(profile.material_id)
            ? existing.materialIds
            : [...existing.materialIds, profile.material_id],
        });
      } else {
        byCode.set(profile.allergen_code, {
          allergenCode: profile.allergen_code,
          allergenName: profile.allergen_name,
          containsAllergen: profile.contains_allergen,
          crossContactRisk: profile.cross_contact_risk,
          materialIds: [profile.material_id],
        });
      }
    }

    return Array.from(byCode.values());
  }
}
