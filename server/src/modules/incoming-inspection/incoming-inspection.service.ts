import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { BatchNumberGeneratorService } from '../batch-trace/services/batch-number-generator.service';
import { InventoryMovementLedgerService } from '../warehouse/services/inventory-movement-ledger.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionReportDocumentDto } from './dto/inspection-report-document.dto';

const DEFAULT_MATERIAL_UNIT = 'kg';

@Injectable()
export class IncomingInspectionService {
  private readonly snowflake = new Snowflake(1, 4);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly businessDocumentLinkService: BusinessDocumentLinkService,
    private readonly batchNumberGenerator: BatchNumberGeneratorService,
    private readonly inventoryMovementLedger: InventoryMovementLedgerService,
  ) {}

  async create(dto: CreateInspectionDto, companyId: string, inspectorId: string) {
    if ((dto as unknown as Record<string, unknown>).material_batch_id) {
      throw new BadRequestException(
        'material_batch_id is not an accepted creation input; batches are created on final inspection release',
      );
    }

    const result = await this.prisma.incomingInspection.create({
      data: {
        company_id: companyId,
        material_batch_id: null,
        material_inbound_item_id: dto.material_inbound_item_id,
        is_final: dto.is_final ?? false,
        inspected_at: new Date(),
        inspector_id: inspectorId,
        overall_result: dto.overall_result,
        sample_qty: dto.sample_qty,
        sample_unit: dto.sample_unit,
        disposition: dto.disposition,
        notes: dto.notes,
        results: {
          create: dto.results,
        },
      },
      include: { results: true },
    });

    this.eventEmitter.emit('incoming-inspection.created', {
      id: result.id,
      overall_result: result.overall_result,
      material_batch_id: result.material_batch_id,
      material_inbound_item_id: result.material_inbound_item_id,
      company_id: result.company_id,
      inspector_id: result.inspector_id,
    });

    return result;
  }

  /**
   * Gate: only a FINAL inspection with result pass/conditional_pass creates the
   * MaterialBatch, the authoritative InventoryMovement ledger entry and the
   * StockRecord balance projection — all in one transaction. Idempotent: a second
   * call for an already-released inbound item is a no-op.
   */
  async releaseFinalInspection(materialInboundItemId: string, companyId: string, userId: string) {
    const inspection = await this.prisma.incomingInspection.findFirst({
      where: {
        company_id: companyId,
        material_inbound_item_id: materialInboundItemId,
        is_final: true,
      },
      orderBy: { created_at: 'desc' },
    });
    if (!inspection) {
      throw new NotFoundException(
        `No final incoming inspection found for inbound item ${materialInboundItemId}`,
      );
    }

    const item = await this.prisma.materialInboundItem.findUnique({
      where: { id: materialInboundItemId },
      include: { inbound: true },
    });
    if (!item) {
      throw new NotFoundException(`Material inbound item ${materialInboundItemId} not found`);
    }

    // Idempotency: if already released (batch backfilled on item or inspection), do nothing.
    if (item.createdBatchId || inspection.material_batch_id) {
      return { released: false, batchId: item.createdBatchId ?? inspection.material_batch_id };
    }

    if (inspection.overall_result === 'fail') {
      throw new BadRequestException('Failed incoming inspection cannot create material batch');
    }

    if (
      inspection.overall_result === 'conditional_pass' &&
      inspection.disposition !== 'concession'
    ) {
      throw new BadRequestException(
        'Conditional pass requires disposition "concession" before release',
      );
    }

    if (inspection.overall_result !== 'pass' && inspection.overall_result !== 'conditional_pass') {
      throw new BadRequestException(
        `Cannot release inspection with result "${inspection.overall_result}"`,
      );
    }

    const material = await this.prisma.material.findUnique({
      where: { id: item.materialId },
      select: { unit: true },
    });
    const unit = material?.unit ?? DEFAULT_MATERIAL_UNIT;

    const batchId = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const batchNumber = await this.batchNumberGenerator.generateBatchNumber('material');

      const batch = await tx.materialBatch.create({
        data: {
          batchNumber,
          materialId: item.materialId,
          supplierBatchNo: item.supplierBatchNo,
          supplierId: item.inbound.supplierId,
          productionDate: item.productionDate,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          status: 'normal',
        },
      });

      // Authoritative concurrency guard: an atomic conditional claim on the
      // inbound item. Only ONE concurrent transaction can flip createdBatchId
      // from null. Under Postgres READ COMMITTED a second tx blocks on the row
      // lock held by the first, then re-evaluates `createdBatchId = null`
      // against the committed row → 0 rows matched → count 0 → throw →
      // rollback, undoing the just-created batch. This serializes releases so
      // only one batch/movement/stockRecord is ever created per inbound item.
      const claim = await tx.materialInboundItem.updateMany({
        where: { id: materialInboundItemId, createdBatchId: null },
        data: { createdBatchId: batch.id, disposition: inspection.disposition },
      });
      if (claim.count === 0) {
        throw new ConflictException('Material inbound item already released');
      }

      await this.inventoryMovementLedger.recordMaterialBatchMovement(
        {
          movementType: 'receive',
          batchId: batch.id,
          quantity: item.quantity,
          unit,
          refType: 'incoming_inspection',
          refId: inspection.id,
          operatorId: userId,
          movedAt: new Date(),
          notes: '来料检验放行入库',
        },
        tx,
      );

      await tx.stockRecord.create({
        data: {
          batchId: batch.id,
          recordType: 'in',
          quantity: item.quantity,
          relatedId: inspection.id,
          relatedType: 'incoming_inspection',
          operatorId: userId,
        },
      });

      await tx.incomingInspection.update({
        where: { id: inspection.id },
        data: { material_batch_id: batch.id },
      });

      return batch.id;
    });

    this.eventEmitter.emit('incoming-inspection.released', {
      id: inspection.id,
      material_inbound_item_id: materialInboundItemId,
      material_batch_id: batchId,
      company_id: companyId,
    });

    return { released: true, batchId };
  }

  async findByBatch(materialBatchId: string, companyId: string) {
    return this.prisma.incomingInspection.findMany({
      where: { material_batch_id: materialBatchId, company_id: companyId },
      include: { results: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.incomingInspection.findMany({
      where: { company_id: companyId },
      include: {
        results: true,
        material_batch: { include: { material: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string, companyId: string) {
    const inspection = await this.prisma.incomingInspection.findFirst({
      where: { id, company_id: companyId },
    });
    if (!inspection) throw new NotFoundException(`Incoming inspection ${id} not found`);
    return inspection;
  }

  async uploadReport(
    inspectionId: string,
    dto: InspectionReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
    companyId: string,
  ) {
    const inspection = await this.findOne(inspectionId, companyId);
    const { document, preview } = await this.createReportDocument(inspectionId, inspection.material_batch_id, dto, file, userId);
    const link = await this.businessDocumentLinkService.link({
      documentId: document.id,
      businessType: 'incoming_inspection',
      businessId: inspectionId,
      documentKind: 'external_inspection_report',
      required: false,
      expiresAt: dto.expiresAt,
      status: this.getReportStatus(dto.expiresAt),
      metadata: {
        reportNo: dto.reportNo,
        testedAt: dto.testedAt?.toISOString(),
        conclusion: dto.conclusion,
        materialBatchId: inspection.material_batch_id,
      },
    });

    return { document, link, preview };
  }

  async getReports(inspectionId: string, companyId: string) {
    await this.findOne(inspectionId, companyId);
    const links = await this.prisma.businessDocumentLink.findMany({
      where: {
        businessType: 'incoming_inspection',
        businessId: inspectionId,
        documentKind: 'external_inspection_report',
      },
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
    inspectionId: string,
    linkId: string,
    dto: InspectionReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
    companyId: string,
  ) {
    const inspection = await this.findOne(inspectionId, companyId);
    const existingLink = await this.prisma.businessDocumentLink.findFirst({
      where: { id: linkId, businessType: 'incoming_inspection', businessId: inspectionId },
    });
    if (!existingLink) throw new NotFoundException('Incoming inspection report link not found');

    const { document, preview } = await this.createReportDocument(inspectionId, inspection.material_batch_id, dto, file, userId);
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
          materialBatchId: inspection.material_batch_id,
        },
      },
    });

    return { document, link, preview };
  }

  private async createReportDocument(
    inspectionId: string,
    materialBatchId: string | null,
    dto: InspectionReportDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const upload = await this.storageService.uploadFile(file, 'incoming-inspection-reports');
    const document = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: 4,
        number: `IQC-${inspectionId}-${Date.now()}`,
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
          inspectionId,
          materialBatchId,
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
    return typeof value === 'string' ? value : undefined;
  }
}
