import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../src/modules/task/task.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { DeviationService } from '../src/modules/deviation/deviation.service';
import { NotificationService } from '../src/modules/notification/notification.service';
import { BusinessException, ErrorCode } from '../src/common/exceptions/business.exception';
import { BatchAssignTaskDto } from '../src/modules/task/dto/batch-assign-task.dto';

describe('TaskService', () => {
  let service: TaskService;
  let prismaService: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    template: {
      findUnique: jest.fn(),
    },
    department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    taskRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDeviationService = {
    detectDeviations: jest.fn(),
    createDeviationReports: jest.fn(),
  };

  const mockNotificationService = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeviationService, useValue: mockDeviationService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('batchAssign', () => {
    const userId = 'user-123';
    const dto: BatchAssignTaskDto = {
      templateId: 'template-1',
      departmentIds: ['dept-1', 'dept-2', 'dept-3'],
      deadline: '2026-12-31T23:59:59.000Z',
    };

    it('should throw error if template does not exist', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue(null);

      await expect(service.batchAssign(dto, userId)).rejects.toThrow(
        new BusinessException(ErrorCode.NOT_FOUND, '模板不存在或已被删除'),
      );
    });

    it('should throw error if template is not active', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'template-1',
        title: 'Test Template',
        status: 'inactive',
      });

      await expect(service.batchAssign(dto, userId)).rejects.toThrow(
        new BusinessException(
          ErrorCode.VALIDATION_ERROR,
          '模板 [Test Template] 已停用，不允许创建任务',
        ),
      );
    });

    it('should throw error if any department does not exist', async () => {
      mockPrismaService.template.findUnique.mockResolvedValue({
        id: 'template-1',
        title: 'Test Template',
        status: 'active',
      });
      mockPrismaService.department.findMany.mockResolvedValue([
        { id: 'dept-1', name: 'Dept 1' },
        { id: 'dept-2', name: 'Dept 2' },
        // dept-3 missing
      ]);

      await expect(service.batchAssign(dto, userId)).rejects.toThrow(
        new BusinessException(
          ErrorCode.NOT_FOUND,
          '以下部门不存在: dept-3',
        ),
      );
    });

    it('should create tasks for all departments and return summary', async () => {
      const template = {
        id: 'template-1',
        title: 'Test Template',
        status: 'active',
      };
      const departments = [
        { id: 'dept-1', name: 'Dept 1' },
        { id: 'dept-2', name: 'Dept 2' },
        { id: 'dept-3', name: 'Dept 3' },
      ];

      mockPrismaService.template.findUnique.mockResolvedValue(template);
      mockPrismaService.department.findMany.mockResolvedValue(departments);
      mockPrismaService.task.create.mockImplementation((args) =>
        Promise.resolve({
          id: `task-${args.data.departmentId}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })
      );
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);

      const result = await service.batchAssign(dto, userId);

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.tasks).toHaveLength(3);
      expect(result.tasks[0].departmentId).toBe('dept-1');
      expect(result.tasks[1].departmentId).toBe('dept-2');
      expect(result.tasks[2].departmentId).toBe('dept-3');
      expect(mockPrismaService.task.create).toHaveBeenCalledTimes(3);
      expect(mockNotificationService.createMany).toHaveBeenCalledTimes(3);
    });
  });

  describe('exportToExcel', () => {
    const userId = 'user-123';
    const role = 'admin';

    it('should export tasks to Excel buffer', async () => {
      const tasks = [
        {
          id: 'task-1',
          template: { title: 'Template 1' },
          department: { name: 'Dept 1' },
          deadline: new Date('2026-12-31'),
          status: 'pending',
          creator: { username: 'admin', name: '管理员' },
          createdAt: new Date('2026-01-01'),
        },
        {
          id: 'task-2',
          template: { title: 'Template 2' },
          department: { name: 'Dept 2' },
          deadline: new Date('2026-11-30'),
          status: 'completed',
          creator: { username: 'user1', name: '用户1' },
          createdAt: new Date('2026-01-02'),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
        departmentId: null,
      });
      mockPrismaService.task.findMany.mockResolvedValue(tasks);

      const buffer = await service.exportToExcel({}, userId, role);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter tasks by status when provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);

      await service.exportToExcel({ status: 'pending' }, userId, role);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: 'pending',
          }),
        })
      );
    });

    it('should filter tasks by department when provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'admin',
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);

      await service.exportToExcel({ departmentId: 'dept-1' }, userId, role);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            departmentId: 'dept-1',
          }),
        })
      );
    });

    it('should limit tasks to user department if role is user', async () => {
      const userRole = 'user';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'user',
        departmentId: 'dept-123',
      });
      mockPrismaService.task.findMany.mockResolvedValue([]);

      await service.exportToExcel({}, userId, userRole);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            departmentId: 'dept-123',
          }),
        })
      );
    });
  });
});
