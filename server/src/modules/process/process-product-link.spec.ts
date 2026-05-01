import { applyProcessStepApproved } from './process-approval.callbacks';

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
