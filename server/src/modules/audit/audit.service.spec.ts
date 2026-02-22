import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    loginLog: {
      create: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    permissionLog: {
      create: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    sensitiveLog: {
      create: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // TASK-359 Defect 1: IDs should be String cuid()
  // =============================================
  describe('TASK-359: PermissionLog/SensitiveLog ID type', () => {
    it('should return string cuid ID for PermissionLog', async () => {
      const dto = {
        operatorId: 'user-1', operatorName: 'admin',
        targetUserId: 'user-2', targetUsername: 'testuser',
        action: 'assign_role', ipAddress: '127.0.0.1',
      };

      mockPrismaService.permissionLog.create.mockResolvedValue({
        id: 'clx1234567890abcdef',
        ...dto, beforeValue: null, afterValue: null,
        reason: null, approvedBy: null, approvedByName: null,
        createdAt: new Date(),
      });

      const result = await service.createPermissionLog(dto);
      expect(typeof result.id).toBe('string');
    });

    it('should return string cuid ID for SensitiveLog', async () => {
      const dto = {
        userId: 'user-1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-123', resourceName: 'test.pdf',
        details: { reason: 'outdated' },
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.sensitiveLog.create.mockResolvedValue({
        id: 'clx9876543210fedcba', ...dto, createdAt: new Date(),
      });

      const result = await service.createSensitiveLog(dto);
      expect(typeof result.id).toBe('string');
    });
  });

  // =============================================
  // TASK-359 Defect 2: Json fields accept objects
  // =============================================
  describe('TASK-359: Json fields accept objects directly', () => {
    it('should pass beforeValue/afterValue as objects to PermissionLog', async () => {
      const beforeRoles = ['user'];
      const afterRoles = ['user', 'admin'];

      const dto = {
        operatorId: 'user-1', operatorName: 'admin',
        targetUserId: 'user-2', targetUsername: 'testuser',
        action: 'assign_role',
        beforeValue: beforeRoles, afterValue: afterRoles,
        reason: 'Promotion', ipAddress: '127.0.0.1',
      };

      mockPrismaService.permissionLog.create.mockResolvedValue({
        id: 'clx123', ...dto, approvedBy: null, approvedByName: null,
        createdAt: new Date(),
      });

      await service.createPermissionLog(dto);

      const callData = mockPrismaService.permissionLog.create.mock.calls[0][0].data;
      expect(callData.beforeValue).toEqual(beforeRoles);
      expect(callData.afterValue).toEqual(afterRoles);
      expect(typeof callData.beforeValue).not.toBe('string');
    });

    it('should pass details as object to SensitiveLog', async () => {
      const detailsObj = { reason: 'outdated', fileSize: 1024 };

      const dto = {
        userId: 'user-1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-123', resourceName: 'test.pdf',
        details: detailsObj,
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.sensitiveLog.create.mockResolvedValue({
        id: 'clx987', ...dto, createdAt: new Date(),
      });

      await service.createSensitiveLog(dto);

      const callData = mockPrismaService.sensitiveLog.create.mock.calls[0][0].data;
      expect(callData.details).toEqual(detailsObj);
      expect(typeof callData.details).toBe('object');
    });

    it('should handle undefined optional Json fields in PermissionLog', async () => {
      const dto = {
        operatorId: 'user-1', operatorName: 'admin',
        targetUserId: 'user-2', targetUsername: 'testuser',
        action: 'assign_role', ipAddress: '127.0.0.1',
      };

      mockPrismaService.permissionLog.create.mockResolvedValue({
        id: 'clx123', ...dto, beforeValue: null, afterValue: null,
        reason: null, approvedBy: null, approvedByName: null,
        createdAt: new Date(),
      });

      await service.createPermissionLog(dto);

      const callData = mockPrismaService.permissionLog.create.mock.calls[0][0].data;
      expect(callData.beforeValue).toBeUndefined();
      expect(callData.afterValue).toBeUndefined();
    });

    it('should handle undefined details in SensitiveLog', async () => {
      const dto = {
        userId: 'user-1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-123', resourceName: 'test.pdf',
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.sensitiveLog.create.mockResolvedValue({
        id: 'clx987', ...dto, details: null, createdAt: new Date(),
      });

      await service.createSensitiveLog(dto);

      const callData = mockPrismaService.sensitiveLog.create.mock.calls[0][0].data;
      expect(callData.details).toBeUndefined();
    });
  });

  // =============================================
  // TASK-359 Defect 3: LoginLog.userId nullable
  // =============================================
  describe('TASK-359: LoginLog nullable userId', () => {
    it('should allow null userId for failed login (BR-270)', async () => {
      const dto = {
        username: 'unknown_user',
        action: 'login_failed',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        failReason: 'User not found',
      };

      mockPrismaService.loginLog.create.mockResolvedValue({
        id: 'clx111', userId: null, ...dto,
        loginTime: new Date(), logoutTime: null,
        status: 'failed', location: null, createdAt: new Date(),
      });

      const result = await service.createLoginLog(dto);

      expect(result.userId).toBeNull();
      const callData = mockPrismaService.loginLog.create.mock.calls[0][0].data;
      expect(callData.userId).toBeUndefined();
      expect(callData.status).toBe('failed');
    });

    it('should pass userId for successful login', async () => {
      const dto = {
        userId: 'user-1', username: 'testuser',
        action: 'login', ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.loginLog.create.mockResolvedValue({
        id: 'clx444', ...dto, loginTime: new Date(), logoutTime: null,
        status: 'success', location: null, failReason: null, createdAt: new Date(),
      });

      const result = await service.createLoginLog(dto);
      expect(result.userId).toBe('user-1');
    });
  });

  // =============================================
  // TASK-359 Defect 4: Required fields
  // =============================================
  describe('TASK-359: SensitiveLog required fields', () => {
    it('should require resourceId, resourceName, ipAddress, userAgent', async () => {
      const dto = {
        userId: 'user-1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-123', resourceName: 'test.pdf',
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.sensitiveLog.create.mockResolvedValue({
        id: 'clx777', ...dto, details: null, createdAt: new Date(),
      });

      const result = await service.createSensitiveLog(dto);
      expect(result.resourceId).toBe('doc-123');
      expect(result.resourceName).toBe('test.pdf');
      expect(result.ipAddress).toBe('127.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });
  });

  // =============================================
  // Original CRUD tests
  // =============================================
  describe('createLoginLog', () => {
    it('should create a login log with correct data', async () => {
      const dto = {
        userId: '1', username: 'testuser', action: 'login',
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0', location: 'Beijing',
      };

      mockPrismaService.loginLog.create.mockResolvedValue({
        id: 'clx-login-1', ...dto,
        loginTime: expect.any(Date), logoutTime: null,
        status: 'success', failReason: null, createdAt: new Date(),
      });

      const result = await service.createLoginLog(dto);

      expect(prisma.loginLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: dto.userId, username: dto.username,
          action: dto.action, ipAddress: dto.ipAddress,
          loginTime: expect.any(Date), logoutTime: undefined,
          status: 'success',
        }),
      });
      expect(result.id).toBe('clx-login-1');
    });

    it('should set status to failed for login_failed action', async () => {
      const dto = {
        userId: '1', username: 'testuser',
        action: 'login_failed', ipAddress: '127.0.0.1',
        failReason: 'Invalid password',
      };

      mockPrismaService.loginLog.create.mockResolvedValue({
        id: 'clx-login-2', ...dto, loginTime: new Date(),
        logoutTime: null, status: 'failed', createdAt: new Date(),
      });

      await service.createLoginLog(dto);

      const callData = mockPrismaService.loginLog.create.mock.calls[0][0].data;
      expect(callData.status).toBe('failed');
      expect(callData.failReason).toBe('Invalid password');
    });

    it('should set logoutTime for logout action', async () => {
      const dto = { userId: '1', username: 'testuser', action: 'logout', ipAddress: '127.0.0.1' };

      mockPrismaService.loginLog.create.mockResolvedValue({
        id: 'clx-login-3', ...dto, loginTime: null,
        logoutTime: new Date(), status: 'success',
        failReason: null, createdAt: new Date(),
      });

      await service.createLoginLog(dto);

      const callData = mockPrismaService.loginLog.create.mock.calls[0][0].data;
      expect(callData.loginTime).toBeUndefined();
      expect(callData.logoutTime).toBeInstanceOf(Date);
    });

    it('should throw error when database fails', async () => {
      mockPrismaService.loginLog.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createLoginLog({
        userId: '1', username: 'test', action: 'login', ipAddress: '127.0.0.1',
      })).rejects.toThrow('Database error');
    });
  });

  describe('createPermissionLog', () => {
    it('should create permission log passing data directly to Prisma', async () => {
      const dto = {
        operatorId: '1', operatorName: 'admin',
        targetUserId: '2', targetUsername: 'user',
        action: 'assign_role',
        beforeValue: ['user'], afterValue: ['user', 'admin'],
        reason: 'Promotion', ipAddress: '127.0.0.1',
      };

      mockPrismaService.permissionLog.create.mockResolvedValue({
        id: 'clx-perm-1', ...dto, approvedBy: null,
        approvedByName: null, createdAt: new Date(),
      });

      await service.createPermissionLog(dto);
      expect(prisma.permissionLog.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw error when database fails', async () => {
      mockPrismaService.permissionLog.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createPermissionLog({
        operatorId: '1', operatorName: 'admin',
        targetUserId: '2', targetUsername: 'user',
        action: 'assign_role', ipAddress: '127.0.0.1',
      })).rejects.toThrow('Database error');
    });
  });

  describe('createSensitiveLog', () => {
    it('should create sensitive log passing data directly to Prisma', async () => {
      const dto = {
        userId: '1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: '123', resourceName: 'test.pdf',
        details: { reason: 'outdated' },
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      };

      mockPrismaService.sensitiveLog.create.mockResolvedValue({
        id: 'clx-sens-1', ...dto, createdAt: new Date(),
      });

      await service.createSensitiveLog(dto);
      expect(prisma.sensitiveLog.create).toHaveBeenCalledWith({ data: dto });
    });

    it('should throw error when database fails', async () => {
      mockPrismaService.sensitiveLog.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createSensitiveLog({
        userId: '1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-1', resourceName: 'test.pdf',
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      })).rejects.toThrow('Database error');
    });
  });

  // =============================================
  // Batch create tests
  // =============================================
  describe('createLoginLogs (batch)', () => {
    it('should create multiple login logs', async () => {
      mockPrismaService.loginLog.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createLoginLogs([
        { userId: '1', username: 'user1', action: 'login', ipAddress: '127.0.0.1' },
        { userId: '2', username: 'user2', action: 'login', ipAddress: '127.0.0.2' },
      ]);

      expect(prisma.loginLog.createMany).toHaveBeenCalled();
      expect(result).toEqual({ count: 2 });
    });
  });

  describe('createPermissionLogs (batch)', () => {
    it('should pass Json fields in batch data', async () => {
      mockPrismaService.permissionLog.createMany.mockResolvedValue({ count: 1 });

      await service.createPermissionLogs([{
        operatorId: '1', operatorName: 'admin',
        targetUserId: '2', targetUsername: 'user2',
        action: 'assign_role',
        beforeValue: ['user'], afterValue: ['user', 'admin'],
        ipAddress: '127.0.0.1',
      }]);

      const batchData = mockPrismaService.permissionLog.createMany.mock.calls[0][0].data;
      expect(batchData[0].beforeValue).toEqual(['user']);
      expect(batchData[0].afterValue).toEqual(['user', 'admin']);
    });
  });

  describe('createSensitiveLogs (batch)', () => {
    it('should create batch with required fields', async () => {
      mockPrismaService.sensitiveLog.createMany.mockResolvedValue({ count: 1 });

      await service.createSensitiveLogs([{
        userId: '1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-1', resourceName: 'file.pdf',
        ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0',
      }]);

      expect(prisma.sensitiveLog.createMany).toHaveBeenCalled();
    });
  });

  // =============================================
  // Query tests
  // =============================================
  describe('queryLoginLogs', () => {
    it('should query with pagination', async () => {
      const mockData = [{
        id: 'clx-log-1', userId: 'user-1', username: 'testuser',
        action: 'login', ipAddress: '127.0.0.1',
        loginTime: new Date(), status: 'success', createdAt: new Date(),
      }];

      mockPrismaService.loginLog.count.mockResolvedValue(1);
      mockPrismaService.loginLog.findMany.mockResolvedValue(mockData);

      const result = await service.queryLoginLogs({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should apply all filters', async () => {
      mockPrismaService.loginLog.count.mockResolvedValue(0);
      mockPrismaService.loginLog.findMany.mockResolvedValue([]);

      await service.queryLoginLogs({
        userId: 'u1', action: 'login', status: 'success',
        ipAddress: '127', startTime: '2026-01-01', endTime: '2026-12-31',
        page: 1, limit: 20,
      });

      expect(prisma.loginLog.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'u1', action: 'login', status: 'success',
          ipAddress: { contains: '127' },
        }),
      });
    });

    it('should throw on database failure', async () => {
      mockPrismaService.loginLog.count.mockRejectedValue(new Error('DB error'));
      await expect(service.queryLoginLogs({ page: 1, limit: 10 })).rejects.toThrow('DB error');
    });
  });

  describe('queryPermissionLogs', () => {
    it('should return permission logs with Json data', async () => {
      mockPrismaService.permissionLog.count.mockResolvedValue(1);
      mockPrismaService.permissionLog.findMany.mockResolvedValue([{
        id: 'clx-perm-1', operatorName: 'admin', targetUsername: 'testuser',
        action: 'assign_role', beforeValue: ['user'], afterValue: ['user', 'admin'],
        createdAt: new Date(),
      }]);

      const result = await service.queryPermissionLogs({ page: 1, limit: 10 });
      expect(result.data[0].beforeValue).toEqual(['user']);
    });

    it('should apply date filters', async () => {
      mockPrismaService.permissionLog.count.mockResolvedValue(0);
      mockPrismaService.permissionLog.findMany.mockResolvedValue([]);

      await service.queryPermissionLogs({
        operatorId: 'u1', startDate: '2026-01-01', endDate: '2026-12-31',
        page: 1, limit: 20,
      });

      expect(prisma.permissionLog.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ operatorId: 'u1' }),
      });
    });
  });

  describe('querySensitiveLogs', () => {
    it('should return sensitive logs with Json details', async () => {
      mockPrismaService.sensitiveLog.count.mockResolvedValue(1);
      mockPrismaService.sensitiveLog.findMany.mockResolvedValue([{
        id: 'clx-sens-1', userId: 'user-1', username: 'admin',
        action: 'delete_document', resourceType: 'document',
        resourceId: 'doc-1', resourceName: 'test.pdf',
        details: { reason: 'outdated' },
        ipAddress: '127.0.0.1', createdAt: new Date(),
      }]);

      const result = await service.querySensitiveLogs({ page: 1, limit: 10 });
      expect(typeof result.data[0].details).toBe('object');
      expect(result.data[0].details).toEqual({ reason: 'outdated' });
    });
  });

  // =============================================
  // Statistics tests
  // =============================================
  describe('getLoginStats', () => {
    it('should return correct statistics', async () => {
      mockPrismaService.loginLog.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(85)
        .mockResolvedValueOnce(15);
      mockPrismaService.loginLog.groupBy.mockResolvedValue([
        { userId: 'u1' }, { userId: 'u2' },
      ]);

      const result = await service.getLoginStats(new Date('2026-01-01'), new Date('2026-12-31'));

      expect(result.totalLogins).toBe(100);
      expect(result.successLogins).toBe(85);
      expect(result.failedLogins).toBe(15);
      expect(result.uniqueUsers).toBe(2);
      expect(result.successRate).toBe('85.00');
    });

    it('should handle zero logins gracefully', async () => {
      mockPrismaService.loginLog.count.mockResolvedValue(0);
      mockPrismaService.loginLog.groupBy.mockResolvedValue([]);

      const result = await service.getLoginStats(new Date('2026-01-01'), new Date('2026-12-31'));
      expect(result.successRate).toBe('0.00');
    });
  });

  describe('getSensitiveStats', () => {
    it('should return grouped statistics', async () => {
      mockPrismaService.sensitiveLog.count.mockResolvedValue(50);
      mockPrismaService.sensitiveLog.groupBy
        .mockResolvedValueOnce([{ action: 'delete_document', _count: 30 }])
        .mockResolvedValueOnce([{ resourceType: 'document', _count: 35 }]);

      const result = await service.getSensitiveStats(new Date('2026-01-01'), new Date('2026-12-31'));

      expect(result.totalOperations).toBe(50);
      expect(result.byAction).toHaveLength(1);
      expect(result.byResourceType).toHaveLength(1);
    });
  });

  describe('getDashboard', () => {
    it('should return structured dashboard data', async () => {
      mockPrismaService.loginLog.count.mockResolvedValue(10);
      mockPrismaService.loginLog.groupBy.mockResolvedValue([]);
      mockPrismaService.sensitiveLog.count.mockResolvedValue(5);
      mockPrismaService.sensitiveLog.groupBy.mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result).toHaveProperty('login.last24h');
      expect(result).toHaveProperty('login.last7d');
      expect(result).toHaveProperty('sensitive.last24h');
      expect(result).toHaveProperty('sensitive.last7d');
    });
  });

  describe('getUserTimeline', () => {
    it('should merge and sort timeline entries', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);

      mockPrismaService.loginLog.findMany.mockResolvedValue([
        { id: 'login-1', loginTime: now, action: 'login' },
      ]);
      mockPrismaService.permissionLog.findMany.mockResolvedValue([
        { id: 'perm-1', createdAt: earlier, action: 'assign_role' },
      ]);
      mockPrismaService.sensitiveLog.findMany.mockResolvedValue([]);

      const result = await service.getUserTimeline('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('login');
      expect(result[1].type).toBe('permission');
    });

    it('should cap timeline at 100 entries', async () => {
      const makeLogs = (n: number) => Array.from({ length: n }, (_, i) => ({
        id: `log-${i}`, loginTime: new Date(Date.now() - i * 1000), action: 'login',
      }));

      mockPrismaService.loginLog.findMany.mockResolvedValue(makeLogs(50));
      mockPrismaService.permissionLog.findMany.mockResolvedValue(
        makeLogs(50).map((l) => ({ ...l, createdAt: l.loginTime })),
      );
      mockPrismaService.sensitiveLog.findMany.mockResolvedValue([]);

      const result = await service.getUserTimeline('user-1');
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  // =============================================
  // Export Excel tests
  // =============================================
  describe('exportLoginLogs', () => {
    it('should return a valid Excel buffer', async () => {
      mockPrismaService.loginLog.count.mockResolvedValue(1);
      mockPrismaService.loginLog.findMany.mockResolvedValue([{
        id: 'clx-1', username: 'admin', action: 'login',
        ipAddress: '127.0.0.1', loginTime: new Date(),
        logoutTime: null, status: 'success', failReason: null,
      }]);

      const buffer = await service.exportLoginLogs({ page: 1, limit: 10000 });
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportPermissionLogs', () => {
    it('should handle Json fields in Excel export', async () => {
      mockPrismaService.permissionLog.count.mockResolvedValue(1);
      mockPrismaService.permissionLog.findMany.mockResolvedValue([{
        id: 'clx-1', operatorName: 'admin', targetUsername: 'user',
        action: 'assign_role',
        beforeValue: ['user'], afterValue: ['user', 'admin'],
        reason: 'Promotion', approvedByName: null, createdAt: new Date(),
      }]);

      const buffer = await service.exportPermissionLogs({ page: 1, limit: 10000 });
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('exportSensitiveLogs', () => {
    it('should handle Json details in Excel export', async () => {
      mockPrismaService.sensitiveLog.count.mockResolvedValue(1);
      mockPrismaService.sensitiveLog.findMany.mockResolvedValue([{
        id: 'clx-1', username: 'admin', action: 'delete_document',
        resourceType: 'document', resourceId: 'doc-1', resourceName: 'test.pdf',
        details: { reason: 'outdated' },
        ipAddress: '127.0.0.1', createdAt: new Date(),
      }]);

      const buffer = await service.exportSensitiveLogs({ page: 1, limit: 10000 });
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateBRCGSReport', () => {
    it('should generate multi-sheet Excel report', async () => {
      mockPrismaService.loginLog.findMany.mockResolvedValue([]);
      mockPrismaService.permissionLog.findMany.mockResolvedValue([]);
      mockPrismaService.sensitiveLog.findMany.mockResolvedValue([]);
      mockPrismaService.loginLog.count.mockResolvedValue(0);
      mockPrismaService.loginLog.groupBy.mockResolvedValue([]);
      mockPrismaService.sensitiveLog.count.mockResolvedValue(0);
      mockPrismaService.sensitiveLog.groupBy.mockResolvedValue([]);

      const buffer = await service.generateBRCGSReport(
        new Date('2026-01-01'), new Date('2026-12-31'),
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
