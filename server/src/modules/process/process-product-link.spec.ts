import { applyProcessStepApproved } from './process-approval.callbacks';

const SEVEN_STEPS = Array.from({ length: 7 }, (_, i) => ({ stepNumber: i + 1 }));

const createTxStep6 = (recipeLines: any[]) => ({
  processInstance: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'pi-1',
      productId: 'prod-1',
      template: { steps: SEVEN_STEPS },
    }),
    update: jest.fn().mockResolvedValue({}),
  },
  processStepData: {
    findUnique: jest.fn().mockResolvedValue({
      instanceId: 'pi-1',
      stepNumber: 6,
      status: 'SUBMITTED',
      data: { recipeLines },
    }),
    update: jest.fn().mockResolvedValue({}),
  },
  workshopArea: {
    findFirst: jest.fn().mockResolvedValue({ id: 'area-1', name: '配料间A' }),
  },
  recipe: {
    create: jest.fn().mockResolvedValue({ id: 'recipe-1' }),
  },
  recipeLine: {
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  product: { update: jest.fn().mockResolvedValue({}) },
});

describe('process step 6 recipe line area validation (callbacks)', () => {
  const callStep6 = (tx: any) =>
    applyProcessStepApproved({} as any, {
      tx,
      resourceId: 'pi-1',
      resourceStep: 'step:6',
      actorId: 'user-1',
    } as any);

  it('writes area_id and area_name_snapshot when areaId is present', async () => {
    const tx = createTxStep6([
      { materialId: 'mat-1', areaId: 'area-1', qtyPerBatch: '10', unit: 'kg' },
    ]);

    await callStep6(tx);

    expect(tx.workshopArea.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'area-1' }) }),
    );
    expect(tx.recipeLine.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ area_id: 'area-1', area_name_snapshot: '配料间A' }),
      ]),
    });
  });

  it('throws when areaId is missing from a recipe line', async () => {
    const tx = createTxStep6([{ materialId: 'mat-1', qtyPerBatch: '5', unit: 'kg' }]);

    await expect(callStep6(tx)).rejects.toThrow(/配料区域/);
  });

  it('throws when area does not exist or is inactive', async () => {
    const tx = createTxStep6([
      { materialId: 'mat-1', areaId: 'no-such-area', qtyPerBatch: '5', unit: 'kg' },
    ]);
    tx.workshopArea.findFirst.mockResolvedValue(null);

    await expect(callStep6(tx)).rejects.toThrow(/不存在或已停用/);
  });
});

describe('process product link approval callback', () => {
  const createTx = (stepData: any, instanceOverrides: any = {}) => ({
    processInstance: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'pi-1',
        productId: null,
        productName: '',
        template: { steps: [{ stepNumber: 1 }] },
        ...instanceOverrides,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    processStepData: {
      findUnique: jest.fn().mockResolvedValue({
        instanceId: 'pi-1',
        stepNumber: 1,
        status: 'SUBMITTED',
        data: stepData,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    product: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  });

  it('links an existing product without creating a duplicate product', async () => {
    const tx = createTx({ productId: 'prod-1', productName: '前端文本名' });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', name: '主数据产品名' });

    await applyProcessStepApproved({} as any, {
      tx,
      resourceId: 'pi-1',
      resourceStep: 'step:1',
      actorId: 'user-1',
    } as any);

    expect(tx.product.create).not.toHaveBeenCalled();
    expect(tx.processInstance.update).toHaveBeenCalledWith({
      where: { id: 'pi-1' },
      data: expect.objectContaining({
        productId: 'prod-1',
        productName: '主数据产品名',
      }),
    });
  });

  it('keeps the new-product path when no productId is supplied', async () => {
    const tx = createTx({ productName: '新产品A' });
    tx.product.create.mockResolvedValue({ id: 'created-prod-1' });

    await applyProcessStepApproved({} as any, {
      tx,
      resourceId: 'pi-1',
      resourceStep: 'step:1',
      actorId: 'user-1',
    } as any);

    expect(tx.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: '新产品A',
        status: 'draft',
      }),
    });
    expect(tx.processInstance.update).toHaveBeenCalledWith({
      where: { id: 'pi-1' },
      data: expect.objectContaining({
        productId: 'created-prod-1',
        productName: '新产品A',
      }),
    });
  });
});
