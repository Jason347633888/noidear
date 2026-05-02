import { NotFoundException } from '@nestjs/common';
import { CorrectiveActionService } from './corrective-action.service';

describe('CorrectiveActionService', () => {
  const prisma = {
    correctiveAction: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    nonConformance: {
      findFirst: jest.fn(),
    },
    customerComplaint: {
      findFirst: jest.fn(),
    },
    auditFinding: {
      findUnique: jest.fn(),
    },
  };
  let service: CorrectiveActionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CorrectiveActionService(prisma as any);
  });

  it('scopes CAPA numbering and writes by company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue({ id: 'nc-1' });
    prisma.correctiveAction.count.mockResolvedValue(1);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c1' });

    await service.create(
      { trigger_type: 'non_conformance', trigger_id: 'nc-1', description: '整改' },
      'u1',
      '2',
    );

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'nc-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.count).toHaveBeenCalledWith({ where: { company_id: '2' } });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: '2',
          capa_no: expect.stringMatching(/-0002$/),
          trigger_type: 'non_conformance',
          trigger_id: 'nc-1',
        }),
      }),
    );
  });

  it('rejects non-other CAPA creation when trigger_id is missing', async () => {
    await expect(
      service.create({ trigger_type: 'non_conformance', description: '整改' }, 'u1', '2'),
    ).rejects.toThrow('CAPA触发来源不能为空');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('rejects CAPA creation when NonConformance source is missing or outside company', async () => {
    prisma.nonConformance.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'non_conformance', trigger_id: 'missing-nc', description: '整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('不合格记录不存在或不属于当前公司');

    expect(prisma.nonConformance.findFirst).toHaveBeenCalledWith({
      where: { id: 'missing-nc', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('validates CustomerComplaint source within the current company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue({ id: 'cc-1' });
    prisma.correctiveAction.count.mockResolvedValue(2);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c2' });

    await service.create(
      { trigger_type: 'customer_complaint', trigger_id: 'cc-1', description: '投诉整改' },
      'u1',
      '2',
    );

    expect(prisma.customerComplaint.findFirst).toHaveBeenCalledWith({
      where: { id: 'cc-1', company_id: '2' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'customer_complaint',
          trigger_id: 'cc-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects CAPA creation when CustomerComplaint source is missing or outside company', async () => {
    prisma.customerComplaint.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'customer_complaint', trigger_id: 'missing-cc', description: '投诉整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('顾客投诉不存在或不属于当前公司');

    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('validates internal audit finding source existence', async () => {
    prisma.auditFinding.findUnique.mockResolvedValue({ id: 'finding-1' });
    prisma.correctiveAction.count.mockResolvedValue(3);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c3' });

    await service.create(
      { trigger_type: 'internal_audit', trigger_id: 'finding-1', description: '内审整改' },
      'u1',
      '2',
    );

    expect(prisma.auditFinding.findUnique).toHaveBeenCalledWith({
      where: { id: 'finding-1' },
      select: { id: true },
    });
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'internal_audit',
          trigger_id: 'finding-1',
          company_id: '2',
        }),
      }),
    );
  });

  it('rejects CAPA creation when internal audit finding source is missing', async () => {
    prisma.auditFinding.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { trigger_type: 'internal_audit', trigger_id: 'missing-finding', description: '内审整改' },
        'u1',
        '2',
      ),
    ).rejects.toThrow('内审发现项不存在');

    expect(prisma.correctiveAction.create).not.toHaveBeenCalled();
  });

  it('allows other CAPA creation without a trigger source', async () => {
    prisma.correctiveAction.count.mockResolvedValue(4);
    prisma.correctiveAction.create.mockResolvedValue({ id: 'c4' });

    await service.create({ trigger_type: 'other', description: '手工整改' }, 'u1', '2');

    expect(prisma.nonConformance.findFirst).not.toHaveBeenCalled();
    expect(prisma.customerComplaint.findFirst).not.toHaveBeenCalled();
    expect(prisma.auditFinding.findUnique).not.toHaveBeenCalled();
    expect(prisma.correctiveAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trigger_type: 'other',
          company_id: '2',
        }),
      }),
    );
  });

  it('filters CAPA list by status and trigger source', async () => {
    prisma.correctiveAction.findMany.mockResolvedValue([{ id: 'c1' }]);

    await service.findAll('2', {
      status: 'open',
      triggerType: 'non_conformance',
      triggerId: 'nc-1',
    });

    expect(prisma.correctiveAction.findMany).toHaveBeenCalledWith({
      where: {
        company_id: '2',
        status: 'open',
        trigger_type: 'non_conformance',
        trigger_id: 'nc-1',
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  });

  it('rejects reverse lookup when only one trigger filter is provided', async () => {
    await expect(
      service.findAll('2', { triggerType: 'non_conformance' }),
    ).rejects.toThrow('trigger_type 和 trigger_id 必须同时提供');

    expect(prisma.correctiveAction.findMany).not.toHaveBeenCalled();
  });

  it('requires company ownership before status update', async () => {
    prisma.correctiveAction.findFirst.mockResolvedValue(null);

    await expect(service.updateStatus('c1', 'closed', '2')).rejects.toThrow(NotFoundException);
    expect(prisma.correctiveAction.update).not.toHaveBeenCalled();
  });
});
