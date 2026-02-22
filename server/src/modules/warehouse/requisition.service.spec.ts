import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitionService } from './requisition.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('RequisitionService', () => {
  let service: RequisitionService;
  let prisma: PrismaService;

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
              update: jest.fn(),
            },
            stagingAreaStock: {
              upsert: jest.fn(),
            },
            stockRecord: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RequisitionService>(RequisitionService);
    prisma = module.get<PrismaService>(PrismaService);
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
      
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback(prisma);
      });

      await service.complete('req-001', 'user-001');

      expect(prisma.$transaction).toHaveBeenCalled();
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
