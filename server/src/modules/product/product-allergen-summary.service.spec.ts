import { NotFoundException } from '@nestjs/common';
import { ProductAllergenSummaryService } from './product-allergen-summary.service';

const COMPANY_ID = 'company-test';
const PRODUCT_ID = 'prod-001';
const RECIPE_ID = 'recipe-001';
const MAT_A = 'mat-a';
const MAT_B = 'mat-b';
const PROFILE_A1 = 'profile-a1';
const PROFILE_A2 = 'profile-a2';
const PROFILE_B1 = 'profile-b1';

const makeRecipe = (overrides: Record<string, unknown> = {}) => ({
  id: RECIPE_ID,
  product_id: PRODUCT_ID,
  version: 3,
  status: 'active',
  company_id: COMPANY_ID,
  lines: [
    { id: 'line-1', material_id: MAT_A },
    { id: 'line-2', material_id: MAT_B },
  ],
  ...overrides,
});

const makeProfile = (id: string, materialId: string, allergenCode: string, contains: boolean) => ({
  id,
  company_id: COMPANY_ID,
  material_id: materialId,
  allergen_code: allergenCode,
  allergen_name: allergenCode === 'GLUTEN' ? '谷蛋白' : '花生',
  contains_allergen: contains,
  cross_contact_risk: null,
  status: 'active',
  effective_from: new Date('2026-01-01'),
  effective_to: null,
  created_at: new Date(),
  updated_at: new Date(),
});

describe('ProductAllergenSummaryService', () => {
  let service: ProductAllergenSummaryService;

  const mockPrisma = {
    recipe: {
      findFirst: jest.fn(),
    },
    materialAllergenProfile: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductAllergenSummaryService(mockPrisma as any);
  });

  // ── derives summary from active recipe and material allergen profiles ──────

  describe('deriveProductAllergenSummary', () => {
    it('derives summary from active recipe lines and material allergen profiles', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany
        .mockResolvedValueOnce([makeProfile(PROFILE_A1, MAT_A, 'GLUTEN', true)])
        .mockResolvedValueOnce([makeProfile(PROFILE_B1, MAT_B, 'PEANUT', false)]);

      const result = await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.recipeId).toBe(RECIPE_ID);
      expect(result.recipeVersion).toBe(3);
      expect(result.allergenSummary).toHaveLength(2);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('includes materialProfileIds for traceability', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany
        .mockResolvedValueOnce([makeProfile(PROFILE_A1, MAT_A, 'GLUTEN', true)])
        .mockResolvedValueOnce([makeProfile(PROFILE_B1, MAT_B, 'PEANUT', false)]);

      const result = await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      expect(result.materialProfileIds).toContain(PROFILE_A1);
      expect(result.materialProfileIds).toContain(PROFILE_B1);
    });

    it('deduplicates allergen_codes across multiple material profiles', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany
        .mockResolvedValueOnce([
          makeProfile(PROFILE_A1, MAT_A, 'GLUTEN', true),
          makeProfile(PROFILE_A2, MAT_A, 'GLUTEN', false),
        ])
        .mockResolvedValueOnce([makeProfile(PROFILE_B1, MAT_B, 'GLUTEN', true)]);

      const result = await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      const glutenEntries = result.allergenSummary.filter((e) => e.allergenCode === 'GLUTEN');
      expect(glutenEntries).toHaveLength(1);
    });

    it('marks contains_allergen true when any material profile contains the allergen', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany
        .mockResolvedValueOnce([makeProfile(PROFILE_A1, MAT_A, 'GLUTEN', true)])
        .mockResolvedValueOnce([makeProfile(PROFILE_B1, MAT_B, 'GLUTEN', false)]);

      const result = await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      const gluten = result.allergenSummary.find((e) => e.allergenCode === 'GLUTEN');
      expect(gluten?.containsAllergen).toBe(true);
    });

    it('uses the provided recipeId when given', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe({ id: 'recipe-specific' }));
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([]);

      await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID, 'recipe-specific');

      expect(mockPrisma.recipe.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'recipe-specific' }),
        }),
      );
    });

    it('returns empty allergenSummary and materialProfileIds when no profiles exist', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([]);

      const result = await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      expect(result.allergenSummary).toEqual([]);
      expect(result.materialProfileIds).toEqual([]);
    });

    it('throws NotFoundException when no active recipe exists for the product', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(null);

      await expect(
        service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not persist any data — no Prisma create/update/upsert calls', async () => {
      mockPrisma.recipe.findFirst.mockResolvedValue(makeRecipe());
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([]);

      await service.deriveProductAllergenSummary(PRODUCT_ID, COMPANY_ID);

      // Verify no writes occurred
      const prismaMock = mockPrisma as Record<string, Record<string, jest.Mock>>;
      for (const model of Object.values(prismaMock)) {
        for (const [method, fn] of Object.entries(model)) {
          if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(method)) {
            expect(fn).not.toHaveBeenCalled();
          }
        }
      }
    });
  });
});
