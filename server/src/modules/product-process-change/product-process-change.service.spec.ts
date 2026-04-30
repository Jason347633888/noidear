import { ProductProcessChangeService } from './product-process-change.service';

describe('ProductProcessChangeService', () => {
  // `prisma` is the outer client used for non-transactional reads (e.g. the
  // `createDraft` precheck). `tx` is what the service should pass into
  // changeEventService inside `prisma.$transaction(cb => cb(tx))`. Keeping
  // them as distinct objects lets us assert that the service routes calls
  // through the transaction client rather than accidentally going back to
  // the outer prisma instance.
  const tx: any = {
    productProcessChangePlan: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    material: {
      findMany: jest.fn(),
    },
    workshopArea: {
      findMany: jest.fn(),
    },
    recipe: {
      findFirst: jest.fn(),
    },
    changeEvent: {
      findUnique: jest.fn(),
    },
  };

  const prisma: any = {
    productProcessChangePlan: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const changeEventService: any = {
    createDraftEvent: jest.fn(),
    submitForApproval: jest.fn(),
  };

  // approvalEngine is invoked transitively through changeEventService.submitForApproval.
  // We assert against a separately-tracked spy that the service hands to changeEventService.
  const approvalEngine = { startApproval: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    changeEventService.submitForApproval.mockImplementation(async (changeEventId: string, actorId: string) => {
      await approvalEngine.startApproval({
        resourceType: 'change_event',
        resourceStep: 'submit',
        triggerKey: 'approve_change',
        resourceId: changeEventId,
        createdById: actorId,
        title: `变更事件审批：${changeEventId}`,
      });
    });
  });

  function createService() {
    return new ProductProcessChangeService(prisma, changeEventService);
  }

  it('rejects a second unfinished plan for the same product', async () => {
    prisma.productProcessChangePlan.findFirst.mockResolvedValue({ id: 'plan-1' });

    const service = createService();
    await expect(
      service.createDraft({ productId: 'prod-1', scopes: ['recipe'], payloadJson: {} }, 'u1'),
    ).rejects.toThrow('该产品已有未完成的产品工艺变更');
  });

  it('rejects missing recipe line quantity before submit', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      product_id: 'prod-1',
      changeEventId: 'ce-1',
      status: 'draft',
      scopes: ['recipe'],
      payloadJson: {
        recipeLines: [
          {
            material_id: 'mat-1',
            // qty_per_batch missing
            unit: 'kg',
            area_id: 'area-1',
          },
        ],
      },
      changeEvent: { id: 'ce-1' },
    });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });

    const service = createService();
    await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow('配方行用量不能为空');
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    expect(tx.productProcessChangePlan.update).not.toHaveBeenCalled();
  });

  it('starts approval only after validation passes', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      product_id: 'prod-1',
      changeEventId: 'ce-1',
      status: 'draft',
      scopes: ['recipe'],
      payloadJson: {
        recipeLines: [
          {
            material_id: 'mat-1',
            qty_per_batch: 12,
            unit: 'kg',
            area_id: 'area-1',
          },
        ],
      },
      changeEvent: { id: 'ce-1' },
    });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    tx.material.findMany.mockResolvedValue([{ id: 'mat-1' }]);
    tx.workshopArea.findMany.mockResolvedValue([{ id: 'area-1' }]);
    tx.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
    tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-1', status: 'pending_approval' });

    const service = createService();
    await service.submitForApproval('plan-1', 'u1');

    expect(tx.productProcessChangePlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'pending_approval' }),
      }),
    );
    expect(changeEventService.submitForApproval).toHaveBeenCalledWith('ce-1', 'u1', tx);
    expect(approvalEngine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'change_event',
        triggerKey: 'approve_change',
      }),
    );
  });

  it('rejects empty ccpPoints when scope is haccp', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      product_id: 'prod-1',
      changeEventId: 'ce-1',
      status: 'draft',
      scopes: ['haccp'],
      payloadJson: { ccpPoints: [] },
      changeEvent: { id: 'ce-1' },
    });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });

    const service = createService();
    await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow('CCP 控制点不能为空');
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
  });

  it('createDraft persists plan linked to a freshly created ChangeEvent', async () => {
    prisma.productProcessChangePlan.findFirst.mockResolvedValue(null);
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: '黄油饼干', company_id: '1', deleted_at: null });
    changeEventService.createDraftEvent.mockResolvedValue({ id: 'ce-1', change_no: 'CE-2026-0001' });
    tx.productProcessChangePlan.create.mockResolvedValue({ id: 'plan-new', changeEventId: 'ce-1' });

    const service = createService();
    const plan = await service.createDraft(
      { productId: 'prod-1', scopes: ['recipe'], payloadJson: { recipeLines: [] } },
      'u1',
    );

    expect(plan.id).toBe('plan-new');
    expect(changeEventService.createDraftEvent).toHaveBeenCalledWith(
      expect.objectContaining({ change_type: 'recipe' }),
      'u1',
      tx,
    );
    expect(tx.productProcessChangePlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeEventId: 'ce-1',
          product_id: 'prod-1',
          status: 'draft',
        }),
      }),
    );
  });
});
