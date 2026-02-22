import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: any;

  const mockTemplate = {
    id: 'template-1',
    code: 'TPL-001',
    name: 'Test Template',
  };

  beforeEach(async () => {
    prisma = {
      syncSubmission: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      recordTemplate: {
        findUnique: jest.fn(),
      },
      record: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  describe('batchSync', () => {
    it('should sync a single submission successfully', async () => {
      prisma.syncSubmission.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.syncSubmission.create.mockResolvedValue({ id: 'sync-1' });
      prisma.record.findFirst.mockResolvedValue(null);
      prisma.record.create.mockResolvedValue({ id: 'record-1' });

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440001' },
        ],
      };

      const result = await service.batchSync(dto, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.results[0].success).toBe(true);
    });

    it('should handle duplicate UUID (idempotent)', async () => {
      prisma.syncSubmission.findUnique.mockResolvedValue({
        id: 'sync-1',
        uuid: '550e8400-e29b-41d4-a716-446655440001',
      });

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440001' },
        ],
      };

      const result = await service.batchSync(dto, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.results[0].success).toBe(true);
      // Should not call create since it already exists
      expect(prisma.syncSubmission.create).not.toHaveBeenCalled();
    });

    it('should fail when form template does not exist', async () => {
      prisma.syncSubmission.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findUnique.mockResolvedValue(null);

      const dto = {
        submissions: [
          { formId: 'nonexistent', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440002' },
        ],
      };

      const result = await service.batchSync(dto, 'user1');

      expect(result.failedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('表单模板不存在');
    });

    it('should handle multiple submissions with mixed results', async () => {
      // First submission: success
      prisma.syncSubmission.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.recordTemplate.findUnique
        .mockResolvedValueOnce(mockTemplate)
        .mockResolvedValueOnce(null); // second template not found
      prisma.syncSubmission.create.mockResolvedValue({ id: 'sync-1' });
      prisma.record.findFirst.mockResolvedValue(null);
      prisma.record.create.mockResolvedValue({ id: 'record-1' });

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440003' },
          { formId: 'nonexistent', data: { field1: 'value2' }, uuid: '550e8400-e29b-41d4-a716-446655440004' },
        ],
      };

      const result = await service.batchSync(dto, 'user1');

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle transaction errors', async () => {
      prisma.syncSubmission.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.$transaction.mockRejectedValue(new Error('Transaction failed'));
      // Mock the fallback create for failed sync
      prisma.syncSubmission.create.mockResolvedValue({ id: 'sync-fail-1' });

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440005' },
        ],
      };

      const result = await service.batchSync(dto, 'user1');

      expect(result.failedCount).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('Transaction failed');
    });

    it('should handle empty submissions array', async () => {
      const dto = { submissions: [] };

      const result = await service.batchSync(dto, 'user1');

      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should generate proper record numbers with incrementing sequences', async () => {
      prisma.syncSubmission.findUnique.mockResolvedValue(null);
      prisma.recordTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.record.findFirst.mockResolvedValue({
        number: `TPL-001-20260216-0003`,
      });
      prisma.syncSubmission.create.mockResolvedValue({ id: 'sync-1' });
      prisma.record.create.mockResolvedValue({ id: 'record-1' });

      const dto = {
        submissions: [
          { formId: 'template-1', data: { field1: 'value1' }, uuid: '550e8400-e29b-41d4-a716-446655440006' },
        ],
      };

      await service.batchSync(dto, 'user1');

      const createCall = prisma.record.create.mock.calls[0][0];
      // The number should end with 0004 since last was 0003
      expect(createCall.data.number).toMatch(/TPL-001-\d{8}-0004/);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status with pending count and last sync time', async () => {
      const lastSyncTime = new Date('2026-02-16T10:00:00Z');
      prisma.syncSubmission.count.mockResolvedValue(3);
      prisma.syncSubmission.findFirst.mockResolvedValue({
        syncedAt: lastSyncTime,
      });

      const result = await service.getSyncStatus('user1');

      expect(result.pendingCount).toBe(3);
      expect(result.lastSyncTime).toEqual(lastSyncTime);
    });

    it('should return null lastSyncTime when no synced records exist', async () => {
      prisma.syncSubmission.count.mockResolvedValue(0);
      prisma.syncSubmission.findFirst.mockResolvedValue(null);

      const result = await service.getSyncStatus('user1');

      expect(result.pendingCount).toBe(0);
      expect(result.lastSyncTime).toBeNull();
    });

    it('should count only failed submissions as pending', async () => {
      prisma.syncSubmission.count.mockResolvedValue(5);
      prisma.syncSubmission.findFirst.mockResolvedValue(null);

      await service.getSyncStatus('user1');

      expect(prisma.syncSubmission.count).toHaveBeenCalledWith({
        where: { userId: 'user1', status: 'failed' },
      });
    });
  });
});
