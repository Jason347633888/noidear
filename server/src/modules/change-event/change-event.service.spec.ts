import { ChangeEventService } from './change-event.service';

describe('ChangeEventService', () => {
  const prisma = {
    changeEvent: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    approvalInstance: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const approvalEngine = { startApproval: jest.fn(), act: jest.fn() };
  const formTasks = { generateDefaultTasks: jest.fn() };
  const relations = { validateRelations: jest.fn(), createRelations: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it('creates change event with relations and default form tasks', async () => {
    relations.validateRelations.mockResolvedValue(undefined);
    prisma.changeEvent.count.mockResolvedValue(0);
    prisma.changeEvent.create.mockResolvedValue({
      id: 'change1',
      change_no: 'CE-2026-0001',
      change_type: 'recipe',
    });
    prisma.changeEvent.findUnique.mockResolvedValue({
      id: 'change1',
      change_no: 'CE-2026-0001',
      change_type: 'recipe',
      verifications: [],
      relations: [],
      formTasks: [],
    });
    formTasks.generateDefaultTasks.mockResolvedValue([{ id: 'task1' }]);
    relations.createRelations.mockResolvedValue({ count: 1 });

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );

    const result = await service.create({
      change_type: 'recipe',
      title: '配方调整',
      description: '调整配方参数',
      relations: [{ targetType: 'recipe', targetId: 'recipe1', targetLabel: '蛋液配方' }],
    } as any, 'user1');

    expect(result.id).toBe('change1');
    expect(relations.validateRelations).toHaveBeenCalledWith([
      { targetType: 'recipe', targetId: 'recipe1', targetLabel: '蛋液配方' },
    ]);
    expect(relations.createRelations).toHaveBeenCalledWith('change1', [
      { targetType: 'recipe', targetId: 'recipe1', targetLabel: '蛋液配方' },
    ], prisma);
    expect(formTasks.generateDefaultTasks).toHaveBeenCalledWith('change1', 'recipe', prisma);
    expect(approvalEngine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'change_event',
        triggerKey: 'approve_change',
      }),
    );
  });

  it('submitForApproval reads via the provided tx client, not this.prisma', async () => {
    const tx = {
      changeEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: 'change1', change_no: 'CE-2026-0001' }),
      },
    };

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );

    await service.submitForApproval('change1', 'user1', tx as any);

    expect(tx.changeEvent.findUnique).toHaveBeenCalledWith({ where: { id: 'change1' } });
    expect(prisma.changeEvent.findUnique).not.toHaveBeenCalled();
    expect(approvalEngine.startApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'change_event',
        resourceId: 'change1',
        triggerKey: 'approve_change',
        tx,
      }),
    );
  });

  it('create() returns the freshly persisted change event (non-null)', async () => {
    relations.validateRelations.mockResolvedValue(undefined);
    prisma.changeEvent.count.mockResolvedValue(0);
    prisma.changeEvent.create.mockResolvedValue({
      id: 'change-happy',
      change_no: 'CE-2026-0002',
      change_type: 'process',
    });
    prisma.changeEvent.findUnique.mockResolvedValue({
      id: 'change-happy',
      change_no: 'CE-2026-0002',
      change_type: 'process',
      verifications: [],
      relations: [],
      formTasks: [],
    });
    formTasks.generateDefaultTasks.mockResolvedValue([]);
    relations.createRelations.mockResolvedValue({ count: 0 });

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );

    const result = await service.create(
      {
        change_type: 'process',
        title: '工艺调整',
        description: '调整工艺参数',
        relations: [],
      } as any,
      'user1',
    );

    expect(result.id).toBe('change-happy');
  });

  it('delegates approve to approval engine when approval instance exists', async () => {
    prisma.changeEvent.findUnique.mockResolvedValue({ id: 'ce-1', status: 'pending' });
    prisma.approvalInstance.findFirst.mockResolvedValue({ id: 'instance-1' });
    approvalEngine.act.mockResolvedValue(undefined);
    prisma.changeEvent.findUnique.mockResolvedValueOnce({ id: 'ce-1', status: 'pending' })
      .mockResolvedValueOnce({ id: 'ce-1', status: 'approved', verifications: [], relations: [], formTasks: [] });

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );

    await service.approve('ce-1', 'approver-1');

    expect(approvalEngine.act).toHaveBeenCalledWith('instance-1', 'approve', 'approver-1', '');
    expect(prisma.changeEvent.update).not.toHaveBeenCalled();
  });

  it('falls back to direct update and logs warning for legacy change event without approval instance', async () => {
    prisma.changeEvent.findUnique.mockResolvedValue({ id: 'ce-1', status: 'pending', verifications: [], relations: [], formTasks: [] });
    prisma.approvalInstance.findFirst.mockResolvedValue(null);
    prisma.changeEvent.update.mockResolvedValue({ id: 'ce-1', status: 'approved' });

    const service = new ChangeEventService(
      prisma as any,
      eventEmitter as any,
      formTasks as any,
      relations as any,
      approvalEngine as any,
    );
    const warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation();

    await service.approve('ce-1', 'approver-1');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Legacy ChangeEvent approval fallback'));
    expect(approvalEngine.act).not.toHaveBeenCalled();
  });
});
