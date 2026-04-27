import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierService } from './supplier.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../common/services';
import { BusinessDocumentLinkService } from '../document/services/business-document-link.service';
import * as dayjs from 'dayjs';

describe('SupplierService', () => {
  let service: SupplierService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        {
          provide: PrismaService,
          useValue: {
            supplier: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            supplierQualification: {
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            document: {
              create: jest.fn(),
            },
            supplierDocument: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            businessDocumentLink: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
        {
          provide: BusinessDocumentLinkService,
          useValue: {
            link: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create supplier successfully', async () => {
      // Arrange
      const createDto = {
        supplierCode: 'SUP-001',
        name: '某供应商',
        contact: '张三',
        phone: '13800138000',
        address: '某市某区某街道',
      };

      const mockSupplier = {
        id: 'supplier-001',
        ...createDto,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      jest.spyOn(prisma.supplier, 'create').mockResolvedValue(mockSupplier as any);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockSupplier);
      expect(prisma.supplier.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });

    it('should throw BadRequestException if supplierCode already exists', async () => {
      // Arrange
      const createDto = {
        supplierCode: 'SUP-001',
        name: '某供应商',
      };

      jest.spyOn(prisma.supplier, 'create').mockRejectedValue({
        code: 'P2002',
        meta: { target: ['supplierCode'] },
      });

      // Act & Assert
      await expect(service.create(createDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated suppliers', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };

      const mockSuppliers = [
        {
          id: 'supplier-001',
          supplierCode: 'SUP-001',
          name: '供应商A',
          status: 'active',
        },
        {
          id: 'supplier-002',
          supplierCode: 'SUP-002',
          name: '供应商B',
          status: 'active',
        },
      ];

      jest.spyOn(prisma.supplier, 'findMany').mockResolvedValue(mockSuppliers as any);
      jest.spyOn(prisma.supplier, 'count').mockResolvedValue(2);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        data: mockSuppliers,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should support search by name', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        search: '供应商A',
      };

      jest.spyOn(prisma.supplier, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.supplier, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: '供应商A' } },
            { supplierCode: { contains: '供应商A' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should support filter by status', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        status: 'active',
      };

      jest.spyOn(prisma.supplier, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.supplier, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query);

      // Assert
      expect(prisma.supplier.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: 'active',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return supplier by id', async () => {
      // Arrange
      const mockSupplier = {
        id: 'supplier-001',
        supplierCode: 'SUP-001',
        name: '供应商A',
        status: 'active',
        deletedAt: null,
      };

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(mockSupplier as any);

      // Act
      const result = await service.findOne('supplier-001');

      // Assert
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      // Arrange
      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update supplier successfully', async () => {
      // Arrange
      const updateDto = {
        name: '供应商A（更新）',
        contact: '李四',
      };

      const mockSupplier = {
        id: 'supplier-001',
        deletedAt: null,
      };

      const mockUpdatedSupplier = {
        ...mockSupplier,
        ...updateDto,
      };

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(mockSupplier as any);
      jest.spyOn(prisma.supplier, 'update').mockResolvedValue(mockUpdatedSupplier as any);

      // Act
      const result = await service.update('supplier-001', updateDto);

      // Assert
      expect(result).toEqual(mockUpdatedSupplier);
    });
  });

  describe('disable', () => {
    it('should disable supplier successfully', async () => {
      // Arrange
      const mockSupplier = {
        id: 'supplier-001',
        status: 'active',
        deletedAt: null,
      };

      const mockDisabledSupplier = {
        ...mockSupplier,
        status: 'disabled',
      };

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue(mockSupplier as any);
      jest.spyOn(prisma.supplier, 'update').mockResolvedValue(mockDisabledSupplier as any);

      // Act
      const result = await service.disable('supplier-001');

      // Assert
      expect(result).toEqual(mockDisabledSupplier);
      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-001' },
        data: { status: 'disabled' },
      });
    });
  });

  describe('addQualification', () => {
    it('should add qualification successfully', async () => {
      // Arrange
      const createDto = {
        qualificationType: 'license',
        certificateNo: 'CERT-001',
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2027-01-01'),
      };

      const mockQualification = {
        id: 'qual-001',
        supplierId: 'supplier-001',
        ...createDto,
        attachmentPath: null,
        status: 'valid',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({ deletedAt: null } as any);
      jest.spyOn(prisma.supplierQualification, 'create').mockResolvedValue(mockQualification as any);

      // Act
      const result = await service.addQualification('supplier-001', createDto);

      // Assert
      expect(result).toEqual(mockQualification);
      expect(prisma.supplierQualification.create).toHaveBeenCalledWith({
        data: {
          supplierId: 'supplier-001',
          ...createDto,
        },
      });
    });
  });

  describe('getQualifications', () => {
    it('should return all qualifications for supplier', async () => {
      // Arrange
      const mockQualifications = [
        {
          id: 'qual-001',
          supplierId: 'supplier-001',
          qualificationType: 'license',
          status: 'valid',
        },
      ];

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({ deletedAt: null } as any);
      jest.spyOn(prisma.supplierQualification, 'findMany').mockResolvedValue(mockQualifications as any);

      // Act
      const result = await service.getQualifications('supplier-001');

      // Assert
      expect(result).toEqual(mockQualifications);
    });
  });

  describe('checkExpiringQualifications', () => {
    it('should return qualifications expiring within 30 days', async () => {
      // Arrange
      const now = new Date('2026-01-01');
      const expiring = new Date('2026-01-15');

      const mockQualifications = [
        {
          id: 'qual-001',
          validUntil: expiring,
          status: 'valid',
        },
      ];

      jest.spyOn(prisma.supplierQualification, 'findMany').mockResolvedValue(mockQualifications as any);

      // Act
      const result = await service.checkExpiringQualifications(now);

      // Assert
      expect(result).toEqual(mockQualifications);
    });
  });

  describe('uploadControlledDocument', () => {
    it('creates Document, SupplierDocument, BusinessDocumentLink, and preview info for a business license', async () => {
      const storage = (service as any).storageService;
      const businessDocumentLinkService = (service as any).businessDocumentLinkService;
      const file = {
        originalname: 'license.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('pdf'),
      } as Express.Multer.File;
      const expiresAt = new Date('2027-01-01');

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-001',
        name: '供应商A',
        deletedAt: null,
      } as any);
      storage.uploadFile.mockResolvedValue({
        path: 'supplier-documents/license.pdf',
        url: '/documents/supplier-documents/license.pdf',
        filename: 'license.pdf',
        size: 2048,
        mimetype: 'application/pdf',
      });
      storage.getSignedUrl.mockResolvedValue('https://preview.local/license.pdf');
      (prisma.document.create as jest.Mock).mockResolvedValue({
        id: 'doc-001',
        title: '营业执照',
        fileName: 'license.pdf',
        fileType: 'application/pdf',
      });
      (prisma.supplierDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supplierDocument.create as jest.Mock).mockResolvedValue({ id: 1 });
      businessDocumentLinkService.link.mockResolvedValue({ id: 'link-001' });

      const result = await service.uploadControlledDocument('supplier-001', {
        documentKind: 'business_license',
        docName: '营业执照',
        docNo: 'BL-001',
        expiresAt,
      }, file, 'user-1');

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '营业执照',
          filePath: 'supplier-documents/license.pdf',
          fileName: 'license.pdf',
          fileType: 'application/pdf',
          creatorId: 'user-1',
          document_type: 'EXTERNAL_FILE',
          external_expires_at: expiresAt,
        }),
      });
      expect(prisma.supplierDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplier_id: 'supplier-001',
          doc_type: 'business_license',
          doc_name: '营业执照',
          doc_no: 'BL-001',
          expires_at: expiresAt,
          file_url: 'supplier-documents/license.pdf',
        }),
      });
      expect(businessDocumentLinkService.link).toHaveBeenCalledWith(expect.objectContaining({
        documentId: 'doc-001',
        businessType: 'supplier',
        businessId: 'supplier-001',
        documentKind: 'business_license',
        expiresAt,
        status: 'valid',
      }));
      expect(result.preview).toEqual({
        type: 'pdf',
        url: 'https://preview.local/license.pdf',
        fileName: 'license.pdf',
      });
    });
  });

  describe('replaceControlledDocument', () => {
    it('creates a new Document and updates the existing BusinessDocumentLink', async () => {
      const storage = (service as any).storageService;
      const file = {
        originalname: 'license-v2.pdf',
        mimetype: 'application/pdf',
        size: 4096,
        buffer: Buffer.from('pdf-v2'),
      } as Express.Multer.File;
      const expiresAt = new Date('2028-01-01');

      jest.spyOn(prisma.supplier, 'findUnique').mockResolvedValue({
        id: 'supplier-001',
        name: '供应商A',
        deletedAt: null,
      } as any);
      storage.uploadFile.mockResolvedValue({
        path: 'supplier-documents/license-v2.pdf',
        url: '/documents/supplier-documents/license-v2.pdf',
        filename: 'license-v2.pdf',
        size: 4096,
        mimetype: 'application/pdf',
      });
      storage.getSignedUrl.mockResolvedValue('https://preview.local/license-v2.pdf');
      (prisma.businessDocumentLink.findFirst as jest.Mock).mockResolvedValue({ id: 'link-001' });
      (prisma.document.create as jest.Mock).mockResolvedValue({
        id: 'doc-002',
        title: '营业执照',
        fileName: 'license-v2.pdf',
        fileType: 'application/pdf',
      });
      (prisma.supplierDocument.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.supplierDocument.update as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.businessDocumentLink.update as jest.Mock).mockResolvedValue({
        id: 'link-001',
        documentId: 'doc-002',
      });

      const result = await service.replaceControlledDocument('supplier-001', 'link-001', {
        documentKind: 'business_license',
        docName: '营业执照',
        docNo: 'BL-001',
        expiresAt,
      }, file, 'user-1');

      expect(prisma.businessDocumentLink.findFirst).toHaveBeenCalledWith({
        where: { id: 'link-001', businessType: 'supplier', businessId: 'supplier-001' },
      });
      expect(prisma.businessDocumentLink.update).toHaveBeenCalledWith({
        where: { id: 'link-001' },
        data: expect.objectContaining({
          documentId: 'doc-002',
          documentKind: 'business_license',
          expiresAt,
          status: 'valid',
        }),
      });
      expect(result.preview).toEqual({
        type: 'pdf',
        url: 'https://preview.local/license-v2.pdf',
        fileName: 'license-v2.pdf',
      });
    });
  });
});
