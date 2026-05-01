import { Test } from '@nestjs/testing';
import { SupplierEvaluationService } from './supplier-evaluation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SupplierEvaluationService - company scoping', () => {
  let service: SupplierEvaluationService;

  const mockEvaluation = {
    id: 'eval-1',
    company_id: 'company-a',
    supplier_id: 'sup-1',
    eval_period: '2026-Q1',
    eval_date: new Date(),
    quality_score: 90,
    delivery_score: 80,
    service_score: 85,
    total_score: 85,
    verdict: 'approved',
    notes: null,
    evaluator_id: null,
    created_at: new Date(),
  };

  const mockPrisma = {
    supplierEvaluation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    supplier: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SupplierEvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(SupplierEvaluationService);
  });

  describe('create', () => {
    it('uses the provided companyId, not a hardcoded value', async () => {
      mockPrisma.supplierEvaluation.create.mockResolvedValue(mockEvaluation);
      mockPrisma.supplier.update.mockResolvedValue({});

      const dto = {
        supplier_id: 'sup-1',
        eval_period: '2026-Q1',
        quality_score: 90,
        delivery_score: 80,
        service_score: 85,
        verdict: 'approved',
        notes: null,
      } as any;

      await service.create(dto, 'company-a');

      expect(mockPrisma.supplierEvaluation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ company_id: 'company-a' }),
        }),
      );
    });

    it('does not hardcode company_id as "1"', async () => {
      mockPrisma.supplierEvaluation.create.mockResolvedValue(mockEvaluation);
      mockPrisma.supplier.update.mockResolvedValue({});

      const dto = {
        supplier_id: 'sup-1',
        eval_period: '2026-Q1',
        quality_score: 90,
        delivery_score: 80,
        service_score: 85,
        verdict: 'approved',
        notes: null,
      } as any;

      await service.create(dto, 'company-b');

      const callArg = mockPrisma.supplierEvaluation.create.mock.calls[0][0];
      expect(callArg.data.company_id).toBe('company-b');
      expect(callArg.data.company_id).not.toBe('1');
    });
  });

  describe('findAll', () => {
    it('filters by companyId', async () => {
      mockPrisma.supplierEvaluation.findMany.mockResolvedValue([mockEvaluation]);

      await service.findAll('company-a');

      expect(mockPrisma.supplierEvaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ company_id: 'company-a' }),
        }),
      );
    });
  });

  describe('findBySupplier', () => {
    it('filters by both supplierId and companyId', async () => {
      mockPrisma.supplierEvaluation.findMany.mockResolvedValue([mockEvaluation]);

      await service.findBySupplier('sup-1', 'company-a');

      expect(mockPrisma.supplierEvaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            supplier_id: 'sup-1',
            company_id: 'company-a',
          }),
        }),
      );
    });
  });
});
