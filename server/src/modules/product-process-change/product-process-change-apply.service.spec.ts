import { ProductProcessChangeService } from './product-process-change.service';

describe('ProductProcessChangeService.applyApprovedChange', () => {
  const todoBridge = {
    createFailureTodo: jest.fn(),
    closeFailureTodo: jest.fn(),
  };

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
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      ...overrides,
    };
  }

  function buildPrisma(tx?: any): any {
    return {
      productProcessChangePlan: {
        update: jest.fn(),
        // service now reads the plan via this.prisma (outside of any tx)
        findUnique: jest.fn(),
      },
      changeEventExecution: {
        upsert: jest.fn(),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ name: '酸奶' }),
      },
      // Service self-manages its tx by calling this.prisma.$transaction(cb).
      // We forward the caller-supplied tx mock into the callback so existing
      // assertions on `tx.<model>.<op>` keep working.
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(tx)),
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
      createdById: 'creator-1',
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

  function primeHappyPath(tx: any, plan: any, prismaInstance?: any) {
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    if (prismaInstance) {
      prismaInstance.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    }
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

  let changeEventService: any;

  beforeEach(() => {
    changeEventService = {
      createDraftEvent: jest.fn(),
      submitForApproval: jest.fn(),
    };
    todoBridge.createFailureTodo.mockReset();
    todoBridge.closeFailureTodo.mockReset();
  });

  it('creates a new active recipe and archives previous active recipe in one transaction', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    const plan = buildPlan();
    primeHappyPath(tx, plan, prisma);

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
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
    const prisma = buildPrisma(tx);
    const plan = buildPlan();
    primeHappyPath(tx, plan, prisma);
    // simulate failure during recipe.create
    tx.recipe.create.mockRejectedValueOnce(new Error('database fail'));

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
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
    // a failure todo must be written via the bridge so the submitter is notified
    expect(todoBridge.createFailureTodo).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({ id: 'plan-1' }),
        actorId: 'approver-1',
        errorMessage: expect.any(String),
        productName: expect.any(String),
      }),
    );
  });

  it('idempotent on already executed plan: silent no-op so retries can complete', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    const plan = buildPlan({ status: 'executed' });
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    prisma.productProcessChangePlan.findUnique.mockResolvedValue(plan);

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
    await expect(
      service.applyApprovedChange('change-1', 'approver-1', tx),
    ).resolves.toBeUndefined();
    expect(tx.recipe.create).not.toHaveBeenCalled();
    expect(tx.productProcessChangePlan.update).not.toHaveBeenCalled();
  });

  it('applies HACCP scope and creates CCPPoint with proper fields and artifact', async () => {
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
    tx.cCPPoint.findMany.mockResolvedValue([]);
    const prisma = buildPrisma(tx);
    prisma.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    tx.processStep.findFirst = jest
      .fn()
      .mockResolvedValueOnce(null) // first lookup (with changeEventId) misses
      .mockResolvedValueOnce({ id: 'step-existing', step_no: 2 });
    tx.cCPPoint.create.mockResolvedValue({
      id: 'ccp-id-1',
      ccp_no: 'CCP-1',
      process_step_id: 'step-existing',
      hazard_type: 'biological',
      control_measure: 'cook',
      critical_limit: '>= 75C',
    });

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
    await service.applyApprovedChange('change-1', 'approver-1', tx);

    expect(tx.cCPPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
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

  it('haccp scope: archives missing, updates matched, creates new ccp points', async () => {
    const tx = buildTx();
    const plan = buildPlan({
      scopes: ['haccp'],
      payloadJson: {
        ccpPoints: [
          {
            step_no: 1,
            ccp_no: 'A',
            hazard_type: 'biological',
            control_measure: 'new-control',
            critical_limit: 'new-limit',
          },
          {
            step_no: 1,
            ccp_no: 'D',
            hazard_type: 'physical',
            control_measure: 'd-control',
            critical_limit: 'd-limit',
          },
        ],
      },
    });
    tx.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    const prisma = buildPrisma(tx);
    prisma.productProcessChangePlan.findUnique.mockResolvedValue(plan);
    // validatePayload's archived-ccp guard fires first (deleted_at:{not:null}); then applyHaccpChange queries the active set.
    tx.cCPPoint.findMany
      .mockResolvedValueOnce([]) // archived guard: no archived rows reused
      .mockResolvedValueOnce([
      {
        id: 'ccp-A',
        ccp_no: 'A',
        process_step_id: 'step-1',
        hazard_type: 'biological',
        control_measure: 'old',
        critical_limit: 'old',
        cl_unit: null,
        process_step: { product_id: 'prod-1' },
      },
      {
        id: 'ccp-B',
        ccp_no: 'B',
        process_step_id: 'step-1',
        hazard_type: 'chemical',
        control_measure: 'b',
        critical_limit: 'b',
        cl_unit: null,
        process_step: { product_id: 'prod-1' },
      },
      {
        id: 'ccp-C',
        ccp_no: 'C',
        process_step_id: 'step-1',
        hazard_type: 'physical',
        control_measure: 'c',
        critical_limit: 'c',
        cl_unit: null,
        process_step: { product_id: 'prod-1' },
      },
    ]);
    tx.processStep.findFirst = jest.fn().mockResolvedValue({ id: 'step-1' });
    tx.cCPPoint.update.mockImplementation(({ where, data }: any) =>
      Promise.resolve({
        id: where.id,
        ccp_no: 'A',
        process_step_id: 'step-1',
        ...data,
      }),
    );
    tx.cCPPoint.create.mockResolvedValue({
      id: 'ccp-D',
      ccp_no: 'D',
      process_step_id: 'step-1',
    });

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
    await service.applyApprovedChange('change-1', 'approver-1', tx);

    expect(tx.cCPPoint.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: expect.arrayContaining(['ccp-B', 'ccp-C']) } },
        data: expect.objectContaining({ deleted_at: expect.any(Date) }),
      }),
    );
    expect(tx.cCPPoint.update).toHaveBeenCalledTimes(1);
    expect(tx.cCPPoint.create).toHaveBeenCalledTimes(1);

    const flat = tx.changeEventExecutionArtifact.createMany.mock.calls.flatMap(
      (c: any) => c[0].data,
    );
    const ccpArts = flat.filter((a: any) => a.resourceType === 'ccp_point');
    expect(ccpArts).toHaveLength(4);
    expect(ccpArts.filter((a: any) => a.action === 'archive')).toHaveLength(2);
    expect(ccpArts.filter((a: any) => a.action === 'update')).toHaveLength(1);
    expect(ccpArts.filter((a: any) => a.action === 'create')).toHaveLength(1);
  });

  it('records a failed changeEventExecution row on apply failure', async () => {
    const tx = buildTx();
    const prisma = buildPrisma(tx);
    const plan = buildPlan();
    primeHappyPath(tx, plan, prisma);
    tx.recipe.create.mockRejectedValueOnce(new Error('database fail'));

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
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
    const prisma = buildPrisma(tx);
    primeHappyPath(tx, plan, prisma);
    tx.processStep.create.mockResolvedValue({ id: 'step-new', step_no: 1, name: 'mix' });

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
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
    const prisma = buildPrisma(tx);
    tx.productProcessChangePlan.findUnique.mockResolvedValue(null);
    prisma.productProcessChangePlan.findUnique.mockResolvedValue(null);

    const service = new ProductProcessChangeService(prisma, changeEventService, todoBridge as any);
    await service.applyApprovedChange('change-x', 'approver-1', tx);

    expect(tx.recipe.create).not.toHaveBeenCalled();
    expect(tx.changeEventExecution.create).not.toHaveBeenCalled();
  });
});
