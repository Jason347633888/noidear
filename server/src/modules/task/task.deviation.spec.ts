import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { DeviationService } from '../deviation/deviation.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TaskService - Deviation Integration', () => {
  let service: TaskService;

  const mockPrisma: any = {
    task: { findUnique: jest.fn(), update: jest.fn() },
    taskRecord: { findFirst: jest.fn(), create: jest.fn() },
    template: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockDeviation: any = {
    detectDeviations: jest.fn(() => []),
    createDeviationReports: jest.fn(),
  };

  const mockNotificationService: any = {
    create: jest.fn(),
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DeviationService, useValue: mockDeviation },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);

    // Default: user is in dept-1 (passes department membership check)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      departmentId: 'dept-1',
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('should detect no deviation', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      templateId: 'tpl-1',
      departmentId: 'dept-1',
      status: 'pending',
    });
    mockPrisma.taskRecord.findFirst.mockResolvedValue(null);
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      version: 1.0,
      fieldsJson: [],
    });
    mockPrisma.taskRecord.create.mockResolvedValue({
      id: 'rec-1',
      hasDeviation: false,
      deviationCount: 0,
    });

    const result = await service.submit(
      { taskId: 'task-1', data: {} },
      'user-1',
    );

    expect(result.hasDeviation).toBe(false);
  });

  it('should create deviation report with reason', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      templateId: 'tpl-1',
      departmentId: 'dept-1',
      status: 'pending',
    });
    mockPrisma.taskRecord.findFirst.mockResolvedValue(null);
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      version: 1.5,
      fieldsJson: [
        {
          name: 'temp',
          type: 'number',
          tolerance: { type: 'range', min: 175, max: 185 },
        },
      ],
    });
    mockDeviation.detectDeviations.mockReturnValue([
      {
        fieldName: 'temp',
        expectedValue: '180',
        actualValue: '190',
        toleranceMin: 175,
        toleranceMax: 185,
        deviationAmount: 5,
      },
    ]);
    mockPrisma.taskRecord.create.mockResolvedValue({
      id: 'rec-1',
      hasDeviation: true,
      deviationCount: 1,
    });

    const result = await service.submit(
      {
        taskId: 'task-1',
        data: { temp: 190 },
        deviationReasons: { temp: '设备故障导致温度偏高' },
      },
      'user-1',
    );

    expect(result.hasDeviation).toBe(true);
    expect(mockDeviation.createDeviationReports).toHaveBeenCalled();
  });

  it('should lock template version', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 'task-1',
      templateId: 'tpl-1',
      departmentId: 'dept-1',
      status: 'pending',
    });
    mockPrisma.taskRecord.findFirst.mockResolvedValue(null);
    mockPrisma.template.findUnique.mockResolvedValue({
      id: 'tpl-1',
      version: 2.3,
      fieldsJson: [],
    });
    mockPrisma.taskRecord.create.mockResolvedValue({
      id: 'rec-1',
      relatedTemplateVersion: 2.3,
    });

    const result = await service.submit(
      { taskId: 'task-1', data: {} },
      'user-1',
    );

    expect(result.relatedTemplateVersion).toBe(2.3);
  });
});
