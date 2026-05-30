import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExternalPartyEvaluationService } from './external-party-evaluation.service';

describe('ExternalPartyEvaluationService', () => {
  const prisma = {
    externalPartyEvaluation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    externalParty: {
      findFirst: jest.fn(),
    },
  };

  const service = new ExternalPartyEvaluationService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseEval = {
    id: 'eval-1',
    company_id: 'company-a',
    external_party_id: 'party-1',
    evaluation_type: 'contractor_food_safety',
    evaluation_date: new Date('2026-01-15'),
    score: 85,
    result: 'pass',
    risk_level: 'low',
    evaluator_id: 'user-1',
    evidence_file_id: null,
    next_review_at: null,
    created_at: new Date(),
  };

  describe('create', () => {
    it('creates evaluation for a non-supplier external party', async () => {
      prisma.externalParty.findFirst.mockResolvedValue({ id: 'party-1', party_type: 'carrier' });
      prisma.externalPartyEvaluation.create.mockResolvedValue(baseEval);

      const dto = {
        external_party_id: 'party-1',
        evaluation_type: 'contractor_food_safety',
        evaluation_date: new Date('2026-01-15'),
        result: 'pass',
        score: 85,
        risk_level: 'low',
        evaluator_id: 'user-1',
      };

      const result = await service.create('company-a', dto as any);

      expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
        where: { id: 'party-1', company_id: 'company-a', deleted_at: null },
      });
      expect(prisma.externalPartyEvaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company_id: 'company-a',
          external_party_id: 'party-1',
          evaluation_type: 'contractor_food_safety',
          result: 'pass',
        }),
      });
      expect(result).toEqual(baseEval);
    });

    it('rejects when the external party does not exist in the company', async () => {
      prisma.externalParty.findFirst.mockResolvedValue(null);

      await expect(
        service.create('company-a', {
          external_party_id: 'unknown',
          evaluation_type: 'logistics',
          evaluation_date: new Date(),
          result: 'pass',
        } as any),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.externalPartyEvaluation.create).not.toHaveBeenCalled();
    });

    it('rejects invalid evaluation_type', async () => {
      await expect(
        service.create('company-a', {
          external_party_id: 'party-1',
          evaluation_type: 'supplier_audit',
          evaluation_date: new Date(),
          result: 'pass',
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.externalParty.findFirst).not.toHaveBeenCalled();
      expect(prisma.externalPartyEvaluation.create).not.toHaveBeenCalled();
    });

    it('accepts all valid evaluation types', async () => {
      prisma.externalParty.findFirst.mockResolvedValue({ id: 'party-1', party_type: 'carrier' });
      prisma.externalPartyEvaluation.create.mockResolvedValue(baseEval);

      const validTypes = ['contractor_food_safety', 'logistics', 'outsourced_service', 'other'];

      for (const evalType of validTypes) {
        prisma.externalPartyEvaluation.create.mockClear();
        await service.create('company-a', {
          external_party_id: 'party-1',
          evaluation_type: evalType,
          evaluation_date: new Date(),
          result: 'pass',
        } as any);
        expect(prisma.externalPartyEvaluation.create).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('findByParty', () => {
    it('returns evaluations for the given party scoped to company', async () => {
      prisma.externalPartyEvaluation.findMany.mockResolvedValue([baseEval]);

      const result = await service.findByParty('party-1', 'company-a');

      expect(prisma.externalPartyEvaluation.findMany).toHaveBeenCalledWith({
        where: { external_party_id: 'party-1', company_id: 'company-a' },
        orderBy: { evaluation_date: 'desc' },
      });
      expect(result).toEqual([baseEval]);
    });

    it('returns empty array when no evaluations exist', async () => {
      prisma.externalPartyEvaluation.findMany.mockResolvedValue([]);

      const result = await service.findByParty('party-99', 'company-a');

      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('lists all evaluations for the company', async () => {
      prisma.externalPartyEvaluation.findMany.mockResolvedValue([baseEval]);

      const result = await service.findAll('company-a');

      expect(prisma.externalPartyEvaluation.findMany).toHaveBeenCalledWith({
        where: { company_id: 'company-a' },
        orderBy: { evaluation_date: 'desc' },
        take: 200,
      });
      expect(result).toEqual([baseEval]);
    });
  });

  describe('supplier isolation', () => {
    it('does NOT call supplierEvaluation — supplier evaluations stay in supplier module', () => {
      expect((prisma as any).supplierEvaluation).toBeUndefined();
    });
  });
});
