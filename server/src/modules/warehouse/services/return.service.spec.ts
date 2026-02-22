import { Test, TestingModule } from '@nestjs/testing';
import { ReturnService } from './return.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReturnService', () => {
  let service: ReturnService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnService,
        {
          provide: PrismaService,
          useValue: {
            materialReturn: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            materialBatch: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            stagingAreaStock: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            stockRecord: {
              create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(prisma)),
          },
        },
      ],
    }).compile();

    service = module.get<ReturnService>(ReturnService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a material return', async () => {
      const dto = {
        items: [
          { materialBatchId: 'batch-1', quantity: 10 },
        ],
        reason: 'test reason',
        requesterId: 'user-1',
      };

      const mockBatch = { id: 'batch-1', batchNumber: 'BATCH-001' };
      const mockReturn = {
        id: 'return-1',
        returnNo: 'RET-20260215-001',
        ...dto,
        items: [{ id: 'item-1', materialBatchId: 'batch-1', quantity: 10 }],
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(mockBatch as any);
      jest.spyOn(prisma.materialReturn, 'count').mockResolvedValue(0);
      jest.spyOn(prisma.materialReturn, 'create').mockResolvedValue(mockReturn as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockReturn);
      expect(prisma.materialReturn.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if batch not found', async () => {
      const dto = {
        items: [{ materialBatchId: 'batch-1', quantity: 10 }],
        requesterId: 'user-1',
      };

      jest.spyOn(prisma.materialBatch, 'findUnique').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a material return', async () => {
      const mockReturn = {
        id: 'return-1',
        status: 'draft',
      };

      const updatedReturn = {
        ...mockReturn,
        status: 'approved',
        approvedBy: 'user-2',
        approvedAt: new Date(),
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);
      jest.spyOn(prisma.materialReturn, 'update').mockResolvedValue(updatedReturn as any);

      const result = await service.approve('return-1', { approvedBy: 'user-2' });

      expect(result.status).toBe('approved');
      expect(prisma.materialReturn.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if return not found', async () => {
      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(null);

      await expect(service.approve('return-1', { approvedBy: 'user-2' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if status is not draft', async () => {
      const mockReturn = {
        id: 'return-1',
        status: 'completed',
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);

      await expect(service.approve('return-1', { approvedBy: 'user-2' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete a material return with stock updates', async () => {
      const mockReturn = {
        id: 'return-1',
        returnNo: 'RET-20260215-001',
        status: 'approved',
        requesterId: 'user-1',
        items: [
          {
            id: 'item-1',
            materialBatchId: 'batch-1',
            quantity: 10,
            materialBatch: { id: 'batch-1', batchNumber: 'BATCH-001' },
          },
        ],
      };

      const mockStagingStock = {
        id: 'staging-1',
        batchId: 'batch-1',
        quantity: 20,
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);
      jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(mockStagingStock as any);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        return callback(prisma);
      });
      jest.spyOn(prisma.stagingAreaStock, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.materialBatch, 'update').mockResolvedValue({} as any);
      jest.spyOn(prisma.stockRecord, 'create').mockResolvedValue({} as any);
      jest.spyOn(prisma.materialReturn, 'update').mockResolvedValue({
        ...mockReturn,
        status: 'completed',
      } as any);

      const result = await service.complete('return-1');

      expect(result.status).toBe('completed');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if staging stock insufficient', async () => {
      const mockReturn = {
        id: 'return-1',
        status: 'approved',
        items: [
          {
            id: 'item-1',
            materialBatchId: 'batch-1',
            quantity: 100,
            materialBatch: { id: 'batch-1', batchNumber: 'BATCH-001' },
          },
        ],
      };

      const mockStagingStock = {
        id: 'staging-1',
        batchId: 'batch-1',
        quantity: 50,
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);
      jest.spyOn(prisma.stagingAreaStock, 'findFirst').mockResolvedValue(mockStagingStock as any);

      await expect(service.complete('return-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if status is not approved', async () => {
      const mockReturn = {
        id: 'return-1',
        status: 'draft',
        items: [],
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);

      await expect(service.complete('return-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all material returns', async () => {
      const mockReturns = [
        { id: 'return-1', returnNo: 'RET-001', items: [] },
        { id: 'return-2', returnNo: 'RET-002', items: [] },
      ];

      jest.spyOn(prisma.materialReturn, 'findMany').mockResolvedValue(mockReturns as any);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(prisma.materialReturn.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a material return by id', async () => {
      const mockReturn = {
        id: 'return-1',
        returnNo: 'RET-001',
        items: [],
      };

      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(mockReturn as any);

      const result = await service.findOne('return-1');

      expect(result).toEqual(mockReturn);
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(prisma.materialReturn, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('return-1')).rejects.toThrow(NotFoundException);
    });
  });
});
