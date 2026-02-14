import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviationService } from '../deviation/deviation.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessException, ErrorCode } from '../../common/exceptions/business.exception';

describe('TaskService', () => {
  let service: TaskService;

  const mockPrisma: any = {
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
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    taskRecord: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDeviationService: any = {
    detectDeviations: jest.fn().mockReturnValue([]),
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
        { provide: DeviationService, useValue: mockDeviationService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // BR-005: Inactive template should block task creation
  // =========================================================================
  describe('BR-005: Template Status Validation on Task Creation', () => {
    it('should reject task creation when template is inactive', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'inactive',
        title: 'Disabled Template',
        deletedAt: null,
      });

      await expect(
        service.create(
          { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject task creation when template is inactive with correct error code', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'inactive',
        title: 'Disabled Template',
        deletedAt: null,
      });

      try {
        await service.create(
          { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
          'user-1',
        );
        fail('Should have thrown BusinessException');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe(ErrorCode.VALIDATION_ERROR);
        expect((error as BusinessException).message).toContain('停用');
      }
    });

    it('should allow task creation when template is active', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'active',
        title: 'Active Template',
        deletedAt: null,
      });

      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      const result = await service.create(
        { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.templateId).toBe('tpl-1');
    });

    it('should reject task creation when template does not exist', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { templateId: 'nonexistent', departmentId: 'dept-1', deadline: '2026-12-31' },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject task creation when template is soft-deleted', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null); // deletedAt filter returns null

      await expect(
        service.create(
          { templateId: 'deleted-tpl', departmentId: 'dept-1', deadline: '2026-12-31' },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =========================================================================
  // Task CRUD Operations
  // =========================================================================
  describe('Task CRUD', () => {
    it('findOne() should throw when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(BusinessException);
    });

    it('cancel() should reject non-owner non-admin cancellation', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'pending',
      });

      await expect(
        service.cancel('task-1', 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('cancel() should allow admin to cancel any task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'pending',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'cancelled',
      });

      const result = await service.cancel('task-1', 'admin-user', 'admin');

      expect(result.status).toBe('cancelled');
    });

    it('cancel() should allow creator to cancel own task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'pending',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'cancelled',
      });

      const result = await service.cancel('task-1', 'user-1', 'user');

      expect(result.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('findAll() should filter by department for non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, limit: 20 },
        'user-1',
        'user',
      );

      expect(result.list).toEqual([]);
    });

    it('findAll() should return correct pagination structure', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 3, limit: 5 },
        'admin-1',
        'admin',
      );

      expect(result.page).toBe(3);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(0);
    });

    it('findAll() with status filter should pass status to query', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, status: 'pending' },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('findAll() with departmentId filter for admin should pass it to query', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await service.findAll(
        { page: 1, limit: 20, departmentId: 'dept-2' },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ departmentId: 'dept-2' }),
        }),
      );
    });

    it('findOne() should return task when found', async () => {
      const mockTask = { id: 'task-1', status: 'pending', deletedAt: null };
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.findOne('task-1');
      expect(result.id).toBe('task-1');
    });
  });

  // =========================================================================
  // NEW-001: findAll pagination upper limit
  // =========================================================================
  describe('NEW-001: findAll pagination cap', () => {
    it('should cap limit at 100 when limit=200 is requested', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, limit: 200 },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
      expect(result.limit).toBe(100);
    });

    it('should keep limit at 50 when limit=50 is requested', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, limit: 50 },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
      expect(result.limit).toBe(50);
    });

    it('should cap at 100 when limit=999 is requested', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1, limit: 999 },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
      expect(result.limit).toBe(100);
    });

    it('should default to 20 when no limit provided', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: 1 },
        'admin-1',
        'admin',
      );

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
      expect(result.limit).toBe(20);
    });
  });

  // =========================================================================
  // Submit Task (transaction-based)
  // =========================================================================
  describe('Submit Task', () => {
    it('should submit task successfully with no deviations', async () => {
      const mockRecord = {
        id: 'record-1',
        taskId: 'task-1',
        templateId: 'tpl-1',
        status: 'submitted',
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1', departmentId: 'dept-1', status: 'pending', deletedAt: null })
              .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
            update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'submitted' }),
          },
          template: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'tpl-1',
              fieldsJson: [{ name: 'temp', type: 'number' }],
              version: 1.0,
              deletedAt: null,
            }),
          },
          taskRecord: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockRecord),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'user-1',
              departmentId: 'dept-1',
            }),
          },
        };
        return cb(tx);
      });

      mockDeviationService.detectDeviations.mockReturnValue([]);

      const result = await service.submit(
        { taskId: 'task-1', data: { temp: 180 } },
        'user-1',
      );

      expect(result.status).toBe('submitted');
    });

    it('should reject submit when task not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          taskRecord: { findFirst: jest.fn() },
        };
        return cb(tx);
      });

      await expect(
        service.submit({ taskId: 'nonexistent', data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when task status is not pending', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'task-1',
              status: 'submitted',
              deletedAt: null,
            }),
          },
          taskRecord: { findFirst: jest.fn() },
        };
        return cb(tx);
      });

      await expect(
        service.submit({ taskId: 'task-1', data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when record already exists', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'task-1',
              status: 'pending',
              deletedAt: null,
            }),
          },
          taskRecord: {
            findFirst: jest.fn().mockResolvedValue({ id: 'existing-record' }),
          },
        };
        return cb(tx);
      });

      await expect(
        service.submit({ taskId: 'task-1', data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when template not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'task-1',
              templateId: 'tpl-deleted',
              status: 'pending',
              deletedAt: null,
            }),
          },
          template: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          taskRecord: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        };
        return cb(tx);
      });

      await expect(
        service.submit({ taskId: 'task-1', data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =========================================================================
  // Approve Task
  // =========================================================================
  describe('Approve Task', () => {
    it('should reject approval when record not found', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.approve({ recordId: 'nonexistent', status: 'approved' }, 'admin-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject approval when record already approved', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'approved',
      });

      await expect(
        service.approve({ recordId: 'record-1', status: 'approved' }, 'admin-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject approval when approver not found', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.approve({ recordId: 'record-1', status: 'approved' }, 'unknown-user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should allow admin to approve', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: 'admin', departmentId: 'dept-1' }) // approver
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'other', departmentId: 'dept-1' }); // submitter
      mockPrisma.taskRecord.update.mockResolvedValue({ id: 'record-1', status: 'approved' });

      const result = await service.approve(
        { recordId: 'record-1', status: 'approved' },
        'admin-1',
      );

      expect(result.success).toBe(true);
    });

    it('should allow superior to approve', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'sup-1', role: 'user', departmentId: 'dept-1' }) // approver
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'sup-1', departmentId: 'dept-1' }); // submitter
      mockPrisma.taskRecord.update.mockResolvedValue({ id: 'record-1', status: 'approved' });

      const result = await service.approve(
        { recordId: 'record-1', status: 'approved' },
        'sup-1',
      );

      expect(result.success).toBe(true);
    });

    it('should allow same-department leader to approve', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'leader-1', role: 'leader', departmentId: 'dept-1' }) // approver
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'other', departmentId: 'dept-1' }); // submitter
      mockPrisma.taskRecord.update.mockResolvedValue({ id: 'record-1', status: 'approved' });

      const result = await service.approve(
        { recordId: 'record-1', status: 'approved' },
        'leader-1',
      );

      expect(result.success).toBe(true);
    });

    it('should reject non-authorized user from approving', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'random-user', role: 'user', departmentId: 'dept-2' }) // approver (different dept)
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'other', departmentId: 'dept-1' }); // submitter

      await expect(
        service.approve({ recordId: 'record-1', status: 'approved' }, 'random-user'),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =========================================================================
  // SEC-001: Pending Approvals with Role-Based Filtering
  // =========================================================================
  describe('SEC-001: findPendingApprovals role-based filtering', () => {
    it('should return ALL submitted records for admin role', async () => {
      const allRecords = [
        { id: 'record-1', status: 'submitted', submitterId: 'user-1' },
        { id: 'record-2', status: 'submitted', submitterId: 'user-2' },
        { id: 'record-3', status: 'submitted', submitterId: 'user-3' },
      ];
      mockPrisma.taskRecord.findMany.mockResolvedValue(allRecords);
      mockPrisma.taskRecord.count.mockResolvedValue(3);

      const result = await service.findPendingApprovals('admin-1', 'admin');

      expect(result.list).toHaveLength(3);
      // Admin should not have submitterId filter in query
      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'submitted',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return only same-department records for leader role', async () => {
      // Leader belongs to dept-1
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'leader-1',
        role: 'leader',
        departmentId: 'dept-1',
      });

      const deptRecords = [
        { id: 'record-1', status: 'submitted', submitterId: 'user-1' },
      ];
      mockPrisma.taskRecord.findMany.mockResolvedValue(deptRecords);
      mockPrisma.taskRecord.count.mockResolvedValue(1);

      const result = await service.findPendingApprovals('leader-1', 'leader');

      expect(result.list).toHaveLength(1);
      // Leader query must include submitter department filter
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'leader-1' } }),
      );
      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'submitted',
            deletedAt: null,
            submitter: {
              departmentId: 'dept-1',
            },
          }),
        }),
      );
    });

    it('should return only subordinate records for user role', async () => {
      // Regular user with subordinates
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'sup-1',
        role: 'user',
        departmentId: 'dept-1',
        subordinates: [
          { id: 'sub-1' },
          { id: 'sub-2' },
        ],
      });

      const subRecords = [
        { id: 'record-1', status: 'submitted', submitterId: 'sub-1' },
      ];
      mockPrisma.taskRecord.findMany.mockResolvedValue(subRecords);
      mockPrisma.taskRecord.count.mockResolvedValue(1);

      const result = await service.findPendingApprovals('sup-1', 'user');

      expect(result.list).toHaveLength(1);
      // User query must filter by subordinate IDs
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sup-1' },
          include: { subordinates: { select: { id: true } } },
        }),
      );
      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'submitted',
            deletedAt: null,
            submitterId: { in: ['sub-1', 'sub-2'] },
          }),
        }),
      );
    });

    it('should return empty result for user with no subordinates', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'lonely-user',
        role: 'user',
        departmentId: 'dept-1',
        subordinates: [],
      });

      // Should not even call findMany when there are no subordinates
      const result = await service.findPendingApprovals('lonely-user', 'user');

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty result when user not found in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findPendingApprovals('ghost-user', 'user');

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should order results by submittedAt descending', async () => {
      mockPrisma.taskRecord.findMany.mockResolvedValue([]);
      mockPrisma.taskRecord.count.mockResolvedValue(0);

      await service.findPendingApprovals('admin-1', 'admin');

      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { submittedAt: 'desc' },
        }),
      );
    });

    it('should return empty result for leader with null departmentId', async () => {
      // Leader exists but has no department assigned
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'leader-no-dept',
        role: 'leader',
        departmentId: null,
      });

      const result = await service.findPendingApprovals('leader-no-dept', 'leader');

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
      // Should NOT call findMany - null departmentId would leak records
      expect(mockPrisma.taskRecord.findMany).not.toHaveBeenCalled();
    });

    it('should return empty result when leader not found in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findPendingApprovals('ghost-leader', 'leader');

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockPrisma.taskRecord.findMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // HIGH-2: Pagination for findPendingApprovals
  // =========================================================================
  describe('findPendingApprovals pagination', () => {
    it('should apply default pagination (page=1, limit=20) for admin', async () => {
      mockPrisma.taskRecord.findMany.mockResolvedValue([]);
      mockPrisma.taskRecord.count.mockResolvedValue(0);

      const result = await service.findPendingApprovals('admin-1', 'admin');

      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
    });

    it('should apply custom pagination (page=2, limit=10) for admin', async () => {
      mockPrisma.taskRecord.findMany.mockResolvedValue([]);
      mockPrisma.taskRecord.count.mockResolvedValue(25);

      const result = await service.findPendingApprovals('admin-1', 'admin', 2, 10);

      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toHaveProperty('page', 2);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('total', 25);
    });

    it('should apply pagination for leader role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'leader-1',
        role: 'leader',
        departmentId: 'dept-1',
      });
      mockPrisma.taskRecord.findMany.mockResolvedValue([]);
      mockPrisma.taskRecord.count.mockResolvedValue(0);

      const result = await service.findPendingApprovals('leader-1', 'leader', 1, 5);

      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 5,
        }),
      );
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 5);
    });

    it('should apply pagination for user role with subordinates', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'sup-1',
        role: 'user',
        departmentId: 'dept-1',
        subordinates: [{ id: 'sub-1' }],
      });
      mockPrisma.taskRecord.findMany.mockResolvedValue([]);
      mockPrisma.taskRecord.count.mockResolvedValue(0);

      const result = await service.findPendingApprovals('sup-1', 'user', 1, 10);

      expect(mockPrisma.taskRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
    });
  });

  // =========================================================================
  // Phase 2.1: findAll/findOne should include relations
  // =========================================================================
  describe('Phase 2.1: Relation includes', () => {
    it('findAll() should include template, department, creator (safe select), records', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          template: { id: 'tpl-1', title: 'Template A' },
          department: { id: 'dept-1', name: 'Dept A' },
          creator: { id: 'user-1', name: 'User A' },
          records: [],
        },
      ];
      mockPrisma.task.findMany.mockResolvedValue(mockTasks);
      mockPrisma.task.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 20 }, 'admin-1', 'admin');

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            template: true,
            department: true,
            creator: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                username: true,
                name: true,
                role: true,
                departmentId: true,
              }),
            }),
            records: true,
          }),
        }),
      );
    });

    it('findOne() should include template, department, creator (safe select), records', async () => {
      const mockTask = {
        id: 'task-1',
        status: 'pending',
        deletedAt: null,
        template: { id: 'tpl-1', title: 'Template A' },
        department: { id: 'dept-1', name: 'Dept A' },
        creator: { id: 'user-1', name: 'User A' },
        records: [],
      };
      mockPrisma.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.findOne('task-1');

      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            template: true,
            department: true,
            creator: expect.objectContaining({
              select: expect.objectContaining({
                id: true,
                name: true,
              }),
            }),
            records: true,
          }),
        }),
      );
      expect(result.template).toBeDefined();
      expect(result.department).toBeDefined();
      expect(result.creator).toBeDefined();
    });
  });

  // =========================================================================
  // Phase 2.2: cancel() should validate task status
  // =========================================================================
  describe('Phase 2.2: Cancel status validation', () => {
    it('should reject cancel when task status is submitted', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'submitted',
      });

      await expect(
        service.cancel('task-1', 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject cancel when task status is cancelled', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'cancelled',
      });

      await expect(
        service.cancel('task-1', 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject cancel when task status is approved', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'approved',
      });

      await expect(
        service.cancel('task-1', 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('cancel rejection should contain correct error code', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'submitted',
      });

      try {
        await service.cancel('task-1', 'user-1', 'user');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe(ErrorCode.CONFLICT);
      }
    });

    it('should allow cancel when task status is pending', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'pending',
      });
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'cancelled',
      });

      const result = await service.cancel('task-1', 'user-1', 'user');
      expect(result.status).toBe('cancelled');
    });
  });

  // =========================================================================
  // Phase 2.3: Notification on task creation
  // =========================================================================
  describe('Phase 2.3: Notification on task creation', () => {
    it('should send notifications to department members on task creation', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'active',
        title: 'Active Template',
        deletedAt: null,
      });

      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ]);

      await service.create(
        { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
        'creator-1',
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-1',
          }),
        }),
      );
      expect(mockNotificationService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-1',
            type: 'task',
          }),
          expect.objectContaining({
            userId: 'user-2',
            type: 'task',
          }),
        ]),
      );
    });

    it('should not fail task creation when no department members found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'active',
        title: 'Active Template',
        deletedAt: null,
      });

      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.create(
        { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
        'creator-1',
      );

      expect(result).toBeDefined();
      expect(mockNotificationService.createMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Phase 2.4: Notification on task cancellation
  // =========================================================================
  describe('Phase 2.4: Notification on task cancellation', () => {
    it('should send notifications to department members on task cancellation', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'cancelled',
      });

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'member-1', name: 'Member 1' },
        { id: 'member-2', name: 'Member 2' },
      ]);

      await service.cancel('task-1', 'user-1', 'user');

      expect(mockNotificationService.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'member-1',
            type: 'task',
          }),
          expect.objectContaining({
            userId: 'member-2',
            type: 'task',
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // Phase 2.5: Draft (save) API
  // =========================================================================
  describe('Phase 2.5: Draft API', () => {
    it('should save draft successfully for pending task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrisma.taskRecord.upsert.mockResolvedValue({
        id: 'record-1',
        taskId: 'task-1',
        templateId: 'tpl-1',
        dataJson: { temp: 180 },
        status: 'pending',
      });

      const result = await service.saveDraft(
        'task-1',
        { data: { temp: 180 } },
        'user-1',
      );

      expect(result.status).toBe('pending');
      expect(result.dataJson).toEqual({ temp: 180 });
    });

    it('should reject draft when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.saveDraft('nonexistent', { data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject draft when task is not pending', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'submitted',
      });

      await expect(
        service.saveDraft('task-1', { data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject draft when user not in task department', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-2',
      });

      await expect(
        service.saveDraft('task-1', { data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should upsert draft record (update existing)', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      mockPrisma.taskRecord.upsert.mockResolvedValue({
        id: 'record-1',
        taskId: 'task-1',
        dataJson: { temp: 200 },
        status: 'pending',
      });

      await service.saveDraft(
        'task-1',
        { data: { temp: 200 } },
        'user-1',
      );

      expect(mockPrisma.taskRecord.upsert).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Phase 2.6: Field validation on submit
  // =========================================================================
  describe('Phase 2.6: Field validation on submit', () => {
    // Helper: builds a tx mock with user in dept-1 (passes department check)
    const buildFieldValidationTx = (fieldsJson: any[]) => ({
      task: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({
            id: 'task-1',
            templateId: 'tpl-1',
            departmentId: 'dept-1',
            status: 'pending',
            deletedAt: null,
          })
          .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
        update: jest.fn(),
      },
      template: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          fieldsJson,
          version: 1.0,
          deletedAt: null,
        }),
      },
      taskRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          departmentId: 'dept-1',
        }),
      },
    });

    it('should reject submit when required field is missing', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'temp', type: 'number', required: true },
          { name: 'notes', type: 'text', required: true },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { temp: 180 } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when number field exceeds max', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'temp', type: 'number', min: 0, max: 100 },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { temp: 150 } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when number field below min', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'temp', type: 'number', min: 10, max: 100 },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { temp: 5 } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when text field exceeds maxLength', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'notes', type: 'text', maxLength: 10 },
        ]));
      });

      await expect(
        service.submit(
          { taskId: 'task-1', data: { notes: 'this text is way too long' } },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when text field below minLength', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'notes', type: 'text', minLength: 5 },
        ]));
      });

      await expect(
        service.submit(
          { taskId: 'task-1', data: { notes: 'ab' } },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject submit when field fails regex pattern', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'code', type: 'text', pattern: '^[A-Z]{3}-\\d{3}$' },
        ]));
      });

      await expect(
        service.submit(
          { taskId: 'task-1', data: { code: 'invalid-code' } },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should return detailed field-level error messages', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildFieldValidationTx([
          { name: 'temp', type: 'number', required: true },
          { name: 'notes', type: 'text', required: true },
        ]));
      });

      try {
        await service.submit({ taskId: 'task-1', data: {} }, 'user-1');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).details).toBeDefined();
        const details = (error as BusinessException).details as any[];
        expect(details.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // =========================================================================
  // Phase 2.8: Department membership check on submit
  // =========================================================================
  describe('Phase 2.8: Department membership check on submit', () => {
    it('should reject submit when user is not in task department', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({
                id: 'task-1',
                templateId: 'tpl-1',
                departmentId: 'dept-1',
                status: 'pending',
                deletedAt: null,
              })
              .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
            update: jest.fn(),
          },
          template: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'tpl-1',
              fieldsJson: [],
              version: 1.0,
              deletedAt: null,
            }),
          },
          taskRecord: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'user-1',
              departmentId: 'dept-2',
            }),
          },
        };
        return cb(tx);
      });

      await expect(
        service.submit({ taskId: 'task-1', data: {} }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should allow submit when user is in task department', async () => {
      const mockRecord = {
        id: 'record-1',
        taskId: 'task-1',
        templateId: 'tpl-1',
        status: 'submitted',
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          task: {
            findUnique: jest.fn()
              .mockResolvedValueOnce({
                id: 'task-1',
                templateId: 'tpl-1',
                departmentId: 'dept-1',
                status: 'pending',
                deletedAt: null,
              })
              .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
            update: jest.fn().mockResolvedValue({ id: 'task-1', status: 'submitted' }),
          },
          template: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'tpl-1',
              fieldsJson: [],
              version: 1.0,
              deletedAt: null,
            }),
          },
          taskRecord: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockRecord),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'user-1',
              departmentId: 'dept-1',
            }),
          },
        };
        return cb(tx);
      });

      mockDeviationService.detectDeviations.mockReturnValue([]);

      const result = await service.submit(
        { taskId: 'task-1', data: {} },
        'user-1',
      );

      expect(result.status).toBe('submitted');
    });
  });

  // =========================================================================
  // Phase 2.10: Update task (PUT /tasks/:id)
  // =========================================================================
  describe('Phase 2.10: Update task', () => {
    it('should update deadline for pending task by creator', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        deadline: new Date('2026-06-30'),
        status: 'pending',
      });

      const result = await service.update(
        'task-1',
        { deadline: '2026-06-30' },
        'user-1',
        'user',
      );

      expect(result).toBeDefined();
      expect(mockPrisma.task.update).toHaveBeenCalled();
    });

    it('should update departmentId for pending task by admin', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'dept-2',
        name: 'Dept 2',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        departmentId: 'dept-2',
        status: 'pending',
      });

      const result = await service.update(
        'task-1',
        { departmentId: 'dept-2' },
        'admin-1',
        'admin',
      );

      expect(result.departmentId).toBe('dept-2');
    });

    it('should reject update when task is not pending', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'submitted',
      });

      await expect(
        service.update('task-1', { deadline: '2026-06-30' }, 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject update when user is not creator and not admin', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        status: 'pending',
      });

      await expect(
        service.update('task-1', { deadline: '2026-06-30' }, 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject update when target department does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(
        service.update('task-1', { departmentId: 'nonexistent' }, 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject update when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { deadline: '2026-06-30' }, 'user-1', 'user'),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =========================================================================
  // CRITICAL-2: ReDoS vulnerability in regex validation
  // =========================================================================
  describe('CRITICAL-2: ReDoS-safe regex validation', () => {
    // Helper: builds a tx mock with user in dept-1 (passes department check)
    const buildRegexTestTx = (fieldsJson: any[]) => ({
      task: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({
            id: 'task-1',
            templateId: 'tpl-1',
            departmentId: 'dept-1',
            status: 'pending',
            deletedAt: null,
          })
          .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
        update: jest.fn(),
      },
      template: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          fieldsJson,
          version: 1.0,
          deletedAt: null,
        }),
      },
      taskRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          departmentId: 'dept-1',
        }),
      },
    });

    it('should return validation error for invalid regex pattern (e.g., unclosed group)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '(unclosed' },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should return validation error for regex with null bytes pattern', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '(?P<name>test)' },
        ]));
      });

      // This Python-style named group syntax is invalid in JavaScript regex
      await expect(
        service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should handle completely broken regex gracefully without hanging', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '[invalid' },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should still validate valid regex patterns correctly', async () => {
      const mockRecord = {
        id: 'record-1',
        taskId: 'task-1',
        status: 'submitted',
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '^[A-Z]{3}-\\d{3}$' },
        ]);
        tx.taskRecord.create.mockResolvedValue(mockRecord);
        tx.task.update.mockResolvedValue({ id: 'task-1', status: 'submitted' });
        return cb(tx);
      });

      mockDeviationService.detectDeviations.mockReturnValue([]);

      const result = await service.submit(
        { taskId: 'task-1', data: { code: 'ABC-123' } },
        'user-1',
      );

      expect(result.status).toBe('submitted');
    });

    it('should reject value that does not match valid regex pattern', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '^[A-Z]{3}-\\d{3}$' },
        ]));
      });

      await expect(
        service.submit(
          { taskId: 'task-1', data: { code: 'invalid-code' } },
          'user-1',
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should include helpful error message when regex is invalid', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTestTx([
          { name: 'code', type: 'text', pattern: '(broken' },
        ]));
      });

      try {
        await service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1');
        fail('Should have thrown BusinessException');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe(ErrorCode.VALIDATION_ERROR);
        // Error message should mention the field name
        expect((error as BusinessException).message).toContain('code');
      }
    });
  });

  // =========================================================================
  // SEC-NEW-001: Password hash must NOT leak via RELATION_INCLUDES
  // =========================================================================
  describe('SEC-NEW-001: Password hash leakage prevention', () => {
    it('findAll() should use select for creator (not include: true)', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, 'admin-1', 'admin');

      const call = mockPrisma.task.findMany.mock.calls[0][0];
      // creator must NOT be `true` (which returns all fields including password)
      expect(call.include.creator).not.toBe(true);
      // creator must use select with safe fields only
      expect(call.include.creator).toHaveProperty('select');
      expect(call.include.creator.select).toHaveProperty('id', true);
      expect(call.include.creator.select).toHaveProperty('username', true);
      expect(call.include.creator.select).toHaveProperty('name', true);
      expect(call.include.creator.select).toHaveProperty('role', true);
      expect(call.include.creator.select).toHaveProperty('departmentId', true);
      // password must NOT be selected
      expect(call.include.creator.select.password).toBeUndefined();
    });

    it('findOne() should use select for creator (not include: true)', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'user-1',
      });

      // After fix, findOne requires userId and role
      await service.findOne('task-1', 'admin-1', 'admin');

      const call = mockPrisma.task.findFirst.mock.calls[0][0];
      expect(call.include.creator).not.toBe(true);
      expect(call.include.creator).toHaveProperty('select');
      expect(call.include.creator.select.password).toBeUndefined();
      expect(call.include.creator.select.loginAttempts).toBeUndefined();
      expect(call.include.creator.select.lockedUntil).toBeUndefined();
    });
  });

  // =========================================================================
  // SEC-NEW-003: Notification error logging
  // =========================================================================
  describe('SEC-NEW-003: Notification error logging', () => {
    it('should log warning when notification fails during task creation', async () => {
      mockPrisma.template.findUnique.mockResolvedValue({
        id: 'tpl-1',
        status: 'active',
        title: 'Active Template',
        deletedAt: null,
      });

      mockPrisma.task.create.mockResolvedValue({
        id: 'task-1',
        templateId: 'tpl-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      // Simulate notification failure
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockNotificationService.createMany.mockRejectedValue(new Error('Redis connection failed'));

      // Spy on the logger
      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await service.create(
        { templateId: 'tpl-1', departmentId: 'dept-1', deadline: '2026-12-31' },
        'creator-1',
      );

      // Task creation should still succeed
      expect(result).toBeDefined();
      // But the error should be logged
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy.mock.calls[0][0]).toContain('Notification');
    });

    it('should log warning when notification fails during task cancellation', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        creatorId: 'user-1',
        departmentId: 'dept-1',
        status: 'pending',
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'cancelled',
      });

      // Simulate notification failure
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'member-1' }]);
      mockNotificationService.createMany.mockRejectedValue(new Error('Network timeout'));

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await service.cancel('task-1', 'user-1', 'user');

      expect(result).toBeDefined();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SEC-NEW-002: findOne authorization check
  // =========================================================================
  describe('SEC-NEW-002: findOne authorization', () => {
    it('should allow admin to view any task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      const result = await service.findOne('task-1', 'admin-1', 'admin');

      expect(result.id).toBe('task-1');
    });

    it('should allow user in same department to view task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        departmentId: 'dept-1',
      });

      const result = await service.findOne('task-1', 'user-1', 'user');

      expect(result.id).toBe('task-1');
    });

    it('should reject user from different department', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        departmentId: 'dept-2',
      });

      await expect(
        service.findOne('task-1', 'user-2', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject user with no department', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-3',
        departmentId: null,
      });

      await expect(
        service.findOne('task-1', 'user-3', 'user'),
      ).rejects.toThrow(BusinessException);
    });

    it('should allow leader in same department to view task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'leader-1',
        role: 'leader',
        departmentId: 'dept-1',
      });

      const result = await service.findOne('task-1', 'leader-1', 'leader');

      expect(result.id).toBe('task-1');
    });

    it('should reject leader from different department', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        status: 'pending',
        departmentId: 'dept-1',
        creatorId: 'other-user',
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'leader-2',
        role: 'leader',
        departmentId: 'dept-2',
      });

      await expect(
        service.findOne('task-1', 'leader-2', 'leader'),
      ).rejects.toThrow(BusinessException);
    });
  });

  // =========================================================================
  // HIGH-002: Self-approval prevention
  // =========================================================================
  describe('HIGH-002: Self-approval prevention', () => {
    it('should reject when submitter tries to approve their own record', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', role: 'admin', departmentId: 'dept-1' }) // approver
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'other', departmentId: 'dept-1' }); // submitter

      await expect(
        service.approve({ recordId: 'record-1', status: 'approved' }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject self-approval even for admin role', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'admin-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-1', role: 'admin', departmentId: 'dept-1' })
        .mockResolvedValueOnce({ id: 'admin-1', superiorId: null, departmentId: 'dept-1' });

      await expect(
        service.approve({ recordId: 'record-1', status: 'approved' }, 'admin-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('self-approval rejection should contain FORBIDDEN error code', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', role: 'leader', departmentId: 'dept-1' })
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'other', departmentId: 'dept-1' });

      try {
        await service.approve({ recordId: 'record-1', status: 'approved' }, 'user-1');
        fail('Should have thrown BusinessException');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).code).toBe(ErrorCode.FORBIDDEN);
        expect((error as BusinessException).message).toContain('不能审批自己');
      }
    });

    it('should allow different user to approve record', async () => {
      mockPrisma.taskRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        status: 'submitted',
        submitterId: 'user-1',
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'admin-2', role: 'admin', departmentId: 'dept-1' })
        .mockResolvedValueOnce({ id: 'user-1', superiorId: 'admin-2', departmentId: 'dept-1' });
      mockPrisma.taskRecord.update.mockResolvedValue({ id: 'record-1', status: 'approved' });

      const result = await service.approve(
        { recordId: 'record-1', status: 'approved' },
        'admin-2',
      );

      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // CRITICAL-001: ReDoS protection with safe-regex
  // =========================================================================
  describe('CRITICAL-001: ReDoS safe regex validation', () => {
    const buildRegexTx = (fieldsJson: any[]) => ({
      task: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({
            id: 'task-1',
            templateId: 'tpl-1',
            departmentId: 'dept-1',
            status: 'pending',
            deletedAt: null,
          })
          .mockResolvedValueOnce({ id: 'task-1', templateId: 'tpl-1' }),
        update: jest.fn(),
      },
      template: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          fieldsJson,
          version: 1.0,
          deletedAt: null,
        }),
      },
      taskRecord: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          departmentId: 'dept-1',
        }),
      },
    });

    it('should reject ReDoS-vulnerable regex pattern (catastrophic backtracking)', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTx([
          { name: 'code', type: 'text', pattern: '(a+)+$' },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { code: 'aaaaaaaaaaaaaaaaaaaaa!' } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject nested quantifier regex pattern', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTx([
          { name: 'code', type: 'text', pattern: '(a+){10,}$' },
        ]));
      });

      await expect(
        service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1'),
      ).rejects.toThrow(BusinessException);
    });

    it('should include helpful message for unsafe regex', async () => {
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(buildRegexTx([
          { name: 'code', type: 'text', pattern: '(a+)+$' },
        ]));
      });

      try {
        await service.submit({ taskId: 'task-1', data: { code: 'test' } }, 'user-1');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException);
        expect((error as BusinessException).message).toContain('code');
      }
    });

    it('should accept safe regex patterns', async () => {
      const mockRecord = { id: 'record-1', status: 'submitted' };
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = buildRegexTx([
          { name: 'code', type: 'text', pattern: '^[A-Z0-9]{5,10}$' },
        ]);
        tx.taskRecord.create.mockResolvedValue(mockRecord);
        tx.task.update.mockResolvedValue({ id: 'task-1', status: 'submitted' });
        return cb(tx);
      });

      mockDeviationService.detectDeviations.mockReturnValue([]);

      const result = await service.submit(
        { taskId: 'task-1', data: { code: 'ABC123' } },
        'user-1',
      );

      expect(result.status).toBe('submitted');
    });
  });
});
