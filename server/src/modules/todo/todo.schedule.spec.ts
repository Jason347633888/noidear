import { Test, TestingModule } from '@nestjs/testing';
import { TodoScheduleService } from './todo.schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

describe('TodoScheduleService', () => {
  let service: TodoScheduleService;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  const mockPrisma = {
    todoTask: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoScheduleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<TodoScheduleService>(TodoScheduleService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  describe('sendOverdueTodoReminders', () => {
    it('should send overdue reminders for all pending overdue todos', async () => {
      const overdueTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          title: '完成培训',
          status: 'pending',
          dueDate: new Date('2026-01-01'),
          user: { id: 'user-1', name: 'User 1', username: 'user1' },
        },
        {
          id: 'todo-2',
          userId: 'user-2',
          title: '提交报告',
          status: 'pending',
          dueDate: new Date('2026-01-02'),
          user: { id: 'user-2', name: 'User 2', username: 'user2' },
        },
      ];

      mockPrisma.todoTask.findMany.mockResolvedValue(overdueTodos);
      mockNotificationService.create.mockResolvedValue({ id: 'notif-1' });

      await service.sendOverdueTodoReminders();

      expect(mockPrisma.todoTask.findMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          dueDate: { lt: expect.any(Date) },
        },
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      });

      expect(mockNotificationService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'todo_overdue',
        title: '待办任务逾期提醒',
        content: '您的待办任务"完成培训"已逾期，请尽快处理',
      });
    });

    it('should handle errors when sending individual reminders', async () => {
      const overdueTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          title: '完成培训',
          status: 'pending',
          dueDate: new Date('2026-01-01'),
          user: { id: 'user-1', name: 'User 1', username: 'user1' },
        },
      ];

      mockPrisma.todoTask.findMany.mockResolvedValue(overdueTodos);
      mockNotificationService.create.mockRejectedValue(
        new Error('Notification service error'),
      );

      await service.sendOverdueTodoReminders();

      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
    });

    it('should handle empty overdue todos list', async () => {
      mockPrisma.todoTask.findMany.mockResolvedValue([]);

      await service.sendOverdueTodoReminders();

      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching overdue todos', async () => {
      mockPrisma.todoTask.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await service.sendOverdueTodoReminders();

      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });
  });
});
