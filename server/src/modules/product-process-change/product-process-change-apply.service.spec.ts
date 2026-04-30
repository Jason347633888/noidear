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
      cCPPoint: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      ...overrides,
    };
  }

  function buildPrisma() {
    return {
      productProcessChangePlan: {
        update: jest.fn(),
      },
      changeEventExecution: {
        upsert: jest.fn(),
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

  it('applies HACCP scope and upserts CCPPoint with proper fields and artifact', async () => {
    const tx = buildTx();
    const plan = buildPlan({
      scopes: ['haccp'],
      payloadJson: {
        ccpPoints: [
          {
            step_no: 2,
            ccp_no: 'CCP-1',
            hazard_type: 'biological',
            control_measure: 'cook',
            critical_limit: '>= 75C',
            cl_min: 75,
            cl_unit: 'C',
          },
        ],
      },
    });
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    tx.processStep.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // first lookup (with changeEventId) misses
      .mockResolvedValueOnce({ id: 'step-existing', step_no: 2 });
    tx.cCPPoint.findUnique.mockResolvedValue(null);
    tx.cCPPoint.upsert.mockResolvedValue({
      id: 'ccp-id-1',
      ccp_no: 'CCP-1',
      process_step_id: 'step-existing',
    });

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await service.applyApprovedChange('change-1', 'approver-1', tx);

    expect(tx.cCPPoint.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { company_id_ccp_no: { company_id: '1', ccp_no: 'CCP-1' } },
        create: expect.objectContaining({
          company_id: '1',
          ccp_no: 'CCP-1',
          process_step_id: 'step-existing',
          hazard_type: 'biological',
          control_measure: 'cook',
          critical_limit: '>= 75C',
        }),
      }),
    );
    expect(tx.changeEventExecutionArtifact.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ resourceType: 'ccp_point', resourceId: 'ccp-id-1', action: 'create' }),
        ]),
      }),
    );
  });

  it('records a failed changeEventExecution row on apply failure', async () => {
    const tx = buildTx();
    const plan = buildPlan();
    primeHappyPath(tx, plan);
    tx.recipe.create.mockRejectedValueOnce(new Error('database fail'));

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await expect(service.applyApprovedChange('change-1', 'approver-1', tx)).rejects.toThrow('database fail');

    expect(prisma.changeEventExecution.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { changeEventId: 'change-1' },
        create: expect.objectContaining({
          changeEventId: 'change-1',
          status: 'failed',
          errorMessage: 'database fail',
        }),
        update: expect.objectContaining({ status: 'failed', errorMessage: 'database fail' }),
      }),
    );
  });

  it('links new process steps to the freshly created recipe when both scopes run', async () => {
    const tx = buildTx();
    const plan = buildPlan({
      scopes: ['recipe', 'process'],
      payloadJson: {
        recipeLines: [
          {
            material_id: 'mat-1',
            qty_per_batch: 10,
            unit: 'kg',
            area_id: 'area-1',
            is_critical: false,
          },
        ],
        processSteps: [{ step_no: 1, step_name: 'mix', name: 'mix' }],
        versionNote: 'v2',
      },
    });
    primeHappyPath(tx, plan);
    tx.processStep.create.mockResolvedValue({ id: 'step-new', step_no: 1, name: 'mix' });

    const service = new ProductProcessChangeService(prisma, changeEventService);
    await service.applyApprovedChange('change-1', 'approver-1', tx);

    expect(tx.processStep.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          step_no: 1,
          recipe_id: 'recipe-new',
          changeEventId: 'change-1',
        }),
      }),
    );
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
