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
    cCPPoint: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    changeEvent: {
      findUnique: jest.fn(),
    },
    changeComplianceRecord: {
      findFirst: jest.fn(),
    },
    changeVerificationRecord: {
      findFirst: jest.fn(),
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

  const todoBridge: any = {
    createFailureTodo: jest.fn(),
    closeFailureTodo: jest.fn(),
  };

  function createService() {
    return new ProductProcessChangeService(prisma, changeEventService, todoBridge);
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
    // recipe scope requires a ChangeVerificationRecord
    tx.changeVerificationRecord.findFirst.mockResolvedValue({ id: 'cvr-1' });
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

  it('rejects reuse of soft-deleted ccp_no at validation time', async () => {
    tx.productProcessChangePlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      product_id: 'prod-1',
      company_id: '1',
      changeEventId: 'ce-1',
      status: 'draft',
      scopes: ['haccp'],
      payloadJson: {
        ccpPoints: [
          {
            step_no: 1,
            ccp_no: 'CCP-OLD',
            hazard_type: 'biological',
            control_measure: 'cook',
            critical_limit: '>=75C',
          },
        ],
      },
      changeEvent: { id: 'ce-1' },
    });
    tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
    tx.cCPPoint.findMany.mockResolvedValueOnce([{ ccp_no: 'CCP-OLD' }]);

    const service = createService();
    await expect(service.submitForApproval('plan-1', 'u1')).rejects.toThrow(
      'CCP 编号已被归档不可复用',
    );
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
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

  describe('retryFailed', () => {
    beforeEach(() => {
      todoBridge.closeFailureTodo.mockReset();
    });

    it('resets execution_failed plan to draft and closes the failure todo', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'execution_failed',
      });
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-1', status: 'draft' });

      const service = createService();
      await service.retryFailed('plan-1', 'user-2');

      expect(tx.productProcessChangePlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'draft', executionError: null, lockedAt: null },
      });
      expect(todoBridge.closeFailureTodo).toHaveBeenCalledWith('plan-1', 'user-2');
    });

    it('rejects retry when plan is not in execution_failed', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        status: 'executed',
      });
      const service = createService();
      await expect(service.retryFailed('plan-1', 'u1')).rejects.toThrow('仅失败状态的变更可重试');
      expect(todoBridge.closeFailureTodo).not.toHaveBeenCalled();
    });

    it('rejects retry when plan does not exist', async () => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
      tx.productProcessChangePlan.findUnique.mockResolvedValue(null);
      const service = createService();
      await expect(service.retryFailed('plan-x', 'u1')).rejects.toThrow('产品工艺变更不存在');
      expect(todoBridge.closeFailureTodo).not.toHaveBeenCalled();
    });
  });

  describe('compliance gates on submitForApproval', () => {
    function primeBasicPlan(scopes: string[]) {
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-gate',
        product_id: 'prod-gate',
        company_id: '1',
        changeEventId: 'ce-gate',
        status: 'draft',
        scopes,
        payloadJson: {},
        changeEvent: { id: 'ce-gate' },
      });
      tx.product.findFirst.mockResolvedValue({ id: 'prod-gate', company_id: '1', deleted_at: null });
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-gate', status: 'pending_approval' });
    }

    it('blocks submitForApproval when label scope has no ChangeComplianceRecord', async () => {
      primeBasicPlan(['label']);
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).rejects.toThrow(
        '标签/过敏原/法规合规审查记录不能为空',
      );
      expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    });

    it('blocks submitForApproval when allergen scope has no ChangeComplianceRecord', async () => {
      primeBasicPlan(['allergen']);
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).rejects.toThrow(
        '标签/过敏原/法规合规审查记录不能为空',
      );
      expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    });

    it('allows submitForApproval when label scope has a ChangeComplianceRecord', async () => {
      primeBasicPlan(['label']);
      tx.changeComplianceRecord.findFirst.mockResolvedValue({ id: 'ccr-1', change_event_id: 'ce-gate' });

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).resolves.toBeDefined();
      expect(approvalEngine.startApproval).toHaveBeenCalled();
    });

    it('blocks submitForApproval when recipe scope has no ChangeVerificationRecord', async () => {
      // Override plan with valid recipe payload so content validation passes
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-gate',
        product_id: 'prod-gate',
        company_id: '1',
        changeEventId: 'ce-gate',
        status: 'draft',
        scopes: ['recipe'],
        payloadJson: {
          recipeLines: [
            { material_id: 'mat-1', qty_per_batch: 5, unit: 'kg', area_id: 'area-1' },
          ],
          baseRecipeVersion: 1,
        },
        changeEvent: { id: 'ce-gate' },
      });
      tx.product.findFirst.mockResolvedValue({ id: 'prod-gate', company_id: '1', deleted_at: null });
      tx.material.findMany.mockResolvedValue([{ id: 'mat-1' }]);
      tx.workshopArea.findMany.mockResolvedValue([{ id: 'area-1' }]);
      tx.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);
      tx.changeVerificationRecord.findFirst.mockResolvedValue(null);
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-gate', status: 'pending_approval' });

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).rejects.toThrow(
        '配方/工艺/试产验证记录不能为空',
      );
      expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    });

    it('blocks submitForApproval when process scope has no ChangeVerificationRecord', async () => {
      // Override plan with valid process payload so content validation passes
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-gate',
        product_id: 'prod-gate',
        company_id: '1',
        changeEventId: 'ce-gate',
        status: 'draft',
        scopes: ['process'],
        payloadJson: {
          processSteps: [{ step_no: 1, step_name: 'mix', name: 'mix' }],
        },
        changeEvent: { id: 'ce-gate' },
      });
      tx.product.findFirst.mockResolvedValue({ id: 'prod-gate', company_id: '1', deleted_at: null });
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);
      tx.changeVerificationRecord.findFirst.mockResolvedValue(null);
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-gate', status: 'pending_approval' });

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).rejects.toThrow(
        '配方/工艺/试产验证记录不能为空',
      );
      expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    });

    it('allows submitForApproval when recipe scope has a ChangeVerificationRecord', async () => {
      primeBasicPlan(['recipe']);
      tx.changeVerificationRecord.findFirst.mockResolvedValue({
        id: 'cvr-1',
        change_event_id: 'ce-gate',
        verdict: 'pass',
      });
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);
      // Recipe validation: recipeLines is empty in payloadJson → validation fails before gate
      // Override plan payload to skip recipe-content validation
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-gate',
        product_id: 'prod-gate',
        company_id: '1',
        changeEventId: 'ce-gate',
        status: 'draft',
        scopes: ['recipe'],
        payloadJson: {
          recipeLines: [
            { material_id: 'mat-1', qty_per_batch: 5, unit: 'kg', area_id: 'area-1' },
          ],
          baseRecipeVersion: 1,
        },
        changeEvent: { id: 'ce-gate' },
      });
      tx.product.findFirst.mockResolvedValue({ id: 'prod-gate', company_id: '1', deleted_at: null });
      tx.material.findMany.mockResolvedValue([{ id: 'mat-1' }]);
      tx.workshopArea.findMany.mockResolvedValue([{ id: 'area-1' }]);
      tx.recipe.findFirst.mockResolvedValue({ id: 'recipe-1' });
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-gate', status: 'pending_approval' });

      const service = createService();
      await expect(service.submitForApproval('plan-gate', 'u1')).resolves.toBeDefined();
      expect(approvalEngine.startApproval).toHaveBeenCalled();
    });

    it('does not require compliance/verification records for scopes that have no label or process triggers', async () => {
      // 'haccp' scope alone does not trigger label OR recipe/process gates
      tx.productProcessChangePlan.findUnique.mockResolvedValue({
        id: 'plan-haccp',
        product_id: 'prod-1',
        company_id: '1',
        changeEventId: 'ce-haccp',
        status: 'draft',
        scopes: ['haccp'],
        payloadJson: {
          ccpPoints: [
            {
              step_no: 1,
              ccp_no: 'CCP-X1',
              hazard_type: 'biological',
              control_measure: 'cook',
              critical_limit: '>= 75C',
            },
          ],
        },
        changeEvent: { id: 'ce-haccp' },
      });
      tx.product.findFirst.mockResolvedValue({ id: 'prod-1', company_id: '1', deleted_at: null });
      tx.cCPPoint.findMany.mockResolvedValue([]);
      tx.changeComplianceRecord.findFirst.mockResolvedValue(null);
      tx.changeVerificationRecord.findFirst.mockResolvedValue(null);
      tx.productProcessChangePlan.update.mockResolvedValue({ id: 'plan-haccp', status: 'pending_approval' });

      const service = createService();
      await expect(service.submitForApproval('plan-haccp', 'u1')).resolves.toBeDefined();
      expect(approvalEngine.startApproval).toHaveBeenCalled();
    });
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
      { scopes: ['recipe'] },
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
