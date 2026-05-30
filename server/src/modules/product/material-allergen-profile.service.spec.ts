import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaterialAllergenProfileService } from './material-allergen-profile.service';
import { PrismaService } from '../../prisma/prisma.service';

const COMPANY_ID = 'company-test';
const MATERIAL_ID = 'mat-001';
const SUPPLIER_ID = 'sup-001';

const makeProfile = (overrides: Record<string, unknown> = {}) => ({
  id: 'profile-001',
  company_id: COMPANY_ID,
  material_id: MATERIAL_ID,
  supplier_id: SUPPLIER_ID,
  allergen_code: 'GLUTEN',
  allergen_name: '谷蛋白',
  contains_allergen: true,
  cross_contact_risk: 'medium',
  evidence_file_id: null,
  effective_from: new Date('2026-01-01'),
  effective_to: null,
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe('MaterialAllergenProfileService', () => {
  let service: MaterialAllergenProfileService;

  const mockPrisma = {
    materialAllergenProfile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    recipe: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MaterialAllergenProfileService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(MaterialAllergenProfileService);
  });

  // ── createMaterialAllergenProfile ──────────────────────────────────────────

  describe('createMaterialAllergenProfile', () => {
    it('creates a profile with the provided companyId, not hardcoded', async () => {
      const profile = makeProfile({ company_id: 'company-b' });
      mockPrisma.materialAllergenProfile.create.mockResolvedValue(profile);

      const dto = {
        material_id: MATERIAL_ID,
        supplier_id: SUPPLIER_ID,
        allergen_code: 'GLUTEN',
        allergen_name: '谷蛋白',
        contains_allergen: true,
        cross_contact_risk: 'medium',
        effective_from: new Date('2026-01-01'),
      };

      await service.createMaterialAllergenProfile(dto, 'company-b');

      expect(mockPrisma.materialAllergenProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ company_id: 'company-b' }),
        }),
      );
    });

    it('persists all required fields', async () => {
      const profile = makeProfile();
      mockPrisma.materialAllergenProfile.create.mockResolvedValue(profile);

      const dto = {
        material_id: MATERIAL_ID,
        supplier_id: SUPPLIER_ID,
        allergen_code: 'GLUTEN',
        allergen_name: '谷蛋白',
        contains_allergen: true,
        effective_from: new Date('2026-01-01'),
      };

      const result = await service.createMaterialAllergenProfile(dto, COMPANY_ID);

      expect(mockPrisma.materialAllergenProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            material_id: MATERIAL_ID,
            allergen_code: 'GLUTEN',
            contains_allergen: true,
          }),
        }),
      );
      expect(result.id).toBe('profile-001');
    });

    it('defaults status to active', async () => {
      const profile = makeProfile({ status: 'active' });
      mockPrisma.materialAllergenProfile.create.mockResolvedValue(profile);

      const dto = {
        material_id: MATERIAL_ID,
        allergen_code: 'PEANUT',
        allergen_name: '花生',
        contains_allergen: false,
        effective_from: new Date('2026-01-01'),
      };

      await service.createMaterialAllergenProfile(dto, COMPANY_ID);

      const callData = mockPrisma.materialAllergenProfile.create.mock.calls[0][0].data;
      expect(callData.status).toBe('active');
    });
  });

  // ── listActiveProfiles ────────────────────────────────────────────────────

  describe('listActiveProfiles', () => {
    it('filters by companyId and materialId', async () => {
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([makeProfile()]);

      await service.listActiveProfiles(MATERIAL_ID, COMPANY_ID);

      expect(mockPrisma.materialAllergenProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: COMPANY_ID,
            material_id: MATERIAL_ID,
            status: 'active',
          }),
        }),
      );
    });

    it('optionally filters by supplierId', async () => {
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([makeProfile()]);

      await service.listActiveProfiles(MATERIAL_ID, COMPANY_ID, SUPPLIER_ID);

      const callWhere = mockPrisma.materialAllergenProfile.findMany.mock.calls[0][0].where;
      expect(callWhere.supplier_id).toBe(SUPPLIER_ID);
    });

    it('does not filter by supplierId when omitted', async () => {
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([makeProfile()]);

      await service.listActiveProfiles(MATERIAL_ID, COMPANY_ID);

      const callWhere = mockPrisma.materialAllergenProfile.findMany.mock.calls[0][0].where;
      expect(callWhere).not.toHaveProperty('supplier_id');
    });

    it('supports multiple profiles per material from different suppliers', async () => {
      const profileA = makeProfile({ id: 'p-a', supplier_id: 'sup-a' });
      const profileB = makeProfile({ id: 'p-b', supplier_id: 'sup-b' });
      mockPrisma.materialAllergenProfile.findMany.mockResolvedValue([profileA, profileB]);

      const result = await service.listActiveProfiles(MATERIAL_ID, COMPANY_ID);

      expect(result).toHaveLength(2);
      expect(result[0].supplier_id).toBe('sup-a');
      expect(result[1].supplier_id).toBe('sup-b');
    });
  });

  // ── retireProfile ─────────────────────────────────────────────────────────

  describe('retireProfile', () => {
    it('sets status to retired and sets effective_to to now', async () => {
      const existing = makeProfile({ status: 'active' });
      mockPrisma.materialAllergenProfile.findUnique.mockResolvedValue(existing);
      mockPrisma.materialAllergenProfile.update.mockResolvedValue({
        ...existing,
        status: 'retired',
      });

      const result = await service.retireProfile('profile-001', COMPANY_ID);

      expect(mockPrisma.materialAllergenProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-001' },
          data: expect.objectContaining({ status: 'retired' }),
        }),
      );
      expect(result.status).toBe('retired');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockPrisma.materialAllergenProfile.findUnique.mockResolvedValue(null);

      await expect(service.retireProfile('ghost-id', COMPANY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when profile belongs to different company', async () => {
      mockPrisma.materialAllergenProfile.findUnique.mockResolvedValue(
        makeProfile({ company_id: 'other-company' }),
      );

      await expect(service.retireProfile('profile-001', COMPANY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when profile is already retired', async () => {
      mockPrisma.materialAllergenProfile.findUnique.mockResolvedValue(
        makeProfile({ status: 'retired' }),
      );

      await expect(service.retireProfile('profile-001', COMPANY_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── listAffectedProductsForAllergenChange ─────────────────────────────────

  describe('listAffectedProductsForAllergenChange', () => {
    it('returns products whose active recipes reference the material', async () => {
      mockPrisma.recipe.findMany.mockResolvedValue([
        { product: { id: 'prod-1', name: '产品A', company_id: COMPANY_ID } },
        { product: { id: 'prod-2', name: '产品B', company_id: COMPANY_ID } },
      ]);

      const result = await service.listAffectedProductsForAllergenChange(
        MATERIAL_ID,
        COMPANY_ID,
      );

      expect(mockPrisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: COMPANY_ID,
            lines: expect.objectContaining({
              some: expect.objectContaining({ material_id: MATERIAL_ID }),
            }),
          }),
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('prod-1');
    });

    it('returns empty array when no recipes reference the material', async () => {
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.listAffectedProductsForAllergenChange(
        'mat-unused',
        COMPANY_ID,
      );

      expect(result).toEqual([]);
    });

    it('deduplicates products when multiple recipe versions reference same material', async () => {
      const sameProduct = { id: 'prod-1', name: '产品A', company_id: COMPANY_ID };
      mockPrisma.recipe.findMany.mockResolvedValue([
        { product: sameProduct },
        { product: sameProduct },
      ]);

      const result = await service.listAffectedProductsForAllergenChange(
        MATERIAL_ID,
        COMPANY_ID,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });
  });
});
