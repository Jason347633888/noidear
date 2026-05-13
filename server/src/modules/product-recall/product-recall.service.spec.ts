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

  const notificationBridge: any = { notifyRequester: jest.fn() };
  const approvalEngine: any = { startApproval: jest.fn() };
  const service = new ProductRecallService(prisma, notificationBridge, approvalEngine);

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

    await expect(service.submit('recall-1', { id: 'user-1', companyId: 'company-1' })).rejects.toBeInstanceOf(BadRequestException);
    expect(approvalEngine.startApproval).not.toHaveBeenCalled();
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

    const result = await service.submit('recall-1', { id: 'user-1', companyId: 'company-1' });

    expect(approvalEngine.startApproval).toHaveBeenCalledWith(expect.objectContaining({
      resourceType: 'product_recall',
      resourceId: 'recall-1',
      triggerKey: 'submit',
      resourceStep: 'submit',
      createdById: 'user-1',
    }));
    expect(prisma.productRecall.update).toHaveBeenLastCalledWith({
      where: { id: 'recall-1' },
      data: { approvalInstanceId: 'inst-1' },
    });
    expect(result.approvalInstanceId).toBe('inst-1');
  });

  it('markApprovalApprovedFromCallback updates the recall and notifies the requester', async () => {
    prisma.productRecall.findUnique.mockResolvedValue({
      id: 'recall-1',
      status: 'pending_review',
      requested_by: 'user-1',
      title: '召回',
    });
    prisma.productRecall.update.mockResolvedValue({ id: 'recall-1', status: 'approved' });

    await service.markApprovalApprovedFromCallback('recall-1', 'approver-1', '风险可控');

    expect(prisma.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'recall-1' },
      data: expect.objectContaining({
        status: 'approved',
        reviewed_by: 'approver-1',
        review_note: '风险可控',
      }),
    }));
    expect(notificationBridge.notifyRequester).toHaveBeenCalledWith('user-1', 'approved', '召回');
  });

  it('markApprovalRejectedFromCallback transitions the recall to rejected and notifies', async () => {
    prisma.productRecall.findUnique.mockResolvedValue({
      id: 'recall-1',
      status: 'pending_review',
      requested_by: 'user-1',
      title: '召回',
    });
    prisma.productRecall.update.mockResolvedValue({ id: 'recall-1', status: 'rejected' });

    await service.markApprovalRejectedFromCallback('recall-1', 'approver-1', '证据不足');

    expect(prisma.productRecall.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'rejected',
        reviewed_by: 'approver-1',
        review_note: '证据不足',
      }),
    }));
    expect(notificationBridge.notifyRequester).toHaveBeenCalledWith('user-1', 'rejected', '召回');
  });

  it('callback paths reject illegal transitions from terminal states', async () => {
    prisma.productRecall.findUnique.mockResolvedValue({ id: 'recall-1', status: 'completed', requested_by: null });

    await expect(
      service.markApprovalApprovedFromCallback('recall-1', 'approver-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
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
});
