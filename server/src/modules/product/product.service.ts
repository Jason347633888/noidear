import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductReportDocumentDto } from './dto/product-report-document.dto';
import { ProductCodeGeneratorService } from './product-code-generator.service';
import { CreateLegacyProductDto } from './dto/create-legacy-product.dto';

@Injectable()
export class ProductService {
  private readonly snowflake = new Snowflake(1, 3);

  constructor(
    private prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly businessDocumentLinkService: BusinessDocumentLinkService,
    private readonly productCodeGenerator: ProductCodeGeneratorService,
  ) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: {
        company_id: '1',
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, company_id: '1', deleted_at: null },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const code = dto.code ?? (await this.productCodeGenerator.generate('1'));
    const { code: _ignoredCode, ...rest } = dto;
    return this.prisma.product.create({
      data: {
        ...rest,
        code,
        company_id: '1',
        source: dto.source ?? 'manual_admin',
      },
    });
  }

  async createLegacy(dto: CreateLegacyProductDto) {
    if (!dto.lines.length) {
      throw new BadRequestException('历史产品建档至少需要一条配方明细');
    }

    const materialIds = dto.lines.map((line) => line.material_id);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('同一配方中同一物料只能出现一次');
    }

    return this.prisma.$transaction(async (tx) => {
      const code = await this.productCodeGenerator.generate('1');
      const enrichedLines: Array<typeof dto.lines[0] & { area_name_snapshot: string }> = [];

      for (const line of dto.lines) {
        const material = await tx.material.findFirst({
          where: { id: line.material_id, deletedAt: null, status: 'active' },
        });
        if (!material) {
          throw new BadRequestException(`物料不存在或已停用：${line.material_id}`);
        }

        const area = await tx.workshopArea.findUnique({
          where: { id: line.area_id },
        });
        if (!area || area.status !== 'active' || area.deleted_at) {
          throw new BadRequestException(`配料区域不存在或已停用：${line.area_id}`);
        }

        enrichedLines.push({
          ...line,
          area_name_snapshot: area.name,
        });
      }

      const product = await tx.product.create({
        data: {
          company_id: '1',
          code,
          name: dto.name,
          status: 'active',
          source: 'legacy_import',
        },
      });

      const recipe = await tx.recipe.create({
        data: {
          company_id: '1',
          product_id: product.id,
          version: 1,
          version_note: '历史产品建档',
          status: 'active',
          approved_at: new Date(),
        },
      });

      await tx.recipeLine.createMany({
        data: enrichedLines.map((line) => ({
          recipe_id: recipe.id,
          material_id: line.material_id,
          qty_per_batch: line.qty_per_batch,
          unit: line.unit,
          is_critical: line.is_critical ?? false,
          notes: line.notes ?? null,
          area_id: line.area_id,
          area_name_snapshot: line.area_name_snapshot,
        })),
      });

      return { product, recipe };
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id, company_id: '1' },
      data: { ...dto },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id, company_id: '1' },
      data: { deleted_at: new Date() },
    });
  }

  async uploadReport(
    productId: string,
    dto: ProductReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const product = await this.findOne(productId);
    const { document, preview } = await this.createReportDocument(productId, product.name, dto, file, userId);
    const link = await this.businessDocumentLinkService.link({
      documentId: document.id,
      businessType: 'product',
      businessId: productId,
      documentKind: 'external_inspection_report',
      required: false,
      expiresAt: dto.expiresAt,
      status: this.getReportStatus(dto.expiresAt),
      metadata: {
        reportNo: dto.reportNo,
        testedAt: dto.testedAt?.toISOString(),
        conclusion: dto.conclusion,
      },
    });

    return { document, link, preview };
  }

  async getReports(productId: string) {
    await this.findOne(productId);
    const links = await this.prisma.businessDocumentLink.findMany({
      where: { businessType: 'product', businessId: productId, documentKind: 'external_inspection_report' },
      include: { document: { select: { id: true, title: true, fileName: true, fileType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => ({
      id: link.id,
      documentId: link.documentId,
      reportType: link.documentKind,
      reportName: link.document.title,
      fileName: link.document.fileName,
      fileType: link.document.fileType,
      reportNo: this.getMetadataString(link.metadata, 'reportNo'),
      testedAt: this.getMetadataString(link.metadata, 'testedAt'),
      conclusion: this.getMetadataString(link.metadata, 'conclusion'),
      expiresAt: link.expiresAt,
      status: link.status,
    }));
  }

  async replaceReport(
    productId: string,
    linkId: string,
    dto: ProductReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const product = await this.findOne(productId);
    const existingLink = await this.prisma.businessDocumentLink.findFirst({
      where: { id: linkId, businessType: 'product', businessId: productId },
    });
    if (!existingLink) throw new NotFoundException('Product report link not found');

    const { document, preview } = await this.createReportDocument(productId, product.name, dto, file, userId);
    const link = await this.prisma.businessDocumentLink.update({
      where: { id: linkId },
      data: {
        documentId: document.id,
        expiresAt: dto.expiresAt,
        status: this.getReportStatus(dto.expiresAt),
        metadata: {
          reportNo: dto.reportNo,
          testedAt: dto.testedAt?.toISOString(),
          conclusion: dto.conclusion,
        },
      },
    });

    return { document, link, preview };
  }

  private async createReportDocument(
    productId: string,
    productName: string,
    dto: ProductReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const upload = await this.storageService.uploadFile(file, 'product-reports');
    const document = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: 4,
        number: `PROD-${productId}-${Date.now()}`,
        title: dto.reportName,
        filePath: upload.path,
        fileName: file.originalname,
        fileSize: Number(file.size),
        fileType: file.mimetype,
        status: 'draft',
        creatorId: userId,
        document_type: 'EXTERNAL_FILE',
        source_folder: '06',
        owner_department: '品管部',
        external_expires_at: dto.expiresAt,
        metadata: {
          productId,
          productName,
          reportNo: dto.reportNo,
          testedAt: dto.testedAt?.toISOString(),
          conclusion: dto.conclusion,
        },
      },
    });
    const previewUrl = file.mimetype.includes('pdf')
      ? await this.storageService.getSignedUrl(upload.path, 900)
      : undefined;

    return {
      document,
      preview: {
        type: file.mimetype.includes('pdf') ? 'pdf' : 'unknown',
        url: previewUrl,
        fileName: file.originalname,
      },
    };
  }

  private getReportStatus(expiresAt?: Date) {
    if (!expiresAt) return 'valid';
    const time = expiresAt.getTime();
    const now = Date.now();
    if (time < now) return 'expired';
    if (time <= now + 30 * 24 * 60 * 60 * 1000) return 'expiring_soon';
    return 'valid';
  }

  private getMetadataString(metadata: unknown, key: string) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const value = (metadata as Record<string, unknown>)[key];
    return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : undefined;
  }
}
