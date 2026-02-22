import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { SubmitByIdDto } from './dto/submit-by-id.dto';
import { ApproveTaskDto, TaskQueryDto } from './dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExportService } from '../export/export.service';
import { StatisticsService } from '../statistics/statistics.service';
import { StatisticsCacheInterceptor } from '../../common/interceptors/statistics-cache.interceptor';

describe('TaskController', () => {
  let controller: TaskController;

  const mockTaskService: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    saveDraft: jest.fn(),
    submit: jest.fn(),
    approve: jest.fn(),
    findPendingApprovals: jest.fn(),
  };

  const mockExportService: any = {
    exportTaskRecords: jest.fn(),
  };

  const mockStatisticsService: any = {
    clearCaches: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ExportService, useValue: mockExportService },
        { provide: StatisticsService, useValue: mockStatisticsService },
        { provide: StatisticsCacheInterceptor, useValue: { intercept: jest.fn((ctx, next) => next.handle()) } },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
  });

  afterEach(() => jest.clearAllMocks());

  // =========================================================================
  // CRITICAL-1: Route ordering - static routes before parameterized routes
  // =========================================================================
  describe('CRITICAL-1: Route ordering (static before parameterized)', () => {
    it('POST /tasks/submit (legacy) should call taskService.submit with SubmitTaskDto', async () => {
      const dto = { taskId: 'task-1', data: { temp: 180 } };
      const mockReq = { user: { id: 'user-1', role: 'user' } };
      mockTaskService.submit.mockResolvedValue({ id: 'record-1', status: 'submitted' });

      const result = await controller.submit(dto as any, mockReq);

      expect(mockTaskService.submit).toHaveBeenCalledWith(dto, 'user-1');
      expect(result.status).toBe('submitted');
    });

    it('POST /tasks/:id/submit (RESTful) should call taskService.submit with constructed DTO', async () => {
      const body = { data: { temp: 180 }, deviationReasons: { temp: 'reason' } };
      const mockReq = { user: { id: 'user-1', role: 'user' } };
      mockTaskService.submit.mockResolvedValue({ id: 'record-1', status: 'submitted' });

      const result = await controller.submitById('task-123', body as any, mockReq);

      expect(mockTaskService.submit).toHaveBeenCalledWith(
        { taskId: 'task-123', data: { temp: 180 }, deviationReasons: { temp: 'reason' } },
        'user-1',
      );
      expect(result.status).toBe('submitted');
    });

    it('POST /tasks/approve should call taskService.approve', async () => {
      const dto = { recordId: 'record-1', status: 'approved' as const };
      const mockReq = { user: { id: 'user-1', role: 'admin' } };
      mockTaskService.approve.mockResolvedValue({ success: true });

      const result = await controller.approve(dto as any, mockReq);

      expect(mockTaskService.approve).toHaveBeenCalledWith(dto, 'user-1');
      expect(result.success).toBe(true);
    });

    it('route methods should be declared in correct order: static routes first', () => {
      // Get all method names from the controller prototype in declaration order
      const proto = Object.getPrototypeOf(controller);
      const methodNames = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor' && typeof proto[name] === 'function',
      );

      // Static POST routes (submit, approve) must appear before parameterized POST routes (submitById)
      const submitIndex = methodNames.indexOf('submit');
      const approveIndex = methodNames.indexOf('approve');
      const submitByIdIndex = methodNames.indexOf('submitById');

      // Static routes must be defined BEFORE parameterized routes
      expect(submitIndex).toBeLessThan(submitByIdIndex);
      expect(approveIndex).toBeLessThan(submitByIdIndex);
    });
  });

  // =========================================================================
  // CRITICAL-3: DTO validation on submitById
  // =========================================================================
  describe('CRITICAL-3: SubmitByIdDto validation', () => {
    it('should accept valid body with data and deviationReasons', async () => {
      const input = { data: { temp: 180 }, deviationReasons: { temp: 'reason' } };
      const dto = plainToInstance(SubmitByIdDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept empty body (both fields optional)', async () => {
      const dto = plainToInstance(SubmitByIdDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept body with only data field', async () => {
      const input = { data: { temp: 180 } };
      const dto = plainToInstance(SubmitByIdDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept body with only deviationReasons field', async () => {
      const input = { deviationReasons: { field1: 'reason' } };
      const dto = plainToInstance(SubmitByIdDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid data field type (string instead of object)', async () => {
      const input = { data: 'invalid-string' };
      const dto = plainToInstance(SubmitByIdDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid deviationReasons field type (string instead of object)', async () => {
      const input = { deviationReasons: 'invalid-string' };
      const dto = plainToInstance(SubmitByIdDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('controller submitById should accept SubmitByIdDto typed parameter', async () => {
      const body: SubmitByIdDto = { data: { temp: 180 } };
      const mockReq = { user: { id: 'user-1' } };
      mockTaskService.submit.mockResolvedValue({ id: 'record-1' });

      await controller.submitById('task-1', body, mockReq);

      expect(mockTaskService.submit).toHaveBeenCalledWith(
        { taskId: 'task-1', data: { temp: 180 }, deviationReasons: undefined },
        'user-1',
      );
    });
  });

  // =========================================================================
  // SEC-NEW-004: ApproveTaskDto status validation
  // =========================================================================
  describe('SEC-NEW-004: ApproveTaskDto status validation', () => {
    it('should accept "approved" as valid status', async () => {
      const input = { recordId: 'record-1', status: 'approved' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should accept "rejected" as valid status', async () => {
      const input = { recordId: 'record-1', status: 'rejected' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject arbitrary string status like "hacked"', async () => {
      const input = { recordId: 'record-1', status: 'hacked' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty string status', async () => {
      const input = { recordId: 'record-1', status: '' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject status "pending" (not a valid approval status)', async () => {
      const input = { recordId: 'record-1', status: 'pending' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject status "submitted" (not a valid approval status)', async () => {
      const input = { recordId: 'record-1', status: 'submitted' };
      const dto = plainToInstance(ApproveTaskDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SEC-NEW-002: findOne should pass userId and role for authorization
  // =========================================================================
  describe('SEC-NEW-002: findOne authorization', () => {
    it('should pass req.user.id and req.user.role to taskService.findOne', async () => {
      const mockReq = { user: { id: 'user-1', role: 'user' } };
      mockTaskService.findOne.mockResolvedValue({ id: 'task-1' });

      await controller.findOne('task-1', mockReq);

      expect(mockTaskService.findOne).toHaveBeenCalledWith('task-1', 'user-1', 'user');
    });
  });

  // =========================================================================
  // HIGH-005: TaskQueryDto status validation against enum
  // =========================================================================
  describe('HIGH-005: TaskQueryDto status enum validation', () => {
    const validStatuses = ['pending', 'submitted', 'approved', 'rejected', 'cancelled', 'overdue'];

    for (const status of validStatuses) {
      it(`should accept valid status "${status}"`, async () => {
        const input = { status };
        const dto = plainToInstance(TaskQueryDto, input);
        const errors = await validate(dto);

        const statusErrors = errors.filter(e => e.property === 'status');
        expect(statusErrors).toHaveLength(0);
      });
    }

    it('should reject invalid status "hacked"', async () => {
      const input = { status: 'hacked' };
      const dto = plainToInstance(TaskQueryDto, input);
      const errors = await validate(dto);

      const statusErrors = errors.filter(e => e.property === 'status');
      expect(statusErrors.length).toBeGreaterThan(0);
    });

    it('should reject invalid status "active"', async () => {
      const input = { status: 'active' };
      const dto = plainToInstance(TaskQueryDto, input);
      const errors = await validate(dto);

      const statusErrors = errors.filter(e => e.property === 'status');
      expect(statusErrors.length).toBeGreaterThan(0);
    });

    it('should accept no status (optional field)', async () => {
      const input = {};
      const dto = plainToInstance(TaskQueryDto, input);
      const errors = await validate(dto);

      const statusErrors = errors.filter(e => e.property === 'status');
      expect(statusErrors).toHaveLength(0);
    });
  });
});
