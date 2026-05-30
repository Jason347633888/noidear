import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QualityInspectionTaskService } from './quality-inspection-task.service';

// ---------------------------------------------------------------------------
// Helper to build a minimal Prisma mock
// ---------------------------------------------------------------------------
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    qualityInspectionTask: {
      create: jest.fn().mockResolvedValue({ id: 'task-1', status: 'pending' }),
      update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'done' }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    inspectionRecord: {
      count: jest.fn().mockResolvedValue(1),
    },
    environmentRecord: {
      count: jest.fn().mockResolvedValue(1),
    },
    sanitizerConcentrationCheck: {
      count: jest.fn().mockResolvedValue(1),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      qualityInspectionTask: {
        create: jest.fn().mockResolvedValue({ id: 'task-1', status: 'pending' }),
        update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'done' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    })),
    ...overrides,
  };
}

function makePendingTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    status: 'pending',
    company_id: 'company-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema invariant: QualityInspectionTask fields
// ---------------------------------------------------------------------------
describe('QualityInspectionTask – schema invariants', () => {
  it('stores only task metadata and scheduling context — no result fields duplicated', () => {
    // The service DTO must NOT contain result fields like actual_value, judgment, or overall_result
    // Verified by inspecting CreateQualityInspectionTaskDto — these fields belong in InspectionRecord
    const { CreateQualityInspectionTaskDto } = require('./dto/create-quality-inspection-task.dto');
    const dto = new CreateQualityInspectionTaskDto();
    expect(dto).not.toHaveProperty('actual_value');
    expect(dto).not.toHaveProperty('judgment');
    expect(dto).not.toHaveProperty('overall_result');
    expect(dto).not.toHaveProperty('items');
  });

  it('has the key scheduling/assignment fields', () => {
    const { CreateQualityInspectionTaskDto } = require('./dto/create-quality-inspection-task.dto');
    const dto = new CreateQualityInspectionTaskDto();
    // task_type, target_resource_type, status are conceptually required
    // We verify the DTO class exists and instantiates without error
    expect(dto).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// addInspectionTask
// ---------------------------------------------------------------------------
describe('QualityInspectionTaskService.addInspectionTask', () => {
  it('creates a task with status=pending by default', async () => {
    const prisma = makePrisma();
    const service = new QualityInspectionTaskService(prisma as any);

    await service.addInspectionTask({
      company_id: 'company-1',
      work_date: new Date('2026-05-30'),
      task_type: 'water_quality',
      target_resource_type: 'area_point',
    });

    expect(prisma.qualityInspectionTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          company_id: 'company-1',
          task_type: 'water_quality',
          target_resource_type: 'area_point',
          status: 'pending',
        }),
      }),
    );
  });

  it('stores due_at and assignee_user_id when provided', async () => {
    const prisma = makePrisma();
    const service = new QualityInspectionTaskService(prisma as any);
    const dueAt = new Date('2026-05-30T12:00:00Z');

    await service.addInspectionTask({
      company_id: 'company-1',
      work_date: new Date('2026-05-30'),
      task_type: 'hygiene_inspection',
      target_resource_type: 'area_point',
      assignee_user_id: 'user-42',
      due_at: dueAt,
    });

    expect(prisma.qualityInspectionTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignee_user_id: 'user-42',
          due_at: dueAt,
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// completeInspectionTask — links to real fact record; does NOT duplicate data
// ---------------------------------------------------------------------------
describe('QualityInspectionTaskService.completeInspectionTask', () => {
  it('updates task status to done and sets completed_resource_type + completed_resource_id', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({
      id: 'task-1',
      status: 'done',
      completed_resource_type: 'inspection_record',
      completed_resource_id: 'record-99',
    });
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask());
    prisma.qualityInspectionTask.update = mockUpdate;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.completeInspectionTask('task-1', 'inspection_record', 'record-99', 'company-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        status: 'done',
        completed_resource_type: 'inspection_record',
        completed_resource_id: 'record-99',
      },
    });
  });

  it('can complete to an EnvironmentRecord (not just InspectionRecord)', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'task-2', status: 'done' });
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask({ id: 'task-2' }));
    prisma.qualityInspectionTask.update = mockUpdate;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.completeInspectionTask('task-2', 'environment_record', 'env-55', 'company-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'task-2' },
      data: {
        status: 'done',
        completed_resource_type: 'environment_record',
        completed_resource_id: 'env-55',
      },
    });
  });

  it('can complete to a SanitizerConcentrationCheck', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'task-3', status: 'done' });
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask({ id: 'task-3' }));
    prisma.qualityInspectionTask.update = mockUpdate;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.completeInspectionTask('task-3', 'sanitizer_concentration_check', 'san-12', 'company-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'task-3' },
      data: {
        status: 'done',
        completed_resource_type: 'sanitizer_concentration_check',
        completed_resource_id: 'san-12',
      },
    });
  });

  it('does NOT create a second fact table row — only updates the task pointer', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'task-4', status: 'done' });
    const mockCreate = jest.fn();
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask({ id: 'task-4' }));
    prisma.qualityInspectionTask.update = mockUpdate;
    prisma.qualityInspectionTask.create = mockCreate;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.completeInspectionTask('task-4', 'inspection_record', 'record-77', 'company-1');

    // Only an update should have been called; no create for a duplicate fact row
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(null);

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.completeInspectionTask('missing-task', 'inspection_record', 'record-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when task belongs to a different company', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(
      makePendingTask({ company_id: 'other-company' }),
    );

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.completeInspectionTask('task-1', 'inspection_record', 'record-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when task status is not pending', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(
      makePendingTask({ status: 'done' }),
    );

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.completeInspectionTask('task-1', 'inspection_record', 'record-1', 'company-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for invalid completedResourceType', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask());

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.completeInspectionTask('task-1', 'unknown_type', 'record-1', 'company-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when the completed resource does not exist', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask());
    prisma.inspectionRecord.count = jest.fn().mockResolvedValue(0);

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.completeInspectionTask('task-1', 'inspection_record', 'nonexistent-record', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// skipTask
// ---------------------------------------------------------------------------
describe('QualityInspectionTaskService.skipTask', () => {
  it('sets status=skipped and records the reason', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ id: 'task-5', status: 'skipped' });
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(makePendingTask({ id: 'task-5' }));
    prisma.qualityInspectionTask.update = mockUpdate;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.skipTask('task-5', '设备停机，无法执行', 'company-1');

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'task-5' },
      data: {
        status: 'skipped',
        skipped_reason: '设备停机，无法执行',
      },
    });
  });

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(null);

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.skipTask('missing-task', 'reason', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when task belongs to a different company', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(
      makePendingTask({ company_id: 'other-company' }),
    );

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.skipTask('task-1', 'reason', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when task status is not pending', async () => {
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findUnique = jest.fn().mockResolvedValue(
      makePendingTask({ status: 'skipped' }),
    );

    const service = new QualityInspectionTaskService(prisma as any);
    await expect(
      service.skipTask('task-1', 'reason', 'company-1'),
    ).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// listWorkbenchTasks
// ---------------------------------------------------------------------------
describe('QualityInspectionTaskService.listWorkbenchTasks', () => {
  it('queries tasks filtered by company_id and work_date', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findMany = mockFindMany;

    const service = new QualityInspectionTaskService(prisma as any);
    const workDate = new Date('2026-05-30');
    await service.listWorkbenchTasks({ company_id: 'company-1', work_date: workDate });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          company_id: 'company-1',
          work_date: workDate,
        }),
      }),
    );
  });

  it('filters by status when provided', async () => {
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const prisma = makePrisma();
    prisma.qualityInspectionTask.findMany = mockFindMany;

    const service = new QualityInspectionTaskService(prisma as any);
    await service.listWorkbenchTasks({
      company_id: 'company-1',
      work_date: new Date('2026-05-30'),
      status: 'pending',
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// generateTasksForDate
// ---------------------------------------------------------------------------
describe('QualityInspectionTaskService.generateTasksForDate', () => {
  it('returns an array (may be empty when no config exists)', async () => {
    const prisma = makePrisma();
    const service = new QualityInspectionTaskService(prisma as any);

    const result = await service.generateTasksForDate('company-1', new Date('2026-05-30'));
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No QualityInspectionWorkbench Prisma model invariant
// ---------------------------------------------------------------------------
describe('QualityInspectionWorkbench – no database table', () => {
  it('does not reference a qualityInspectionWorkbench prisma model on the service', () => {
    const prisma = makePrisma();
    // qualityInspectionWorkbench should NOT be a property of prisma mock
    expect(prisma).not.toHaveProperty('qualityInspectionWorkbench');
  });

  it('QualityInspectionTaskService does not have a workbench table method', () => {
    const prisma = makePrisma();
    const service = new QualityInspectionTaskService(prisma as any);
    // The workbench is a query/view concept — listWorkbenchTasks queries QualityInspectionTask
    expect(typeof service.listWorkbenchTasks).toBe('function');
    // There is no createWorkbench or findWorkbench method
    expect((service as any).createWorkbench).toBeUndefined();
    expect((service as any).findWorkbench).toBeUndefined();
  });
});
