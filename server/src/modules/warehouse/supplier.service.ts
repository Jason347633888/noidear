import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services';
import { Snowflake } from '../../common/utils';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  QuerySupplierDto,
  CreateQualificationDto,
  SupplierControlledDocumentDto,
} from './dto/supplier.dto';
import * as dayjs from 'dayjs';

@Injectable()
export class SupplierService {
  private readonly snowflake = new Snowflake(1, 2);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly businessDocumentLinkService: BusinessDocumentLinkService,
  ) {}

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: createSupplierDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Supplier code already exists');
      }
      throw error;
    }
  }

  async findAll(query: QuerySupplierDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(search, status);

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private buildWhereClause(search?: string, status?: string) {
    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { supplierCode: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    return where;
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: { status: 'disabled' },
    });
  }

  async addQualification(supplierId: string, createQualificationDto: CreateQualificationDto) {
    await this.findOne(supplierId);

    return this.prisma.supplierQualification.create({
      data: {
        supplierId,
        ...createQualificationDto,
      },
    });
  }

  async getQualifications(supplierId: string) {
    await this.findOne(supplierId);

    return this.prisma.supplierQualification.findMany({
      where: { supplierId },
      orderBy: { validUntil: 'asc' },
    });
  }

  async checkExpiringQualifications(currentDate: Date = new Date()) {
    const thirtyDaysLater = dayjs(currentDate).add(30, 'days').toDate();

    return this.prisma.supplierQualification.findMany({
      where: {
        status: 'valid',
        validUntil: {
          gte: currentDate,
          lte: thirtyDaysLater,
        },
      },
      include: {
        supplier: true,
      },
    });
  }

  async uploadControlledDocument(
    supplierId: string,
    dto: SupplierControlledDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const supplier = await this.findOne(supplierId);
    const { document, supplierDocument, preview } = await this.createControlledDocumentArtifacts(
      supplierId,
      supplier.name,
      dto,
      file,
      userId,
    );

    const link = await this.businessDocumentLinkService.link({
      documentId: document.id,
      businessType: 'supplier',
      businessId: supplierId,
      documentKind: dto.documentKind,
      required: true,
      issuedAt: dto.issuedAt,
      expiresAt: dto.expiresAt,
      status: this.getSupplierDocumentStatus(dto.expiresAt),
      metadata: {
        supplierDocumentId: supplierDocument.id,
        docNo: dto.docNo,
        issuedBy: dto.issuedBy,
      },
    });

    return {
      document,
      supplierDocument,
      link,
      preview,
    };
  }

  async getControlledDocuments(supplierId: string) {
    await this.findOne(supplierId);
    const links = await this.prisma.businessDocumentLink.findMany({
      where: { businessType: 'supplier', businessId: supplierId },
      include: {
        document: { select: { id: true, title: true, fileName: true, fileType: true } },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return links.map((link) => ({
      id: link.id,
      documentId: link.documentId,
      documentKind: link.documentKind,
      documentTitle: link.document.title,
      fileName: link.document.fileName,
      fileType: link.document.fileType,
      docNo: this.getMetadataString(link.metadata, 'docNo'),
      expiresAt: link.expiresAt,
      status: link.status,
    }));
  }

  async replaceControlledDocument(
    supplierId: string,
    linkId: string,
    dto: SupplierControlledDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const supplier = await this.findOne(supplierId);
    const existingLink = await this.prisma.businessDocumentLink.findFirst({
      where: { id: linkId, businessType: 'supplier', businessId: supplierId },
    });

    if (!existingLink) {
      throw new NotFoundException('Supplier document link not found');
    }

    const { document, supplierDocument, preview } = await this.createControlledDocumentArtifacts(
      supplierId,
      supplier.name,
      dto,
      file,
      userId,
    );
    const link = await this.prisma.businessDocumentLink.update({
      where: { id: linkId },
      data: {
        documentId: document.id,
        documentKind: dto.documentKind,
        issuedAt: dto.issuedAt,
        expiresAt: dto.expiresAt,
        status: this.getSupplierDocumentStatus(dto.expiresAt),
        metadata: {
          supplierDocumentId: supplierDocument.id,
          docNo: dto.docNo,
          issuedBy: dto.issuedBy,
        },
      },
    });

    return {
      document,
      supplierDocument,
      link,
      preview,
    };
  }

  private async createControlledDocumentArtifacts(
    supplierId: string,
    supplierName: string,
    dto: SupplierControlledDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ) {
    const upload = await this.storageService.uploadFile(file, 'supplier-documents');
    const document = await this.prisma.document.create({
      data: {
        id: this.snowflake.nextId(),
        level: 4,
        number: `SUP-${supplierId}-${Date.now()}`,
        title: dto.docName,
        filePath: upload.path,
        fileName: file.originalname,
        fileSize: Number(file.size),
        fileType: file.mimetype,
        status: 'draft',
        creatorId: userId,
        document_type: 'EXTERNAL_FILE',
        source_folder: '06',
        owner_department: '采购部',
        external_expires_at: dto.expiresAt,
        metadata: {
          supplierId,
          supplierName,
          documentKind: dto.documentKind,
          docNo: dto.docNo,
          issuedBy: dto.issuedBy,
        },
      },
    });

    const existingSupplierDocument = await this.prisma.supplierDocument.findFirst({
      where: {
        supplier_id: supplierId,
        doc_type: dto.documentKind,
        doc_no: dto.docNo ?? null,
      },
    });
    const supplierDocumentData = {
      company_id: 1,
      supplier_id: supplierId,
      doc_type: dto.documentKind,
      doc_name: dto.docName,
      doc_no: dto.docNo,
      issued_by: dto.issuedBy,
      issued_at: dto.issuedAt,
      expires_at: dto.expiresAt,
      file_url: upload.path,
      status: this.getSupplierDocumentStatus(dto.expiresAt),
    };
    const supplierDocument = existingSupplierDocument
      ? await this.prisma.supplierDocument.update({
        where: { id: existingSupplierDocument.id },
        data: supplierDocumentData,
      })
      : await this.prisma.supplierDocument.create({ data: supplierDocumentData });
    const previewUrl = file.mimetype.includes('pdf')
      ? await this.storageService.getSignedUrl(upload.path, 900)
      : undefined;

    return {
      document,
      supplierDocument,
      preview: {
        type: file.mimetype.includes('pdf') ? 'pdf' : 'unknown',
        url: previewUrl,
        fileName: file.originalname,
      },
    };
  }

  private getSupplierDocumentStatus(expiresAt?: Date) {
    if (!expiresAt) return 'valid';
    const today = dayjs();
    if (dayjs(expiresAt).isBefore(today, 'day')) return 'expired';
    if (dayjs(expiresAt).isBefore(today.add(30, 'day'), 'day')) return 'expiring_soon';
    return 'valid';
  }

  private getMetadataString(metadata: unknown, key: string) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  }
}
