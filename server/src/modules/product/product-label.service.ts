import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductAllergenSummaryService, AllergenEntry } from './product-allergen-summary.service';

const COMPANY_ID = '1';

export interface ManufacturerInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  licenseNo: string | null;
  originPlace: string | null;
}

export interface ProductLabelPreview {
  productId: string;
  productName: string;
  productCode: string;
  spec: string | null;
  netWeight: string | null;
  weightUnit: string | null;
  labelClaims: string | null;
  shelfLifeDays: number | null;
  nutritionFacts: {
    energy: string | null;
    protein: string | null;
    fat: string | null;
    transFat: string | null;
    carb: string | null;
    sodium: string | null;
  };
  productType: string | null;
  processingMethod: string | null;
  standardCode: string | null;
  storageMethod: string | null;
  consumptionMethod: string | null;
  consumerNotice: string | null;
  manufacturer: ManufacturerInfo;
  allergenSummary: AllergenEntry[];
  generatedAt: Date;
}

export interface ProductSpecificationExportResult {
  exportId: string;
  fileId: string;
  resourceType: string;
  resourceId: string;
  exportedAt: Date;
}

@Injectable()
export class ProductLabelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly allergenSummaryService: ProductAllergenSummaryService,
  ) {}

  async generateProductLabelPreview(productId: string): Promise<ProductLabelPreview> {
    const product = await this.loadProduct(productId);

    const [companyProfile, allergenSummary] = await Promise.all([
      this.prisma.companyProfile.findUnique({ where: { company_id: COMPANY_ID } }),
      this.allergenSummaryService
        .deriveProductAllergenSummary(productId, COMPANY_ID)
        .catch((err) => {
          if (err instanceof NotFoundException) return null;
          throw err;
        }),
    ]);

    const manufacturer: ManufacturerInfo = {
      name: companyProfile?.manufacturerName ?? null,
      address: companyProfile?.manufacturerAddress ?? null,
      phone: companyProfile?.manufacturerPhone ?? null,
      licenseNo: companyProfile?.foodProductionLicense ?? null,
      originPlace: companyProfile?.originPlace ?? null,
    };

    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      spec: product.spec ?? null,
      netWeight: product.net_weight ? String(product.net_weight) : null,
      weightUnit: product.weight_unit ?? null,
      labelClaims: product.label_claims ?? null,
      shelfLifeDays: product.shelf_life_days ?? null,
      nutritionFacts: {
        energy: product.nutrition_energy ? String(product.nutrition_energy) : null,
        protein: product.nutrition_protein ? String(product.nutrition_protein) : null,
        fat: product.nutrition_fat ? String(product.nutrition_fat) : null,
        transFat: product.nutrition_trans_fat ? String(product.nutrition_trans_fat) : null,
        carb: product.nutrition_carb ? String(product.nutrition_carb) : null,
        sodium: product.nutrition_sodium ? String(product.nutrition_sodium) : null,
      },
      productType: product.product_type ?? null,
      processingMethod: product.processing_method ?? null,
      standardCode: product.standard_code ?? null,
      storageMethod: product.storage_method ?? null,
      consumptionMethod: product.consumption_method ?? null,
      consumerNotice: product.consumer_notice ?? null,
      manufacturer,
      allergenSummary: allergenSummary?.allergenSummary ?? [],
      generatedAt: new Date(),
    };
  }

  async generateProductSpecificationExport(productId: string): Promise<ProductSpecificationExportResult> {
    const product = await this.loadProduct(productId);
    const labelPreview = await this.generateProductLabelPreview(productId);

    const dataSnapshot = buildSpecificationSnapshot(product, labelPreview);

    const exported = await this.prisma.evidenceExport.create({
      data: {
        company_id: product.company_id,
        resourceType: 'product_specification',
        resourceId: productId,
        snapshotId: productId,
        exportScope: 'product_specification',
        dataSnapshot: dataSnapshot as object,
        summaryFormat: 'json',
      },
    });

    const evidenceFile = await this.prisma.evidenceFile.create({
      data: {
        company_id: product.company_id,
        resourceType: 'product_specification',
        resourceId: productId,
        resourceItemId: exported.id,
        fileName: `product_spec_${product.code}_${formatDateStamp(exported.exportedAt)}.json`,
        filePath: `product-specifications/${product.company_id}/${productId}/${exported.id}.json`,
        mimeType: 'application/json',
      },
    });

    return {
      exportId: exported.id,
      fileId: evidenceFile.id,
      resourceType: exported.resourceType,
      resourceId: exported.resourceId,
      exportedAt: exported.exportedAt,
    };
  }

  private async loadProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, company_id: COMPANY_ID, deleted_at: null },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }
}

function buildSpecificationSnapshot(
  product: {
    id: string;
    name: string;
    code: string;
    spec: string | null;
    net_weight: unknown;
    weight_unit: string | null;
    shelf_life_days: number | null;
    standard_code: string | null;
    storage_method: string | null;
    consumption_method: string | null;
    product_type: string | null;
    processing_method: string | null;
    label_allergens: string | null;
    consumer_notice: string | null;
    nutrition_energy: unknown;
    nutrition_protein: unknown;
    nutrition_fat: unknown;
    nutrition_trans_fat: unknown;
    nutrition_carb: unknown;
    nutrition_sodium: unknown;
    company_id: string;
  },
  labelPreview: ProductLabelPreview,
): Record<string, unknown> {
  return {
    productId: product.id,
    productName: product.name,
    productCode: product.code,
    spec: product.spec ?? null,
    netWeight: product.net_weight ? String(product.net_weight) : null,
    weightUnit: product.weight_unit ?? null,
    shelfLifeDays: product.shelf_life_days ?? null,
    standardCode: product.standard_code ?? null,
    storageMethod: product.storage_method ?? null,
    consumptionMethod: product.consumption_method ?? null,
    productType: product.product_type ?? null,
    processingMethod: product.processing_method ?? null,
    consumerNotice: product.consumer_notice ?? null,
    nutritionFacts: labelPreview.nutritionFacts,
    manufacturer: labelPreview.manufacturer,
    allergenSummary: labelPreview.allergenSummary,
    snapshotGeneratedAt: labelPreview.generatedAt.toISOString(),
  };
}

function formatDateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}
