import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierService } from './supplier.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
});
