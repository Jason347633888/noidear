import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcessStepService } from './process-step.service';

describe('ProcessStepService', () => {
  const prisma = {
    processStep: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  let service: ProcessStepService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcessStepService(prisma as any);
  });

  const baseDto = {
    step_no: 1,
    step_name: '配料',
    is_ccp: false,
  };

  const COMPANY_A = 'company-a';
  const COMPANY_B = 'company-b';

  it('rejects orphan process steps without product_id or recipe_id', async () => {
    await expect(service.create(baseDto as any, COMPANY_A)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('rejects blank product_id and recipe_id', async () => {
    await expect(service.create({ ...baseDto, product_id: ' ', recipe_id: '' } as any, COMPANY_A)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('allows product-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-1' });

    await service.create({ ...baseDto, product_id: 'prod-1' } as any, COMPANY_A);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ product_id: 'prod-1', company_id: COMPANY_A }),
      }),
    );
  });

  it('allows recipe-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-2' });

    await service.create({ ...baseDto, recipe_id: 'recipe-1' } as any, COMPANY_A);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recipe_id: 'recipe-1', company_id: COMPANY_A }),
      }),
    );
  });

  describe('tenant isolation', () => {
    it('findAll passes companyId to query', async () => {
      prisma.processStep.findMany.mockResolvedValue([]);
      await service.findAll(COMPANY_A);
      expect(prisma.processStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ company_id: COMPANY_A }) }),
      );
    });

    it('findByProduct passes companyId to query', async () => {
      prisma.processStep.findMany.mockResolvedValue([]);
      await service.findByProduct('prod-1', COMPANY_A);
      expect(prisma.processStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ company_id: COMPANY_A, product_id: 'prod-1' }) }),
      );
    });

    it('findOne passes companyId to query', async () => {
      prisma.processStep.findFirst.mockResolvedValue({ id: 'step-1' });
      await service.findOne('step-1', COMPANY_A);
      expect(prisma.processStep.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'step-1', company_id: COMPANY_A }) }),
      );
    });

    it('findOne returns NotFoundException when record belongs to different company', async () => {
      prisma.processStep.findFirst.mockResolvedValue(null);
      await expect(service.findOne('step-x', COMPANY_B)).rejects.toThrow(NotFoundException);
    });

    it('update uses scoped updateMany with companyId', async () => {
      prisma.processStep.updateMany.mockResolvedValue({ count: 1 });
      prisma.processStep.findFirst.mockResolvedValue({ id: 'step-1' });

      await service.update('step-1', { step_name: '新名称' }, COMPANY_A);

      expect(prisma.processStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'step-1', company_id: COMPANY_A }),
        }),
      );
    });

    it('update throws NotFoundException when step not found in company scope', async () => {
      prisma.processStep.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.update('step-x', { step_name: '新名称' }, COMPANY_B)).rejects.toThrow(NotFoundException);
    });

    it('remove uses scoped updateMany with companyId', async () => {
      prisma.processStep.updateMany.mockResolvedValue({ count: 1 });

      await service.remove('step-1', COMPANY_A);

      expect(prisma.processStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'step-1', company_id: COMPANY_A }),
        }),
      );
    });

    it('remove throws NotFoundException when step not found in company scope', async () => {
      prisma.processStep.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.remove('step-x', COMPANY_B)).rejects.toThrow(NotFoundException);
    });
  });
});
