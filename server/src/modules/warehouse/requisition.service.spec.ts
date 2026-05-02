import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitionService } from './requisition.service';
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
import { SupplierAccessService } from './services/supplier-access.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RequisitionService', () => {
  let service: RequisitionService;
  let prisma: PrismaService;
  let inventoryMovementLedger: InventoryMovementLedgerService;
  let supplierAccess: SupplierAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequisitionService,
        {
          provide: PrismaService,
          useValue: {
            equipment: {
              findFirst: jest.fn(),
            },
            materialRequisition: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            materialRequisitionItem: {
              createMany: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
              updateMany: jest.fn(),
            },
            stagingAreaStock: {
              upsert: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            stockRecord: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: InventoryMovementLedgerService,
          useValue: { recordMaterialBatchMovement: jest.fn() },
        },
        {
          provide: SupplierAccessService,
          useValue: {
            assertBatchSupplierUsable: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RequisitionService>(RequisitionService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryMovementLedger = module.get<InventoryMovementLedgerService>(InventoryMovementLedgerService);
    supplierAccess = module.get<SupplierAccessService>(SupplierAccessService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create requisition with items', async () => {
      const createDto = {
        requisitionType: 'production',
        applicantId: 'user-001',
        items: [
          {
            materialId: 'material-001',
            batchId: 'batch-001',
            quantity: 50,
          },
        ],
      };

      const mockRequisition = {
        id: 'req-001',
        requisitionNo: 'REQ-20260216-001',
        status: 'draft',
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          materialRequisition: {
            create: jest.fn().mockResolvedValue(mockRequisition),
          },
          materialRequisitionItem: {
            createMany: jest.fn(),
          },
        });
      });

      const result = await service.create(createDto);

      expect(result.requisitionNo).toContain('REQ-');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('requires equipmentId for maintenance requisitions', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: { create: jest.fn() },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.create({
        requisitionType: 'maintenance',
        applicantId: 'user-001',
        items: [],
      })).rejects.toThrow(BadRequestException);

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).not.toHaveBeenCalled();
    });

    it('validates and persists equipmentId for maintenance requisitions', async () => {
      const createDto = {
        requisitionType: 'maintenance',
        equipmentId: 'eq-001',
        applicantId: 'user-001',
        items: [{ batchId: 'batch-001', quantity: 2 }],
      };

      const mockRequisition = {
        id: 'req-001',
        requisitionNo: 'REQ-20260502-001',
        requisitionType: 'maintenance',
        equipmentId: 'eq-001',
        status: 'draft',
      };

      const txClient = {
        equipment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'eq-001', deletedAt: null }),
        },
        materialRequisition: {
          create: jest.fn().mockResolvedValue(mockRequisition),
        },
        materialRequisitionItem: {
          createMany: jest.fn(),
        },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      const result = await service.create(createDto);

      expect(txClient.equipment.findFirst).toHaveBeenCalledWith({
        where: { id: 'eq-001', deletedAt: null },
        select: { id: true },
      });
      expect(txClient.materialRequisition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requisitionType: 'maintenance',
          equipmentId: 'eq-001',
        }),
      });
      expect(result.equipmentId).toBe('eq-001');
    });

    it('rejects equipmentId for non-maintenance requisitions', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: { create: jest.fn() },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.create({
        requisitionType: 'production',
        equipmentId: 'eq-001',
        applicantId: 'user-001',
        items: [],
      })).rejects.toThrow(BadRequestException);

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).not.toHaveBeenCalled();
    });

    it('keeps legacy targetZone-only requisition creation compatible', async () => {
      const txClient = {
        equipment: { findFirst: jest.fn() },
        materialRequisition: {
          create: jest.fn().mockResolvedValue({
            id: 'req-legacy',
            requisitionNo: 'REQ-20260502-legacy',
            requisitionType: 'production',
            targetZone: '小料房',
            status: 'draft',
          }),
        },
        materialRequisitionItem: { createMany: jest.fn() },
      };
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      const result = await service.create({ targetZone: '小料房', applicantId: 'user-001' });

      expect(txClient.equipment.findFirst).not.toHaveBeenCalled();
      expect(txClient.materialRequisition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requisitionType: 'production',
          targetZone: '小料房',
          applicantId: 'user-001',
        }),
      });
      expect(txClient.materialRequisitionItem.createMany).not.toHaveBeenCalled();
      expect(result.requisitionType).toBe('production');
    });
  });

  describe('approve', () => {
    it('should approve requisition', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'pending',
        deletedAt: null,
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);
      jest.spyOn(prisma.materialRequisition, 'update').mockResolvedValue({
        ...mockRequisition,
        status: 'approved',
      } as any);

      const result = await service.approve('req-001', 'user-001');

      expect(result.status).toBe('approved');
    });
  });

  describe('complete', () => {
    it('should reject completion when requested quantity exceeds batch stock (atomic updateMany returns count=0)', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'approved',
        items: [{ batchId: 'batch-001', quantity: 50 }],
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);

      const txClient = {
        materialBatch: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue({ batchNumber: 'MB-001' }),
        },
        stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
        stockRecord: { create: jest.fn() },
        materialRequisition: { update: jest.fn() },
        materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
      expect(txClient.stockRecord.create).not.toHaveBeenCalled();
      expect(txClient.stagingAreaStock.create).not.toHaveBeenCalled();
      expect(txClient.stagingAreaStock.update).not.toHaveBeenCalled();
      expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException and stop side effects when batch does not exist (updateMany count=0, findUnique null)', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'approved',
        items: [{ batchId: 'batch-nonexistent', quantity: 10 }],
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);

      const txClient = {
        materialBatch: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
        stockRecord: { create: jest.fn() },
        materialRequisition: { update: jest.fn() },
        materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => callback(txClient));

      await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
      expect(txClient.stockRecord.create).not.toHaveBeenCalled();
      expect(inventoryMovementLedger.recordMaterialBatchMovement).not.toHaveBeenCalled();
    });

    it('should complete requisition and update inventory', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'approved',
        items: [
          {
            batchId: 'batch-001',
            quantity: 50,
          },
        ],
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);
      jest.spyOn(inventoryMovementLedger, 'recordMaterialBatchMovement').mockResolvedValue({} as any);

      const txClient = {
        materialBatch: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn(),
        },
        stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
        stockRecord: { create: jest.fn() },
        materialRequisition: { update: jest.fn().mockResolvedValue({ ...mockRequisition, status: 'completed' }) },
        materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(txClient);
      });

      await service.complete('req-001', 'user-001');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(supplierAccess.assertBatchSupplierUsable).toHaveBeenCalledWith('batch-001', '完成领料');
      expect(inventoryMovementLedger.recordMaterialBatchMovement).toHaveBeenCalledWith(
        expect.objectContaining({ movementType: 'issue_to_production', batchId: 'batch-001' }),
        txClient,
      );
    });

    it('should reject requisition completion when batch supplier is not usable', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'approved',
        items: [
          {
            batchId: 'batch-001',
            quantity: 50,
          },
        ],
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);
      jest
        .spyOn(supplierAccess, 'assertBatchSupplierUsable')
        .mockRejectedValue(new BadRequestException('供应商已淘汰'));

      const txClient = {
        materialBatch: { update: jest.fn() },
        stagingAreaStock: { upsert: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
        stockRecord: { create: jest.fn() },
        materialRequisition: { update: jest.fn() },
        materialRequisitionItem: { findMany: jest.fn().mockResolvedValue(mockRequisition.items) },
      };

      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(txClient);
      });

      await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
      expect(txClient.materialBatch.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if not approved', async () => {
      const mockRequisition = {
        id: 'req-001',
        status: 'draft',
      };

      jest.spyOn(prisma.materialRequisition, 'findUnique').mockResolvedValue(mockRequisition as any);

      await expect(service.complete('req-001', 'user-001')).rejects.toThrow(BadRequestException);
    });
  });
});
