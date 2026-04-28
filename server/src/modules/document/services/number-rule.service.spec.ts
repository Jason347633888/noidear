import { NumberRuleService } from './number-rule.service';

describe('NumberRuleService', () => {
  const department = { id: 'dept-pz', code: 'PZ' };

  function createPrisma(rule?: any, pending?: any) {
    const tx: any = {
      pendingNumber: {
        findFirst: jest.fn().mockResolvedValue(pending ?? null),
        delete: jest.fn().mockResolvedValue({}),
      },
      department: {
        findUnique: jest.fn().mockResolvedValue(department),
      },
      $queryRaw: jest.fn().mockResolvedValue(rule ? [{ id: rule.id, sequence: rule.sequence, prefix: rule.prefix, category_code: rule.categoryCode, format: rule.format, sequence_padding: rule.sequencePadding, separator: rule.separator }] : []),
      numberRule: {
        create: jest.fn().mockResolvedValue({ id: 'rule-1', sequence: 0, prefix: null, categoryCode: null, format: null, sequencePadding: 3, separator: '-' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return {
      tx,
      prisma: {
        $transaction: jest.fn((callback) => callback(tx)),
        numberRule: {
          findMany: jest.fn().mockResolvedValue([]),
          upsert: jest.fn(),
          update: jest.fn(),
        },
      },
    };
  }

  it('uses configured format for document numbers', async () => {
    const { prisma } = createPrisma({
      id: 'rule-1',
      sequence: 7,
      prefix: 'GRSS',
      categoryCode: 'ZD',
      format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}',
      sequencePadding: 2,
      separator: '-',
    });
    const service = new NumberRuleService(prisma as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
      fallbackCategoryCode: 'ZD',
    });

    expect(result).toBe('GRSS-PZ-ZD-08');
  });

  it('keeps pending number reuse in the same scope', async () => {
    const { prisma, tx } = createPrisma(undefined, { id: 'pending-1', number: 'GRSS-PZ-ZD-03' });
    const service = new NumberRuleService(prisma as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
    });

    expect(result).toBe('GRSS-PZ-ZD-03');
    expect(tx.pendingNumber.delete).toHaveBeenCalledWith({ where: { id: 'pending-1' } });
  });

  it('throws when sequencePadding is out of range', () => {
    const service = new NumberRuleService({} as any);
    expect(() => service.formatNumber({
      level: 3, departmentCode: 'PZ', sequence: 1,
      prefix: 'GRSS', categoryCode: 'ZD',
      format: '{prefix}-{sequence}',
      sequencePadding: 0, separator: '-',
    })).toThrow('序号位数必须在 1 到 8 之间');
  });

  it('throws when department not found', async () => {
    const prisma: any = {
      $transaction: jest.fn((cb) => cb({
        pendingNumber: { findFirst: jest.fn().mockResolvedValue(null) },
        department: { findUnique: jest.fn().mockResolvedValue(null) },
        $queryRaw: jest.fn().mockResolvedValue([]),
      })),
    };
    const service = new NumberRuleService(prisma);
    await expect(service.generate({ scope: 'document', level: 3, departmentId: 'nonexistent' }))
      .rejects.toThrow('部门不存在');
  });

  it('deactivates a rule', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'rule-1', isActive: false });
    const prisma: any = { numberRule: { update } };
    const service = new NumberRuleService(prisma);
    await service.deactivate('rule-1');
    expect(update).toHaveBeenCalledWith({ where: { id: 'rule-1' }, data: { isActive: false } });
  });

  it('cleans up consecutive separators when prefix is empty', () => {
    const service = new NumberRuleService({} as any);
    const result = service.formatNumber({
      level: 3, departmentCode: 'PZ', sequence: 1,
      prefix: '',
      categoryCode: 'ZD',
      format: '{prefix}-{departmentCode}-{categoryCode}-{sequence}',
      sequencePadding: 3, separator: '-',
    });
    expect(result).not.toContain('--');
    expect(result).toBe('PZ-ZD-001');
  });
});
