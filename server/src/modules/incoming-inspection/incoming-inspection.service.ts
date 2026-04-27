import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionReportDocumentDto } from './dto/inspection-report-document.dto';

@Injectable()
export class IncomingInspectionService {
  private readonly snowflake = new Snowflake(1, 4);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly businessDocumentLinkService: BusinessDocumentLinkService,
  ) {}

  async create(dto: CreateInspectionDto, companyId: number, inspectorId: string) {
    const result = await this.prisma.incomingInspection.create({
      data: {
        company_id: companyId,
        material_batch_id: dto.material_batch_id,
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
      company_id: String(result.company_id),
    });

    return result;
  }

  async findByBatch(materialBatchId: string, companyId: number) {
    return this.prisma.incomingInspection.findMany({
      where: { material_batch_id: materialBatchId, company_id: companyId },
      include: { results: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findAll(companyId: number) {
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

  async findOne(id: string, companyId: number) {
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
    companyId: number,
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

  async getReports(inspectionId: string, companyId: number) {
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
    companyId: number,
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
    materialBatchId: string,
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
