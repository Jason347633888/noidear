import { QualityNumberSequenceService } from './quality-number-sequence.service';

describe('QualityNumberSequenceService', () => {
  const tx = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    businessNumberSequence: {
      update: jest.fn(),
    },
    nonConformance: {
      findFirst: jest.fn(),
    },
    correctiveAction: {
      findFirst: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<string>) => callback(tx)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates the next nonconformance number from an existing locked sequence', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-1', current_value: 7 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-1', current_value: 8 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateNonConformanceNo('company-1', new Date('2026-05-02T00:00:00Z'))).resolves.toBe('NC-2026-0008');

    expect(tx.businessNumberSequence.update).toHaveBeenCalledWith({
      where: { id: 'seq-1' },
      data: { current_value: 8 },
    });
  });

  it('initializes a missing nonconformance sequence from the max existing current-year number', async () => {
    tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'seq-2', current_value: 14 }]);
    tx.nonConformance.findFirst.mockResolvedValue({ nc_no: 'NC-2026-0014' });
    tx.$executeRaw.mockResolvedValue(1);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-2', current_value: 15 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateNonConformanceNo('company-1', new Date('2026-08-01T00:00:00Z'))).resolves.toBe('NC-2026-0015');

    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it('uses an independent CAPA scope', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-capa', current_value: 2 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-capa', current_value: 3 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(service.generateCorrectiveActionNo('company-1', new Date('2026-05-02T00:00:00Z'))).resolves.toBe('CAPA-2026-0003');
  });

  it('can generate an NC number using an existing transaction client', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'seq-tx', current_value: 21 }]);
    tx.businessNumberSequence.update.mockResolvedValue({ id: 'seq-tx', current_value: 22 });
    const service = new QualityNumberSequenceService(prisma as any);

    await expect(
      service.generateNonConformanceNo('company-1', new Date('2026-05-02T00:00:00Z'), tx as any),
    ).resolves.toBe('NC-2026-0022');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
