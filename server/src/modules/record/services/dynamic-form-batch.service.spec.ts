import { Test, TestingModule } from '@nestjs/testing';
import { DynamicFormBatchService } from './dynamic-form-batch.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DynamicFormBatchService', () => {
  let service: DynamicFormBatchService;
  let prisma: PrismaService;

  const mockPrismaService = {
    record: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    recordTemplate: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamicFormBatchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DynamicFormBatchService>(DynamicFormBatchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubmissionsByBatch', () => {
    const formId = 'form-1';
    const batchId = 'batch-1';

    it('should return submissions for a specific batch', async () => {
      const mockTemplate = { id: formId, name: 'Test Form' };
      const mockSubmissions = [
        {
          id: 'record-1',
          templateId: formId,
          dataJson: { batchId: 'batch-1', value: 100 },
        },
        {
          id: 'record-2',
          templateId: formId,
          dataJson: { batchId: 'batch-1', value: 200 },
        },
      ];

      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      prisma.record.findMany = jest.fn().mockResolvedValue(mockSubmissions);
      prisma.record.count = jest.fn().mockResolvedValue(2);

      const result = await service.getSubmissionsByBatch(formId, batchId);

      expect(result.data).toEqual(mockSubmissions);
      expect(result.total).toBe(2);
      expect(prisma.recordTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: formId },
      });
    });

    it('should throw NotFoundException if form template not found', async () => {
      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.getSubmissionsByBatch(formId, batchId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSubmissionsByBatch(formId, batchId),
      ).rejects.toThrow('表单模板不存在');
    });

    it('should return empty array if no submissions found', async () => {
      const mockTemplate = { id: formId, name: 'Test Form' };

      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      prisma.record.findMany = jest.fn().mockResolvedValue([]);
      prisma.record.count = jest.fn().mockResolvedValue(0);

      const result = await service.getSubmissionsByBatch(formId, batchId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should support pagination', async () => {
      const mockTemplate = { id: formId, name: 'Test Form' };
      const mockSubmissions = [
        { id: 'record-3', templateId: formId, dataJson: { batchId } },
      ];

      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      prisma.record.findMany = jest.fn().mockResolvedValue(mockSubmissions);
      prisma.record.count = jest.fn().mockResolvedValue(10);

      const result = await service.getSubmissionsByBatch(formId, batchId, {
        page: 2,
        limit: 5,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(prisma.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should filter by status if provided', async () => {
      const mockTemplate = { id: formId, name: 'Test Form' };
      const mockSubmissions = [
        {
          id: 'record-4',
          status: 'approved',
          dataJson: { batchId },
        },
      ];

      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      prisma.record.findMany = jest.fn().mockResolvedValue(mockSubmissions);
      prisma.record.count = jest.fn().mockResolvedValue(1);

      await service.getSubmissionsByBatch(formId, batchId, {
        status: 'approved',
      });

      expect(prisma.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'approved',
          }),
        }),
      );
    });

    it('should exclude deleted submissions', async () => {
      const mockTemplate = { id: formId, name: 'Test Form' };
      const mockSubmissions: any[] = [];

      prisma.recordTemplate.findUnique = jest.fn().mockResolvedValue(mockTemplate);
      prisma.record.findMany = jest.fn().mockResolvedValue(mockSubmissions);
      prisma.record.count = jest.fn().mockResolvedValue(0);

      await service.getSubmissionsByBatch(formId, batchId);

      expect(prisma.record.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
