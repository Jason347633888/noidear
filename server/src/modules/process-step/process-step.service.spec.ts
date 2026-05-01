import { BadRequestException } from '@nestjs/common';
import { ProcessStepService } from './process-step.service';

describe('ProcessStepService', () => {
  const prisma = {
    processStep: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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

  it('rejects orphan process steps without product_id or recipe_id', async () => {
    await expect(service.create(baseDto as any)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('rejects blank product_id and recipe_id', async () => {
    await expect(service.create({ ...baseDto, product_id: ' ', recipe_id: '' } as any)).rejects.toThrow(BadRequestException);
    expect(prisma.processStep.create).not.toHaveBeenCalled();
  });

  it('allows product-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-1' });

    await service.create({ ...baseDto, product_id: 'prod-1' } as any);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ product_id: 'prod-1', recipe_id: undefined }),
      }),
    );
  });

  it('allows recipe-level process steps', async () => {
    prisma.processStep.create.mockResolvedValue({ id: 'step-2' });

    await service.create({ ...baseDto, recipe_id: 'recipe-1' } as any);

    expect(prisma.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ product_id: undefined, recipe_id: 'recipe-1' }),
      }),
    );
  });
});
