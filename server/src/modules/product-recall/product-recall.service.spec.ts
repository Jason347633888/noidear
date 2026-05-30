import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductRecallService } from './product-recall.service';

describe('ProductRecallService', () => {
  const prisma: any = {
    productRecall: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    productRecallBatch: { create: jest.fn() },
    productRecallNotification: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    productionBatch: { findFirst: jest.fn() },
    externalParty: { findFirst: jest.fn() },
    customerComplaint: { findFirst: jest.fn() },
    traceabilitySnapshot: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };

  const approvalEngine: any = { startApproval: jest.fn() };
  const service = new ProductRecallService(prisma, approvalEngine);

  beforeEach(() => jest.clearAllMocks());

  it('creates recall draft with production batch snapshots', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.productionBatch.findFirst.mockResolvedValue({
      id: 'batch-1',
      batchNumber: 'PB-001',
      productName: '蛋糕',
      product: { company_id: 'company-1' },
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });

    await service.create(
      {
        title: '批次召回',
        reason: '客户投诉',
        batches: [{ production_batch_id: 'batch-1', affected_qty: 10, unit: '箱' }],
      },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.productRecall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        company_id: 'company-1',
        recall_no: 'RC-2026-0001',
        status: 'draft',
      }),
    }));
    expect(prisma.productRecallBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batch_number_snapshot: 'PB-001',
        product_name_snapshot: '蛋糕',
      }),
    }));
  });

  it('rejects batch that belongs to a different company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.productionBatch.findFirst.mockResolvedValue({
      id: 'batch-x',
      batchNumber: 'PB-999',
      productName: '外企产品',
      product: { company_id: 'company-other' },
    });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });

    await expect(
      service.create(
        {
          title: '跨企业召回',
          reason: '测试',
          batches: [{ production_batch_id: 'batch-x', affected_qty: 5, unit: '箱' }],
        },
        { id: 'user-1', companyId: 'company-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.productRecallBatch.create).not.toHaveBeenCalled();
  });

  it('rejects invalid state transition', async () => {
    prisma.productRecall.findFirst.mockResolvedValue({ id: 'recall-1', status: 'completed', title: '召回' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await expect(service.submit('recall-1', { id: 'user-1', companyId: 'company-1' })).rejects.toBeInstanceOf(BadRequestException);
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
    expect(prisma.productRecall.update).not.toHaveBeenCalled();
  });

  it('starts unified approval and writes approvalInstanceId on submit', async () => {
    prisma.productRecall.findFirst.mockResolvedValue({
      id: 'recall-1',
      status: 'draft',
      title: '批次召回',
      requested_by: 'user-1',
    });
    prisma.productRecall.update
      .mockResolvedValueOnce({ id: 'recall-1', status: 'pending_review' })
      .mockResolvedValueOnce({ id: 'recall-1', status: 'pending_review', approvalInstanceId: 'inst-1' });
    approvalEngine.startApproval.mockResolvedValue({ id: 'inst-1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    const result = await service.submit('recall-1', { id: 'user-1', companyId: 'company-1' });

    expect(approvalEngine.startApproval).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'product_recall',
      resourceId: 'recall-1',
      triggerKey: 'submit',
      resourceStep: 'submit',
      createdById: 'user-1',
      tx: prisma,
    }));
    expect(prisma.productRecall.update).toHaveBeenLastCalledWith({
      where: { id: 'recall-1' },
      data: { approvalInstanceId: 'inst-1' },
    });
    expect(result.approvalInstanceId).toBe('inst-1');
  });

  it('submit rolls back when startApproval fails so no half-submitted recall persists', async () => {
    prisma.productRecall.findFirst.mockResolvedValue({
      id: 'recall-1',
      status: 'draft',
      title: '批次召回',
      requested_by: 'user-1',
    });
    prisma.productRecall.update.mockResolvedValue({ id: 'recall-1', status: 'pending_review' });
    approvalEngine.startApproval.mockRejectedValue(new Error('approval definition missing'));

    const txRecorder: Array<{ op: string; data?: unknown }> = [];
    prisma.$transaction.mockImplementation(async (fn: any) => {
      try {
        return await fn({
          productRecall: {
            findFirst: (...args: any[]) => {
              txRecorder.push({ op: 'findFirst', data: args });
              return prisma.productRecall.findFirst(...args);
            },
            update: (...args: any[]) => {
              txRecorder.push({ op: 'update', data: args });
              return prisma.productRecall.update(...args);
            },
          },
        });
      } catch (err) {
        txRecorder.push({ op: 'rollback' });
        throw err;
      }
    });

    await expect(
      service.submit('recall-1', { id: 'user-1', companyId: 'company-1' }),
    ).rejects.toThrow('approval definition missing');

    expect(txRecorder.map((entry) => entry.op)).toEqual(['findFirst', 'update', 'rollback']);
    expect(approvalEngine.startApproval).toHaveBeenCalledTimes(1);
  });

  it('markApprovalApprovedFromCallback updates the recall via the provided tx without sending a duplicate notification', async () => {
    const tx: any = {
      productRecall: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'recall-1',
          status: 'pending_review',
          requested_by: 'user-1',
          title: '召回',
        }),
        update: jest.fn().mockResolvedValue({ id: 'recall-1', status: 'approved' }),
      },
    };

    await service.markApprovalApprovedFromCallback(tx, 'recall-1', 'approver-1', '风险可控');

    expect(tx.productRecall.findUnique).toHaveBeenCalledWith({ where: { id: 'recall-1' } });
    expect(tx.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'recall-1' },
      data: expect.objectContaining({
        status: 'approved',
        reviewed_by: 'approver-1',
        review_note: '风险可控',
      }),
    }));
    expect(prisma.productRecall.findUnique).not.toHaveBeenCalled();
    expect(prisma.productRecall.update).not.toHaveBeenCalled();
  });

  it('markApprovalRejectedFromCallback transitions the recall via tx without sending a duplicate notification', async () => {
    const tx: any = {
      productRecall: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'recall-1',
          status: 'pending_review',
          requested_by: 'user-1',
          title: '召回',
        }),
        update: jest.fn().mockResolvedValue({ id: 'recall-1', status: 'rejected' }),
      },
    };

    await service.markApprovalRejectedFromCallback(tx, 'recall-1', 'approver-1', '证据不足');

    expect(tx.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'rejected',
        reviewed_by: 'approver-1',
        review_note: '证据不足',
      }),
    }));
    expect(prisma.productRecall.findUnique).not.toHaveBeenCalled();
    expect(prisma.productRecall.update).not.toHaveBeenCalled();
  });

  it('callback paths reject illegal transitions from terminal states', async () => {
    const tx: any = {
      productRecall: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'recall-1', status: 'completed', requested_by: null }),
        update: jest.fn(),
      },
    };

    await expect(
      service.markApprovalApprovedFromCallback(tx, 'recall-1', 'approver-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.productRecall.update).not.toHaveBeenCalled();
  });

  it('marks notification sent and advances approved recall to notified', async () => {
    prisma.productRecallNotification.findFirst.mockResolvedValue({ id: 'n1', recall_id: 'recall-1', status: 'pending' });
    prisma.productRecall.findFirst.mockResolvedValue({ id: 'recall-1', status: 'approved' });
    prisma.productRecallNotification.update.mockResolvedValue({ id: 'n1', status: 'sent' });
    prisma.productRecall.update.mockResolvedValue({ id: 'recall-1', status: 'notified' });

    await service.markNotificationSent('recall-1', 'n1', { response_summary: '已通知' }, { id: 'user-1', companyId: 'company-1' });

    expect(prisma.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'notified' }),
    }));
  });

  it('throws when recall is missing', async () => {
    prisma.productRecall.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects notification with external_party_id belonging to a different company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });
    prisma.externalParty.findFirst.mockResolvedValue(null); // not found → cross-tenant
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await expect(
      service.create(
        {
          title: '跨企业通知召回',
          reason: '测试',
          notifications: [{
            external_party_id: 'party-other-company',
            customer_name: '客户X',
            notification_method: 'phone',
          }],
        },
        { id: 'user-1', companyId: 'company-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.productRecallNotification.create).not.toHaveBeenCalled();
  });

  it('allows notification with external_party_id belonging to the same company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });
    prisma.externalParty.findFirst.mockResolvedValue({ id: 'party-1', company_id: 'company-1' });
    prisma.productRecallNotification.create.mockResolvedValue({ id: 'n1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await service.create(
      {
        title: '正常通知召回',
        reason: '测试',
        notifications: [{
          external_party_id: 'party-1',
          customer_name: '客户A',
          notification_method: 'phone',
        }],
      },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.externalParty.findFirst).toHaveBeenCalledWith({
      where: { id: 'party-1', company_id: 'company-1' },
    });
    expect(prisma.productRecallNotification.create).toHaveBeenCalled();
  });

  it('rejects source_complaint_id belonging to a different company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.customerComplaint.findFirst.mockResolvedValue(null); // not found → cross-tenant
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await expect(
      service.create(
        {
          title: '跨企业投诉来源召回',
          reason: '测试',
          source_complaint_id: 'complaint-other-company',
        },
        { id: 'user-1', companyId: 'company-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.customerComplaint.findFirst).toHaveBeenCalledWith({
      where: { id: 'complaint-other-company', company_id: 'company-1' },
    });
    expect(prisma.productRecall.create).not.toHaveBeenCalled();
  });

  it('allows source_complaint_id belonging to the same company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.customerComplaint.findFirst.mockResolvedValue({ id: 'complaint-1', company_id: 'company-1' });
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await service.create(
      {
        title: '正常投诉来源召回',
        reason: '测试',
        source_complaint_id: 'complaint-1',
      },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.productRecall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source_complaint_id: 'complaint-1' }),
    }));
  });

  it('rejects source_traceability_snapshot_id belonging to a different company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.traceabilitySnapshot.findFirst.mockResolvedValue(null); // not found → cross-tenant
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await expect(
      service.create(
        {
          title: '跨企业快照来源召回',
          reason: '测试',
          source_traceability_snapshot_id: 'snapshot-other-company',
        },
        { id: 'user-1', companyId: 'company-1' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.traceabilitySnapshot.findFirst).toHaveBeenCalledWith({
      where: { id: 'snapshot-other-company', company_id: 'company-1' },
    });
    expect(prisma.productRecall.create).not.toHaveBeenCalled();
  });

  it('allows source_traceability_snapshot_id belonging to the same company', async () => {
    prisma.productRecall.count.mockResolvedValue(0);
    prisma.traceabilitySnapshot.findFirst.mockResolvedValue({ id: 'snapshot-1', company_id: 'company-1' });
    prisma.productRecall.create.mockResolvedValue({ id: 'recall-1', recall_no: 'RC-2026-0001' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

    await service.create(
      {
        title: '正常快照来源召回',
        reason: '测试',
        source_traceability_snapshot_id: 'snapshot-1',
      },
      { id: 'user-1', companyId: 'company-1' },
    );

    expect(prisma.productRecall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ source_traceability_snapshot_id: 'snapshot-1' }),
    }));
  });

  // Product recall direct approve/reject routes have been removed. The
  // notifyRequester side effect is handled by the unified approval callback
  // wiring described in the post-API-cleanup hardening plan (Task 4 / Task 8).

  // ── Phase 14 Task 4: Snapshot binding ─────────────────────────────────────

  describe('createRecallFromSnapshot', () => {
    it('creates a recall draft seeded from snapshot upstream production batch ids', async () => {
      const snapshot = {
        id: 'snap-1',
        company_id: 'company-1',
        rootObjectType: 'production_batch',
        rootObjectId: 'batch-1',
        snapshotData: {
          upstream: [],
          downstream: [],
          root: { id: 'batch-1', display: { batchNumber: 'PB-001', productName: '蛋糕' } },
        },
      };
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue(snapshot);
      prisma.productRecall.count.mockResolvedValue(0);
      prisma.productionBatch.findFirst.mockResolvedValue({
        id: 'batch-1',
        batchNumber: 'PB-001',
        productName: '蛋糕',
        product: { company_id: 'company-1' },
      });
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));
      prisma.productRecall.create.mockResolvedValue({
        id: 'recall-snap-1',
        recall_no: 'RC-2026-0001',
        source_traceability_snapshot_id: 'snap-1',
      });

      const result = await service.createRecallFromSnapshot(
        {
          traceabilitySnapshotId: 'snap-1',
          title: '快照召回',
          reason: '质量问题',
        },
        { id: 'user-1', companyId: 'company-1' },
      );

      expect(prisma.traceabilitySnapshot.findFirst).toHaveBeenCalledWith({
        where: { id: 'snap-1', company_id: 'company-1' },
      });
      expect(prisma.productRecall.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          source_traceability_snapshot_id: 'snap-1',
          status: 'draft',
        }),
      }));
      expect(result.source_traceability_snapshot_id).toBe('snap-1');
    });

    it('throws when snapshot does not belong to the company', async () => {
      prisma.traceabilitySnapshot.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (fn: any) => fn(prisma));

      await expect(
        service.createRecallFromSnapshot(
          { traceabilitySnapshotId: 'snap-other', title: '跨企业', reason: '测试' },
          { id: 'user-1', companyId: 'company-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.productRecall.create).not.toHaveBeenCalled();
    });
  });

  describe('refreshRecallPreview', () => {
    it('returns a fresh snapshot for the recall without modifying recall data', async () => {
      const recall = { id: 'recall-1', company_id: 'company-1', status: 'draft' };
      prisma.productRecall.findFirst.mockResolvedValue(recall);

      const traceService: any = {
        createTraceContextSnapshot: jest.fn().mockResolvedValue({
          id: 'snap-preview-1',
          snapshotPurpose: 'preview',
        }),
      };

      const svcWithTrace = new (service.constructor as any)(prisma, approvalEngine, traceService);

      const result = await svcWithTrace.refreshRecallPreview('recall-1', 'company-1');

      expect(traceService.createTraceContextSnapshot).toHaveBeenCalledWith(expect.objectContaining({
        rootObjectType: 'product_recall',
        rootObjectId: 'recall-1',
        company_id: 'company-1',
      }));
      expect(result.snapshotPurpose).toBe('preview');
      // recall record should NOT be updated
      expect(prisma.productRecall.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when recall does not exist', async () => {
      prisma.productRecall.findFirst.mockResolvedValue(null);

      await expect(service.refreshRecallPreview('missing', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('lockRecallScope', () => {
    it('creates an immutable snapshot and stores locked_snapshot_id on the recall', async () => {
      const recall = { id: 'recall-1', company_id: 'company-1', status: 'draft', locked_snapshot_id: null };
      prisma.productRecall.findFirst.mockResolvedValue(recall);
      prisma.productRecall.update.mockResolvedValue({ ...recall, locked_snapshot_id: 'snap-locked-1' });

      const traceService: any = {
        createTraceContextSnapshot: jest.fn().mockResolvedValue({
          id: 'snap-locked-1',
          snapshotPurpose: 'evidence_export',
        }),
      };

      const svcWithTrace = new (service.constructor as any)(prisma, approvalEngine, traceService);

      const result = await svcWithTrace.lockRecallScope('recall-1', 'company-1');

      expect(traceService.createTraceContextSnapshot).toHaveBeenCalledWith(expect.objectContaining({
        rootObjectType: 'product_recall',
        rootObjectId: 'recall-1',
        company_id: 'company-1',
      }));
      expect(prisma.productRecall.update).toHaveBeenCalledWith({
        where: { id: 'recall-1' },
        data: { locked_snapshot_id: 'snap-locked-1' },
      });
      expect(result.locked_snapshot_id).toBe('snap-locked-1');
    });

    it('throws when recall does not exist', async () => {
      prisma.productRecall.findFirst.mockResolvedValue(null);

      await expect(service.lockRecallScope('missing', 'company-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns early when scope is already locked without re-snapshotting', async () => {
      const recall = { id: 'recall-1', company_id: 'company-1', status: 'draft', locked_snapshot_id: 'already-snap' };
      prisma.productRecall.findFirst.mockResolvedValue(recall);

      const traceService: any = {
        createTraceContextSnapshot: jest.fn(),
      };

      const svcWithTrace = new (service.constructor as any)(prisma, approvalEngine, traceService);

      const result = await svcWithTrace.lockRecallScope('recall-1', 'company-1');

      expect(traceService.createTraceContextSnapshot).not.toHaveBeenCalled();
      expect(prisma.productRecall.update).not.toHaveBeenCalled();
      expect(result.locked_snapshot_id).toBe('already-snap');
    });
  });
});
