import { NotFoundException } from '@nestjs/common';
import { CorrectiveActionService } from './corrective-action.service';

describe('CorrectiveActionService', () => {
  const prisma = {
    correctiveAction: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: CorrectiveActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CorrectiveActionService(prisma as any);
  });

  it('scopes CAPA numbering and writes by company', async () => {
    prisma.correctiveAction.count.mockResolvedValue(1);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c1' });

    await service.create({ trigger_type: 'non_conformance', description: '整改' }, 'u1', '2');

    expect(prisma.correctiveAction.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company_id: '2', capa_no: expect.stringMatching(/-0002$/) }) }),
    );
  });

  it('requires company ownership before status update', async () => {
    prisma.correctiveAction.findFirst.mockResolvedValue(null);

    await expect(service.updateStatus('c1', 'closed', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.correctiveAction.update).not.toHaveBeenCalled();
  });

  it('accepts product_recall as trigger_type', async () => {
    prisma.correctiveAction.count.mockResolvedValue(0);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c2' });

    await service.create(
      { trigger_type: 'product_recall', trigger_id: 'recall-1', description: '召回后纠正措施' },
      'u1',
      'company-1',
    );

    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trigger_type: 'product_recall' }),
      }),
    );
  });
});
