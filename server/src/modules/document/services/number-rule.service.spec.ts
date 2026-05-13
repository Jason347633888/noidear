import { NumberRuleService } from './number-rule.service';

describe('NumberRuleService', () => {
  const department = { id: 'dept-pz', code: 'PZ' };

  function makeTx(overrides: Partial<any> = {}): any {
    return {
      pendingNumber: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({}),
      },
      department: {
        findUnique: jest.fn().mockResolvedValue(department),
      },
      documentNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
      ...overrides,
    };
  }

  function makePrisma(tx: any) {
    return { $transaction: jest.fn((cb: any) => cb(tx)) };
  }

  it('generates a number using DEFAULT_DOCUMENT_NUMBER_RULE format', async () => {
    const tx = makeTx({
      documentNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ sequence: 8 }),
      },
    });
    const service = new NumberRuleService(makePrisma(tx) as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
      fallbackCategoryCode: 'ZD',
    });

    expect(result).toBe('3-PZ-ZD-008');
    expect(tx.documentNumberCounter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doc_num_counter_uniq: expect.objectContaining({
            scope: 'document',
            level: 3,
            departmentId: 'dept-pz',
            categoryCode: 'ZD',
          }),
        }),
      }),
    );
  });

  it('reuses pending number when found and deletes it', async () => {
    const tx = makeTx({
      pendingNumber: {
        findFirst: jest.fn().mockResolvedValue({ id: 'pending-1', number: '3-PZ-ZD-003' }),
        delete: jest.fn().mockResolvedValue({}),
      },
    });
    const service = new NumberRuleService(makePrisma(tx) as any);

    const result = await service.generate({
      scope: 'document',
      level: 3,
      departmentId: 'dept-pz',
      sourceFolder: '03',
    });

    expect(result).toBe('3-PZ-ZD-003');
    expect(tx.pendingNumber.delete).toHaveBeenCalledWith({ where: { id: 'pending-1' } });
    expect(tx.documentNumberCounter.upsert).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when department is not found', async () => {
    const tx = makeTx({
      department: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new NumberRuleService(makePrisma(tx) as any);

    await expect(
      service.generate({ scope: 'document', level: 3, departmentId: 'nonexistent' }),
    ).rejects.toThrow('部门不存在');
  });

  it('omits categoryCode segment cleanly when fallbackCategoryCode is absent', async () => {
    const tx = makeTx({
      documentNumberCounter: {
        upsert: jest.fn().mockResolvedValue({ sequence: 1 }),
      },
    });
    const service = new NumberRuleService(makePrisma(tx) as any);

    const result = await service.generate({
      scope: 'document',
      level: 2,
      departmentId: 'dept-pz',
    });

    expect(result).not.toContain('--');
    expect(result).toMatch(/^2-PZ/);
  });
});
