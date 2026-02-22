import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SensitiveLogInterceptor } from './sensitive-log.interceptor';
import { AuditService } from '../audit.service';
import { SENSITIVE_LOG_KEY } from '../decorators/sensitive-log.decorator';

describe('SensitiveLogInterceptor', () => {
  let interceptor: SensitiveLogInterceptor;
  let auditService: AuditService;
  let reflector: Reflector;

  const mockAuditService = {
    createSensitiveLog: jest.fn().mockResolvedValue({}),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensitiveLogInterceptor,
        { provide: AuditService, useValue: mockAuditService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<SensitiveLogInterceptor>(SensitiveLogInterceptor);
    auditService = module.get<AuditService>(AuditService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockContext(overrides: any = {}): ExecutionContext {
    const request = {
      user: { id: 'user-1', username: 'admin' },
      method: 'DELETE',
      url: '/api/v1/documents/doc-1',
      params: { id: 'doc-1' },
      query: {},
      body: { name: 'test.pdf' },
      headers: { 'user-agent': 'Mozilla/5.0' },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      ...overrides,
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(data: any = { id: 'doc-1', name: 'test.pdf' }): CallHandler {
    return { handle: () => of(data) };
  }

  it('should pass through when no metadata', (done) => {
    mockReflector.get.mockReturnValue(undefined);

    const context = createMockContext();
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(mockAuditService.createSensitiveLog).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should pass details as object, not JSON string (TASK-359)', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'delete_document', resourceType: 'document',
    });

    const context = createMockContext();
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // Allow async log recording to complete
        setTimeout(() => {
          expect(mockAuditService.createSensitiveLog).toHaveBeenCalled();

          const callArg = mockAuditService.createSensitiveLog.mock.calls[0][0];
          // TASK-359: details should be an object, NOT a JSON string
          expect(typeof callArg.details).toBe('object');
          expect(callArg.details).toHaveProperty('method', 'DELETE');
          expect(callArg.details).toHaveProperty('url');
          done();
        }, 50);
      },
    });
  });

  it('should provide fallback values for required fields (TASK-359)', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'export_data', resourceType: 'report',
    });

    // Missing user-agent, no id in response, no name, no IP sources
    const context = createMockContext({
      user: { id: 'user-1', username: 'admin' },
      headers: {},
      params: {},
      body: {},
      ip: undefined,
      connection: undefined,
      socket: undefined,
    });

    const handler: CallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(mockAuditService.createSensitiveLog).toHaveBeenCalled();

          const callArg = mockAuditService.createSensitiveLog.mock.calls[0][0];
          // TASK-359: Required fields should have 'unknown' fallback
          expect(callArg.resourceId).toBe('unknown');
          expect(callArg.resourceName).toBe('unknown');
          expect(callArg.userAgent).toBe('unknown');
          expect(callArg.ipAddress).toBe('unknown');
          done();
        }, 50);
      },
    });
  });

  it('should record log on error path with error details in Json', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'delete_document', resourceType: 'document',
    });

    const context = createMockContext();
    const error = new Error('Not found');
    (error as any).status = 404;

    const handler: CallHandler = {
      handle: () => throwError(() => error),
    };

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        setTimeout(() => {
          expect(mockAuditService.createSensitiveLog).toHaveBeenCalled();

          const callArg = mockAuditService.createSensitiveLog.mock.calls[0][0];
          // details should be object with error info
          expect(typeof callArg.details).toBe('object');
          expect(callArg.details).toHaveProperty('error', 'Not found');
          expect(callArg.details).toHaveProperty('statusCode', 404);
          done();
        }, 50);
      },
    });
  });

  it('should extract resourceId from response data', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'approve', resourceType: 'approval',
    });

    const context = createMockContext({ params: {} });
    const handler = createMockCallHandler({ id: 'approval-123', title: 'Test Approval' });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          const callArg = mockAuditService.createSensitiveLog.mock.calls[0][0];
          expect(callArg.resourceId).toBe('approval-123');
          expect(callArg.resourceName).toBe('Test Approval');
          done();
        }, 50);
      },
    });
  });

  it('should not block main flow when audit logging fails', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'delete_document', resourceType: 'document',
    });

    mockAuditService.createSensitiveLog.mockRejectedValue(new Error('Audit DB down'));

    const context = createMockContext();
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        // Main flow should still work
        expect(value).toEqual({ id: 'doc-1', name: 'test.pdf' });
        done();
      },
    });
  });

  it('should use x-forwarded-for IP when available', (done) => {
    mockReflector.get.mockReturnValue({
      action: 'delete_document', resourceType: 'document',
    });

    const context = createMockContext({
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
      },
    });
    const handler = createMockCallHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          const callArg = mockAuditService.createSensitiveLog.mock.calls[0][0];
          expect(callArg.ipAddress).toBe('10.0.0.1');
          done();
        }, 50);
      },
    });
  });
});
