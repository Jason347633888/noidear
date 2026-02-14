import { Test, TestingModule } from '@nestjs/testing';
import { TaskCronService } from './task-cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('TaskCronService', () => {
  let service: TaskCronService;

  const mockPrisma: any = {
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService: any = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCronService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<TaskCronService>(TaskCronService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // Service instantiation
  // =========================================================================
  describe('Service instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have handleOverdueTasks method', () => {
      expect(typeof service.handleOverdueTasks).toBe('function');
    });
  });

  // =========================================================================
  // Overdue detection: finds tasks past deadline
  // =========================================================================
  describe('Overdue detection', () => {
    it('should query tasks with pending status and deadline before now', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['pending', 'submitted'] },
          deadline: { lt: expect.any(Date) },
          deletedAt: null,
        },
        include: {
          department: true,
        },
      });
    });

    it('should not update anything when no overdue tasks found', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      expect(mockPrisma.task.updateMany).not.toHaveBeenCalled();
      expect(mockNotificationService.createMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Status update: marks overdue tasks correctly
  // =========================================================================
  describe('Status update', () => {
    it('should mark all overdue tasks as overdue in a single batch', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
        {
          id: 'task-2',
          status: 'submitted',
          departmentId: 'dept-2',
          deadline: new Date('2025-06-01'),
          department: { id: 'dept-2', name: 'Dept B' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: { status: 'overdue' },
      });
    });

    it('should handle single overdue task correctly', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1'] } },
        data: { status: 'overdue' },
      });
    });
  });

  // =========================================================================
  // Notification: sends notifications to department members
  // =========================================================================
  describe('Notification sending', () => {
    it('should send notifications to department members for each overdue task', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Production' },
        },
      ];

      const deptMembers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findMany.mockResolvedValue(deptMembers);
      mockNotificationService.createMany.mockResolvedValue({});

      await service.handleOverdueTasks();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { departmentId: 'dept-1', status: 'active' },
        select: { id: true },
      });

      expect(mockNotificationService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            type: 'task',
            title: '任务逾期提醒',
            content: expect.stringContaining('1'),
          }),
          expect.objectContaining({
            userId: 'user-2',
            type: 'task',
            title: '任务逾期提醒',
          }),
          expect.objectContaining({
            userId: 'user-3',
            type: 'task',
            title: '任务逾期提醒',
          }),
        ]),
      );
    });

    it('should send notifications for multiple departments', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Production' },
        },
        {
          id: 'task-2',
          status: 'submitted',
          departmentId: 'dept-2',
          deadline: new Date('2025-06-01'),
          department: { id: 'dept-2', name: 'QA' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany
        .mockResolvedValueOnce([{ id: 'user-1' }])  // dept-1 members
        .mockResolvedValueOnce([{ id: 'user-2' }]); // dept-2 members
      mockNotificationService.createMany.mockResolvedValue({});

      await service.handleOverdueTasks();

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.createMany).toHaveBeenCalledTimes(2);
    });

    it('should skip notification when department has no active members', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Empty Dept' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.createMany).not.toHaveBeenCalled();
    });

    it('should deduplicate notifications per department', async () => {
      // Two tasks from the same department
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Production' },
        },
        {
          id: 'task-2',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-02-01'),
          department: { id: 'dept-1', name: 'Production' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockResolvedValue({});

      await service.handleOverdueTasks();

      // Status should be updated in a single batch
      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);

      // But department members should only be queried once per unique department
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);

      // And notifications should be sent once per unique department
      expect(mockNotificationService.createMany).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Error handling: graceful failure
  // =========================================================================
  describe('Error handling', () => {
    it('should not throw when database query fails', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database connection lost'));

      // Should not throw - cron jobs must be resilient
      await expect(service.handleOverdueTasks()).resolves.not.toThrow();
    });

    it('should log error when database query fails', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database connection lost'));

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.handleOverdueTasks();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle batch update failure gracefully', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
        {
          id: 'task-2',
          status: 'pending',
          departmentId: 'dept-2',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-2', name: 'Dept B' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockRejectedValue(new Error('Batch update failed'));

      // Should not throw - cron jobs must be resilient
      await expect(service.handleOverdueTasks()).resolves.not.toThrow();
    });

    it('should continue processing when notification fails', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockRejectedValue(new Error('Notification service down'));

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await expect(service.handleOverdueTasks()).resolves.not.toThrow();

      // Batch update should still have happened
      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);
      // Warning should be logged for notification failure
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should log warning when batch update fails', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockRejectedValue(new Error('Batch update failed'));

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.handleOverdueTasks();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle non-Error thrown from findOverdueTasks', async () => {
      mockPrisma.task.findMany.mockRejectedValue('string error');

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await expect(service.handleOverdueTasks()).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('string error'),
      );
    });

    it('should handle non-Error thrown from batch update', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockRejectedValue('raw string rejection');

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.handleOverdueTasks();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('raw string rejection'),
      );
    });

    it('should handle non-Error thrown from notification', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockRejectedValue(42);

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await expect(service.handleOverdueTasks()).resolves.not.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('42'),
      );
    });
  });

  // =========================================================================
  // HIGH-1: Batch update for overdue tasks
  // =========================================================================
  describe('HIGH-1: Batch update for overdue tasks', () => {
    it('should use updateMany instead of individual updates', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
        {
          id: 'task-2',
          status: 'submitted',
          departmentId: 'dept-2',
          deadline: new Date('2025-06-01'),
          department: { id: 'dept-2', name: 'Dept B' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      // Should use updateMany for batch operation
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-1', 'task-2'] } },
        data: { status: 'overdue' },
      });
      // Should NOT use individual updates
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('should batch update all task IDs in single query', async () => {
      const manyTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        status: 'pending',
        departmentId: `dept-${i % 5}`,
        deadline: new Date('2025-01-01'),
        department: { id: `dept-${i % 5}`, name: `Dept ${i % 5}` },
      }));

      mockPrisma.task.findMany.mockResolvedValue(manyTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 50 });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockResolvedValue({});

      await service.handleOverdueTasks();

      // Single batch call instead of 50 individual calls
      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.task.updateMany.mock.calls[0][0];
      expect(callArgs.where.id.in).toHaveLength(50);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('should handle large number of overdue tasks (batch processing)', async () => {
      const manyTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `task-${i}`,
        status: 'pending',
        departmentId: `dept-${i % 5}`,
        deadline: new Date('2025-01-01'),
        department: { id: `dept-${i % 5}`, name: `Dept ${i % 5}` },
      }));

      mockPrisma.task.findMany.mockResolvedValue(manyTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 50 });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockResolvedValue({});

      await expect(service.handleOverdueTasks()).resolves.not.toThrow();

      // All 50 tasks should be updated in a single batch
      expect(mockPrisma.task.updateMany).toHaveBeenCalledTimes(1);

      // Only 5 unique departments should be notified
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(5);
    });

    it('should exclude cancelled tasks from overdue check', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      const queryWhere = mockPrisma.task.findMany.mock.calls[0][0].where;
      // Status filter should only include pending and submitted
      expect(queryWhere.status.in).toEqual(['pending', 'submitted']);
      expect(queryWhere.status.in).not.toContain('cancelled');
      expect(queryWhere.status.in).not.toContain('approved');
      expect(queryWhere.status.in).not.toContain('rejected');
    });

    it('should exclude soft-deleted tasks from overdue check', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      const queryWhere = mockPrisma.task.findMany.mock.calls[0][0].where;
      expect(queryWhere.deletedAt).toBeNull();
    });

    it('should include department data when querying overdue tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.handleOverdueTasks();

      const queryInclude = mockPrisma.task.findMany.mock.calls[0][0].include;
      expect(queryInclude.department).toBe(true);
    });
  });

  // =========================================================================
  // Logging
  // =========================================================================
  describe('Logging', () => {
    it('should log the number of overdue tasks found', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
        {
          id: 'task-2',
          status: 'pending',
          departmentId: 'dept-1',
          deadline: new Date('2025-01-01'),
          department: { id: 'dept-1', name: 'Dept A' },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(overdueTasks);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findMany.mockResolvedValue([]);

      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await service.handleOverdueTasks();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('2'),
      );
    });

    it('should log when no overdue tasks found', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await service.handleOverdueTasks();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
