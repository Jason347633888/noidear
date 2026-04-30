import { ProductProcessChangeService } from './product-process-change.service';

describe('ProductProcessChangeService.applyApprovedChange', () => {
  function buildTx(overrides: any = {}) {
    return {
      productProcessChangePlan: {
        findUnique: jest.fn(),
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
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      processStep: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      changeEventExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
      },
      changeEventExecutionArtifact: {
        createMany: jest.fn(),
      },
      ...overrides,
    };
  }

  function buildPrisma() {
    return {
      productProcessChangePlan: {
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
  }

  function buildPlan(overrides: any = {}) {
    return {
      id: 'plan-1',
      company_id: '1',
      product_id: 'prod-1',
      changeEventId: 'change-1',
      status: 'pending_approval',
      scopes: ['recipe'],
      baseRecipeId: 'recipe-old',
      baseRecipeVersion: 1,
      payloadJson: {
        recipeLines: [
          {
            material_id: 'mat-1',
            qty_per_batch: 10,
            unit: 'kg',
            area_id: 'area-1',
            is_critical: false,
            notes: 'n',
          },
        ],
        versionNote: 'v2',
      },
      ...overrides,
    };
  }

  function primeHappyPath(tx: any, plan: any) {
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    tx.material.findMany.mockResolvedValue([{ id: 'mat-1' }]);
    tx.workshopArea.findMany.mockResolvedValue([{ id: 'area-1', name: 'A1' }]);
    tx.recipe.findFirst.mockResolvedValue({
      id: 'recipe-old',
      product_id: 'prod-1',
      company_id: '1',
      version: 1,
      status: 'active',
    });
    tx.recipe.create.mockResolvedValue({
      id: 'recipe-new',
      product_id: 'prod-1',
      company_id: '1',
      version: 2,
      status: 'active',
    });
  }

  let prisma: any;
  let changeEventService: any;

  beforeEach(() => {
    prisma = buildPrisma();
    changeEventService = {
      createDraftEvent: jest.fn(),
      submitForApproval: jest.fn(),
    };
  });

  it('creates a new active recipe and archives previous active recipe in one transaction', async () => {
    const tx = buildTx();
    const plan = buildPlan();
    primeHappyPath(tx, plan);

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await service.applyApprovedChange('change-1', 'approver-1', tx);

    expect(tx.recipe.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ product_id: 'prod-1', status: 'active' }),
        data: { status: 'archived' },
      }),
    );
    expect(tx.recipe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          product_id: 'prod-1',
          status: 'active',
          changeEventId: 'change-1',
        }),
      }),
    );
    expect(tx.changeEventExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changeEventId: 'change-1',
          status: 'executed',
        }),
      }),
    );
    expect(tx.productProcessChangePlan.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'executed' }),
      }),
    );
    // happy path must NOT touch the failure-recording path
    expect(prisma.productProcessChangePlan.update).not.toHaveBeenCalled();
  });

  it('marks plan execution_failed without partial official data when validation fails during apply', async () => {
    const tx = buildTx();
    const plan = buildPlan();
    primeHappyPath(tx, plan);
    // simulate failure during recipe.create
    tx.recipe.create.mockRejectedValueOnce(new Error('database fail'));

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await expect(service.applyApprovedChange('change-1', 'approver-1', tx)).rejects.toThrow('database fail');

    // failure record persisted OUTSIDE the doomed tx so it survives rollback
    expect(prisma.productProcessChangePlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'plan-1' },
        data: expect.objectContaining({
          status: 'execution_failed',
          executionError: expect.any(String),
        }),
      }),
    );
    // execution artifact and final 'executed' update must not have happened
    expect(tx.changeEventExecutionArtifact.createMany).not.toHaveBeenCalled();
    expect(tx.productProcessChangePlan.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'executed' }) }),
    );
  });

  it('refuses to re-apply an already executed plan', async () => {
    const tx = buildTx();
    const plan = buildPlan({ status: 'executed' });
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await expect(service.applyApprovedChange('change-1', 'approver-1', tx)).rejects.toThrow('产品工艺变更已执行');
    expect(tx.recipe.create).not.toHaveBeenCalled();
  });

  it('is a no-op when there is no plan for the change event', async () => {
    const tx = buildTx();
    tx.productProcessChangePlan.findUnique.mockResolvedValue(null);

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await service.applyApprovedChange('change-x', 'approver-1', tx);

    expect(tx.recipe.create).not.toHaveBeenCalled();
    expect(tx.changeEventExecution.create).not.toHaveBeenCalled();
  });
});
