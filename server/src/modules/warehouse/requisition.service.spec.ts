import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitionService } from './requisition.service';
import { InventoryMovementLedgerService } from './services/inventory-movement-ledger.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RequisitionService', () => {
  let service: RequisitionService;
  let prisma: PrismaService;
  let inventoryMovementLedger: InventoryMovementLedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequisitionService,
        {
          provide: PrismaService,
          useValue: {
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
      ],
    }).compile();

    service = module.get<RequisitionService>(RequisitionService);
    prisma = module.get<PrismaService>(PrismaService);
    inventoryMovementLedger = module.get<InventoryMovementLedgerService>(InventoryMovementLedgerService);
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
      expect(inventoryMovementLedger.recordMaterialBatchMovement).toHaveBeenCalledWith(
        expect.objectContaining({ movementType: 'issue_to_production', batchId: 'batch-001' }),
        txClient,
      );
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
