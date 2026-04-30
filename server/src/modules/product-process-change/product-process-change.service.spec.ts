import { ProductProcessChangeService } from './product-process-change.service';

describe('ProductProcessChangeService', () => {
  const prisma: any = {
    productProcessChangePlan: {
      findFirst: jest.fn(),
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
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
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
    prisma.productProcessChangePlan.findUnique.mockResolvedValue({
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
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });

    const service = createService();
    await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow('配方行用量不能为空');
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    expect(prisma.productProcessChangePlan.update).not.toHaveBeenCalled();
  });

  it('starts approval only after validation passes', async () => {
    prisma.productProcessChangePlan.findUnique.mockResolvedValue({
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
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    prisma.material.findMany.mockResolvedValue([{ id: 'mat-1' }]);
    prisma.workshopArea.findMany.mockResolvedValue([{ id: 'area-1' }]);
    prisma.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
    prisma.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-1', status: 'pending_approval' });

    const service = createService();
    await service.submitForApproval('plan-1', 'u1');

    expect(prisma.productProcessChangePlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'pending_approval' }),
      }),
    );
    expect(changeEventService.submitForApproval).toHaveBeenCalledWith('ce-1', 'u1', prisma);
    expect(approvalEngine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'change_event',
        triggerKey: 'approve_change',
      }),
    );
  });

  it('createDraft persists plan linked to a freshly created ChangeEvent', async () => {
    prisma.productProcessChangePlan.findFirst.mockResolvedValue(null);
    prisma.product.findFirst.mockResolvedValue({ id: 'prod-1', name: '黄油饼干', company_id: '1', deleted_at: null });
    changeEventService.createDraftEvent.mockResolvedValue({ id: 'ce-1', change_no: 'CE-2026-0001' });
    prisma.productProcessChangePlan.create.mockResolvedValue({ id: 'plan-new', changeEventId: 'ce-1' });

    const service = createService();
    const plan = await service.createDraft(
      { productId: 'prod-1', scopes: ['recipe'], payloadJson: { recipeLines: [] } },
      'u1',
    );

    expect(plan.id).toBe('plan-new');
    expect(changeEventService.createDraftEvent).toHaveBeenCalledWith(
      expect.objectContaining({ change_type: 'recipe' }),
      'u1',
      prisma,
    );
    expect(prisma.productProcessChangePlan.create).toHaveBeenCalledWith(
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
