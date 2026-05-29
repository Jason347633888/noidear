import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { InboundService } from './inbound.service';
import { SupplierAccessService } from './services/supplier-access.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InboundService', () => {
  let service: InboundService;
  let prisma: PrismaService;
  let supplierAccess: SupplierAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboundService,
        {
          provide: PrismaService,
          useValue: {
            materialInbound: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            materialInboundItem: {
              createMany: jest.fn(),
            },
            materialBatch: {
              create: jest.fn(),
            },
            stockRecord: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: SupplierAccessService,
          useValue: {
            assertSupplierUsable: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InboundService>(InboundService);
    prisma = module.get<PrismaService>(PrismaService);
    supplierAccess = module.get<SupplierAccessService>(SupplierAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create inbound order with items', async () => {
      // Arrange
      const createDto = {
        supplierId: 'supplier-001',
        items: [
          {
            materialId: 'material-001',
            quantity: 100,
            supplierBatchNo: 'SUP-BATCH-001',
            productionDate: new Date('2026-01-01'),
            expiryDate: new Date('2026-07-01'),
          },
        ],
        remark: '测试入库',
      };

      const mockInbound = {
        id: 'inbound-001',
        inboundNo: 'IN-20260215-001',
        supplierId: 'supplier-001',
        status: 'draft',
        createdAt: new Date(),
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          materialInbound: {
            create: jest.fn().mockResolvedValue(mockInbound),
          },
          materialInboundItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        });
      });

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.inboundNo).toContain('IN-');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(supplierAccess.assertSupplierUsable).toHaveBeenCalledWith('supplier-001', '创建来料单');
    });

    it('should write operatorId at creation so creator can see the record via ownership filter', async () => {
      // Arrange: P2-R10-4 regression — operatorId must be set at create time
      const createDto = {
        supplierId: 'supplier-001',
        items: [
          {
            materialId: 'material-001',
            quantity: 10,
            supplierBatchNo: 'SUP-001',
            productionDate: new Date('2026-01-01'),
            expiryDate: new Date('2027-01-01'),
          },
        ],
      };
      const userId = 'user-abc';

      let capturedData: any;
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          materialInbound: {
            create: jest.fn().mockImplementation(async (args: any) => {
              capturedData = args.data;
              return { id: 'inbound-xyz', inboundNo: 'IN-20260524-001', ...args.data };
            }),
          },
          materialInboundItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        });
      });

      // Act
      await service.create(createDto, userId);

      // Assert: operatorId must be written at creation time
      expect(capturedData).toBeDefined();
      expect(capturedData.operatorId).toBe(userId);
    });

    it('should reject inbound creation when supplier is not usable', async () => {
      const createDto = {
        supplierId: 'supplier-001',
        items: [
          {
            materialId: 'material-001',
            quantity: 100,
            supplierBatchNo: 'SUP-BATCH-001',
            productionDate: new Date('2026-01-01'),
            expiryDate: new Date('2026-07-01'),
          },
        ],
        remark: '测试入库',
      };

      jest
        .spyOn(supplierAccess, 'assertSupplierUsable')
        .mockRejectedValue(new BadRequestException('供应商已淘汰'));

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve inbound order', async () => {
      // Arrange
      const mockInbound = {
        id: 'inbound-001',
        status: 'pending',
        deletedAt: null,
      };

      const mockApproved = {
        ...mockInbound,
        status: 'approved',
        approvedAt: new Date(),
      };

      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(mockInbound as any);
      jest.spyOn(prisma.materialInbound, 'update').mockResolvedValue(mockApproved as any);

      // Act
      const result = await service.approve('inbound-001', 'user-001');

      // Assert
      expect(result.status).toBe('approved');
      expect(prisma.materialInbound.update).toHaveBeenCalledWith({
        where: { id: 'inbound-001' },
        data: {
          status: 'approved',
          approvedAt: expect.any(Date),
          approvedBy: 'user-001',
        },
      });
    });

    it('should throw BadRequestException if already approved', async () => {
      // Arrange
      const mockInbound = {
        id: 'inbound-001',
        status: 'approved',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(mockInbound as any);

      // Act & Assert
      await expect(service.approve('inbound-001', 'user-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete', () => {
    it('should only transition status to completed without creating any batch/stock', async () => {
      // Batches/stock are now gated behind a final incoming inspection release,
      // so complete() must no longer create MaterialBatch/StockRecord/ledger entries.
      const mockInbound = {
        id: 'inbound-001',
        status: 'approved',
        supplierId: 'supplier-001',
        deletedAt: null,
        items: [
          {
            id: 'item-001',
            materialId: 'material-001',
            quantity: 100,
            supplierBatchNo: 'SUP-001',
            productionDate: new Date('2026-01-01'),
            expiryDate: new Date('2026-07-01'),
          },
        ],
      };

      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(mockInbound as any);
      jest
        .spyOn(prisma.materialInbound, 'update')
        .mockResolvedValue({ ...mockInbound, status: 'completed' } as any);

      // Act
      const result = await service.complete('inbound-001', 'user-001');

      // Assert: status transition only, no batch/stock/ledger side-effects
      expect(result.status).toBe('completed');
      expect(prisma.materialInbound.update).toHaveBeenCalledWith({
        where: { id: 'inbound-001' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
          operatorId: 'user-001',
        },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.materialBatch.create).not.toHaveBeenCalled();
      expect(prisma.stockRecord.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if not approved', async () => {
      // Arrange
      const mockInbound = {
        id: 'inbound-001',
        status: 'draft',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(mockInbound as any);

      // Act & Assert
      await expect(service.complete('inbound-001', 'user-001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const adminOwnership = { userId: 'admin-1', roleCode: 'admin' as const, departmentId: null, managedDepartmentIds: undefined };

    it('should return paginated inbound orders', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };

      const mockInbounds = [
        {
          id: 'inbound-001',
          inboundNo: 'IN-001',
          status: 'pending',
        },
      ];

      jest.spyOn(prisma.materialInbound, 'findMany').mockResolvedValue(mockInbounds as any);
      jest.spyOn(prisma.materialInbound, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(query, adminOwnership);

      // Assert
      expect(result).toEqual({
        data: mockInbounds,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    it('should support filter by status', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        status: 'approved',
      };

      jest.spyOn(prisma.materialInbound, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.materialInbound, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(query, adminOwnership);

      // Assert
      expect(prisma.materialInbound.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: 'approved',
        },
        skip: 0,
        take: 10,
        include: {
          supplier: true,
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return inbound with items', async () => {
      // Arrange
      const mockInbound = {
        id: 'inbound-001',
        deletedAt: null,
        items: [],
      };

      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(mockInbound as any);

      // Act
      const result = await service.findOne('inbound-001');

      // Assert
      expect(result).toEqual(mockInbound);
    });

    it('should throw NotFoundException if not found', async () => {
      // Arrange
      jest.spyOn(prisma.materialInbound, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});
