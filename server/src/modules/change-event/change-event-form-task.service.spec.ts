import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getDefaultFormCodesForChangeType } from './change-event-default-form-rules';
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
});

describe('ChangeEventFormTaskService', () => {
  const prisma = {
    recordTemplate: { findMany: jest.fn() },
    changeEventFormTask: { createMany: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    record: { create: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (fn) => fn(prisma)),
  };
  const recordService = { create: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

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
});
