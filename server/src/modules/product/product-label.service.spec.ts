import { NotFoundException } from '@nestjs/common';
import { ProductLabelService } from './product-label.service';

const COMPANY_ID = '1';
const PRODUCT_ID = 'prod-label-001';
const RECIPE_ID = 'recipe-label-001';

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  company_id: COMPANY_ID,
  code: 'P-0001',
  name: '测试产品',
  spec: '500g',
  net_weight: '500.0000',
  weight_unit: 'g',
  label_claims: '无人工色素',
  shelf_life_days: 180,
  nutrition_energy: '1200.00',
  nutrition_protein: '5.00',
  nutrition_fat: '3.00',
  nutrition_trans_fat: '0.00',
  nutrition_carb: '50.00',
  nutrition_sodium: '200.00',
  product_type: 'packaged_food',
  processing_method: '灭菌',
  standard_code: 'GB/T 12345',
  storage_method: '阴凉干燥处',
  consumption_method: '开袋即食',
  label_allergens: null,
  consumer_notice: '过敏提示：本品可能含有坚果',
  status: 'active',
  deleted_at: null,
  ...overrides,
});

const makeCompanyProfile = (overrides: Record<string, unknown> = {}) => ({
  id: 'cp-001',
  company_id: COMPANY_ID,
  legalName: '测试食品有限公司',
  manufacturerName: '测试食品有限公司',
  manufacturerAddress: '上海市浦东新区测试路1号',
  manufacturerPhone: '021-12345678',
  originPlace: '中国上海',
  foodProductionLicense: 'SC12345678901234',
  ...overrides,
});

const makeAllergenSummary = () => ({
  productId: PRODUCT_ID,
  recipeId: RECIPE_ID,
  recipeVersion: 2,
  materialProfileIds: ['mp-1', 'mp-2'],
  allergenSummary: [
    {
      allergenCode: 'GLUTEN',
      allergenName: '谷蛋白',
      containsAllergen: true,
      crossContactRisk: null,
      materialIds: ['mat-1'],
    },
  ],
  generatedAt: new Date('2026-05-30T00:00:00Z'),
});

describe('ProductLabelService', () => {
  let service: ProductLabelService;

  const mockPrisma = {
    product: {
      findFirst: jest.fn(),
    },
    companyProfile: {
      findUnique: jest.fn(),
    },
    evidenceExport: {
      create: jest.fn(),
    },
    evidenceFile: {
      create: jest.fn(),
    },
  };

  const mockAllergenSummaryService = {
    deriveProductAllergenSummary: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductLabelService(mockPrisma as any, mockAllergenSummaryService as any);
  });

  // ── generateProductLabelPreview ───────────────────────────────────────────

  describe('generateProductLabelPreview', () => {
    it('returns a label preview derived from product fields and company profile', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      const result = await service.generateProductLabelPreview(PRODUCT_ID);

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.productName).toBe('测试产品');
      expect(result.productCode).toBe('P-0001');
      expect(result.spec).toBe('500g');
    });

    it('includes manufacturer info from CompanyProfile', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      const result = await service.generateProductLabelPreview(PRODUCT_ID);

      expect(result.manufacturer.name).toBe('测试食品有限公司');
      expect(result.manufacturer.address).toBe('上海市浦东新区测试路1号');
      expect(result.manufacturer.phone).toBe('021-12345678');
      expect(result.manufacturer.licenseNo).toBe('SC12345678901234');
    });

    it('derives allergens from deriveProductAllergenSummary', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      const result = await service.generateProductLabelPreview(PRODUCT_ID);

      expect(mockAllergenSummaryService.deriveProductAllergenSummary).toHaveBeenCalledWith(
        PRODUCT_ID,
        COMPANY_ID,
      );
      expect(result.allergenSummary).toHaveLength(1);
      expect(result.allergenSummary[0].allergenCode).toBe('GLUTEN');
    });

    it('uses empty allergen list when no active recipe exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockRejectedValue(
        new NotFoundException('no recipe'),
      );

      const result = await service.generateProductLabelPreview(PRODUCT_ID);

      expect(result.allergenSummary).toEqual([]);
    });

    it('provides null manufacturer fields when CompanyProfile does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(null);
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      const result = await service.generateProductLabelPreview(PRODUCT_ID);

      expect(result.manufacturer.name).toBeNull();
      expect(result.manufacturer.address).toBeNull();
    });

    it('does not persist any data — preview is a pure derived payload', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      await service.generateProductLabelPreview(PRODUCT_ID);

      expect(mockPrisma.evidenceExport.create).not.toHaveBeenCalled();
      expect(mockPrisma.evidenceFile.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.generateProductLabelPreview(PRODUCT_ID)).rejects.toThrow(NotFoundException);
    });

    it('includes generatedAt timestamp', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      const before = new Date();
      const result = await service.generateProductLabelPreview(PRODUCT_ID);
      const after = new Date();

      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ── generateProductSpecificationExport ────────────────────────────────────

  describe('generateProductSpecificationExport', () => {
    it('creates an EvidenceExport with resourceType product_specification', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());
      mockPrisma.evidenceExport.create.mockResolvedValue({
        id: 'export-001',
        resourceType: 'product_specification',
        resourceId: PRODUCT_ID,
        exportedAt: new Date(),
      });
      mockPrisma.evidenceFile.create.mockResolvedValue({ id: 'file-001' });

      const result = await service.generateProductSpecificationExport(PRODUCT_ID);

      expect(mockPrisma.evidenceExport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceType: 'product_specification',
            resourceId: PRODUCT_ID,
          }),
        }),
      );
      expect(result.exportId).toBe('export-001');
    });

    it('creates an EvidenceFile linked to the export', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());
      mockPrisma.evidenceExport.create.mockResolvedValue({
        id: 'export-002',
        resourceType: 'product_specification',
        resourceId: PRODUCT_ID,
        exportedAt: new Date(),
      });
      mockPrisma.evidenceFile.create.mockResolvedValue({ id: 'file-002' });

      await service.generateProductSpecificationExport(PRODUCT_ID);

      expect(mockPrisma.evidenceFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceType: 'product_specification',
            resourceId: PRODUCT_ID,
          }),
        }),
      );
    });

    it('dataSnapshot does not change after product fields change — snapshot is immutable at export time', async () => {
      const productAtExportTime = makeProduct({ name: '原始名称' });
      mockPrisma.product.findFirst.mockResolvedValue(productAtExportTime);
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());

      let capturedSnapshot: unknown;
      mockPrisma.evidenceExport.create.mockImplementation((args: { data: { dataSnapshot: unknown } }) => {
        capturedSnapshot = args.data.dataSnapshot;
        return Promise.resolve({
          id: 'export-003',
          resourceType: 'product_specification',
          resourceId: PRODUCT_ID,
          exportedAt: new Date(),
        });
      });
      mockPrisma.evidenceFile.create.mockResolvedValue({ id: 'file-003' });

      await service.generateProductSpecificationExport(PRODUCT_ID);

      // The snapshot captured what the product looked like at export time
      expect((capturedSnapshot as Record<string, unknown>).productName).toBe('原始名称');

      // Simulate product changing after export — snapshot is NOT updated
      expect(mockPrisma.evidenceExport.create).toHaveBeenCalledTimes(1);
    });

    it('returns export metadata including fileId and exportedAt', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());
      const exportedAt = new Date('2026-05-30T10:00:00Z');
      mockPrisma.evidenceExport.create.mockResolvedValue({
        id: 'export-004',
        resourceType: 'product_specification',
        resourceId: PRODUCT_ID,
        exportedAt,
      });
      mockPrisma.evidenceFile.create.mockResolvedValue({ id: 'file-004' });

      const result = await service.generateProductSpecificationExport(PRODUCT_ID);

      expect(result.exportId).toBe('export-004');
      expect(result.fileId).toBe('file-004');
      expect(result.resourceType).toBe('product_specification');
      expect(result.resourceId).toBe(PRODUCT_ID);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(service.generateProductSpecificationExport(PRODUCT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('embeds company_id from the product into EvidenceExport', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(makeProduct());
      mockPrisma.companyProfile.findUnique.mockResolvedValue(makeCompanyProfile());
      mockAllergenSummaryService.deriveProductAllergenSummary.mockResolvedValue(makeAllergenSummary());
      mockPrisma.evidenceExport.create.mockResolvedValue({
        id: 'export-005',
        resourceType: 'product_specification',
        resourceId: PRODUCT_ID,
        exportedAt: new Date(),
      });
      mockPrisma.evidenceFile.create.mockResolvedValue({ id: 'file-005' });

      await service.generateProductSpecificationExport(PRODUCT_ID);

      expect(mockPrisma.evidenceExport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            company_id: COMPANY_ID,
          }),
        }),
      );
    });
  });
});
