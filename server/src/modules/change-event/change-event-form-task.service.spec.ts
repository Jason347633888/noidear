import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getDefaultFormCodesForChangeType, getDefaultFormCodesForChangeScopes } from './change-event-default-form-rules';
import { ChangeEventFormTaskService } from './change-event-form-task.service';

describe('change event default form rules', () => {
  it('excludes product change application and product development review from generic changes', () => {
    const allCodes = [
      ...getDefaultFormCodesForChangeType('product'),
      ...getDefaultFormCodesForChangeType('recipe'),
      ...getDefaultFormCodesForChangeType('process'),
      ...getDefaultFormCodesForChangeType('document'),
      ...getDefaultFormCodesForChangeType('record_form'),
    ];

    expect(allCodes).not.toContain('GRSS-KF-JL-03');
    expect(allCodes).not.toContain('GRSS-KF-JL-01');
  });

  it('returns correct codes for recipe change type', () => {
    const codes = getDefaultFormCodesForChangeType('recipe');
    expect(codes).toEqual(['GRSS-KF-JL-07', 'GRSS-KF-JL-08']);
  });

  it('returns empty array for unknown change type', () => {
    const codes = getDefaultFormCodesForChangeType('unknown_type_xyz');
    expect(codes).toEqual([]);
  });

  it('returns empty array for document and record_form change types', () => {
    expect(getDefaultFormCodesForChangeType('document')).toEqual([]);
    expect(getDefaultFormCodesForChangeType('record_form')).toEqual([]);
  });

  it('merges and deduplicates default form codes across multiple scopes', () => {
    expect(getDefaultFormCodesForChangeScopes(['recipe', 'process', 'haccp'])).toEqual([
      'GRSS-KF-JL-07',
      'GRSS-KF-JL-08',
      'GRSS-PZ-JL-22',
    ]);
  });

  it('normalizes process aliases when merging scopes', () => {
    expect(
      getDefaultFormCodesForChangeScopes(['process_step', 'oven_temperature', 'fan_parameter', 'other_process_parameter']),
    ).toEqual(['GRSS-KF-JL-08', 'GRSS-PZ-JL-22']);
  });
});

describe('ChangeEventFormTaskService', () => {
  const prisma = {
    recordTemplate: { findMany: jest.fn() },
    changeEventFormTask: { createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    record: { create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)),
  };
  const recordService = { create: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('generateDefaultTasksForScopes creates one task per merged + dedupe form code', async () => {
    prisma.recordTemplate.findMany.mockResolvedValue([
      { id: 'tpl1', code: 'GRSS-KF-JL-07', name: '产品验证记录表' },
      { id: 'tpl2', code: 'GRSS-KF-JL-08', name: '工艺评审记录表' },
      { id: 'tpl3', code: 'GRSS-PZ-JL-22', name: 'HACCP 记录表' },
    ]);
    prisma.changeEventFormTask.createMany.mockResolvedValue({ count: 3 });
    prisma.changeEventFormTask.findMany.mockResolvedValue([
      { id: 't1', sourceFormCode: 'GRSS-KF-JL-07' },
      { id: 't2', sourceFormCode: 'GRSS-KF-JL-08' },
      { id: 't3', sourceFormCode: 'GRSS-PZ-JL-22' },
    ]);

    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);
    await service.generateDefaultTasksForScopes('change1', ['recipe', 'process', 'haccp']);

    const call = prisma.changeEventFormTask.createMany.mock.calls[0][0];
    const codes = call.data.map((d: any) => d.sourceFormCode);
    expect(codes).toEqual(['GRSS-KF-JL-07', 'GRSS-KF-JL-08', 'GRSS-PZ-JL-22']);
  });

  it('generates pending tasks from default form codes', async () => {
    prisma.recordTemplate.findMany.mockResolvedValue([
      { id: 'tpl1', code: 'GRSS-KF-JL-07', name: '产品验证记录表' },
    ]);
    prisma.changeEventFormTask.createMany.mockResolvedValue({ count: 1 });
    prisma.changeEventFormTask.findMany.mockResolvedValue([
      { id: 'task1', templateId: 'tpl1', sourceFormCode: 'GRSS-KF-JL-07', status: 'pending' },
    ]);

    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);
    const result = await service.generateDefaultTasks('change1', 'recipe');

    expect(prisma.changeEventFormTask.createMany).toHaveBeenCalledWith({
      data: [{
        changeEventId: 'change1',
        templateId: 'tpl1',
        sourceFormCode: 'GRSS-KF-JL-07',
        title: '产品验证记录表',
        status: 'pending',
        required: true,
        sortOrder: 0,
      }],
      skipDuplicates: true,
    });
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundException when task does not exist', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue(null);
    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);

    await expect(service.fillTask('missing-task', {}, 'user1')).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when task is already filled', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue({ id: 'task1', recordId: 'existing-record', status: 'filled', changeEventId: 'change1', templateId: 'tpl1' });
    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);

    await expect(service.fillTask('task1', {}, 'user1')).rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException when task status is not pending', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue({ id: 'task1', recordId: null, status: 'approved', changeEventId: 'change1', templateId: 'tpl1' });
    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);

    await expect(service.fillTask('task1', {}, 'user1')).rejects.toThrow(BadRequestException);
  });

  it('links existing record to task without creating a new one', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue({
      id: 'task1',
      recordId: null,
      status: 'pending',
      changeEventId: 'change1',
      templateId: 'tpl1',
    });
    prisma.record.findUnique.mockResolvedValue({
      id: 'existing-record-1',
      templateId: 'tpl1',
      changeEventId: 'change1',
      deletedAt: null,
    });
    prisma.changeEventFormTask.update.mockResolvedValue({
      id: 'task1',
      recordId: 'existing-record-1',
      status: 'filled',
    });

    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);
    await service.fillTask('task1', {}, 'user1', 'existing-record-1');

    expect(recordService.create).not.toHaveBeenCalled();
    expect(prisma.changeEventFormTask.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recordId: 'existing-record-1', status: 'filled' }),
    }));
  });

  it('throws NotFoundException when existingRecordId does not exist', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue({
      id: 'task1', recordId: null, status: 'pending', changeEventId: 'change1', templateId: 'tpl1',
    });
    prisma.record.findUnique.mockResolvedValue(null);
    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);

    await expect(service.fillTask('task1', {}, 'user1', 'bad-record')).rejects.toThrow(NotFoundException);
    expect(recordService.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when existingRecord templateId does not match task', async () => {
    prisma.changeEventFormTask.findUnique.mockResolvedValue({
      id: 'task1', recordId: null, status: 'pending', changeEventId: 'change1', templateId: 'tpl1',
    });
    prisma.record.findUnique.mockResolvedValue({
      id: 'record-wrong', templateId: 'tpl-other', changeEventId: 'change1', deletedAt: null,
    });
    const service = new ChangeEventFormTaskService(prisma as any, recordService as any);

    await expect(service.fillTask('task1', {}, 'user1', 'record-wrong')).rejects.toThrow(BadRequestException);
  });
});
