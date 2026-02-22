import { Test, TestingModule } from '@nestjs/testing';
import { DynamicFormBatchController } from './dynamic-form-batch.controller';
import { DynamicFormBatchService } from '../services/dynamic-form-batch.service';
import { NotFoundException } from '@nestjs/common';

describe('DynamicFormBatchController', () => {
  let controller: DynamicFormBatchController;
  let service: DynamicFormBatchService;

  const mockService = {
    getSubmissionsByBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicFormBatchController],
      providers: [
        {
          provide: DynamicFormBatchService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DynamicFormBatchController>(
      DynamicFormBatchController,
    );
    service = module.get<DynamicFormBatchService>(DynamicFormBatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubmissionsByBatch', () => {
    const formId = 'form-1';
    const batchId = 'batch-1';

    it('should return submissions successfully', async () => {
      const mockResult = {
        data: [{ id: 'record-1', dataJson: { batchId: 'batch-1' } }],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockService.getSubmissionsByBatch.mockResolvedValue(mockResult);

      const result = await controller.getSubmissionsByBatch(
        formId,
        batchId,
      );

      expect(result).toEqual(mockResult);
      expect(service.getSubmissionsByBatch).toHaveBeenCalledWith(
        formId,
        batchId,
        { page: undefined, limit: undefined, status: undefined },
      );
    });

    it('should throw NotFoundException when template not found', async () => {
      mockService.getSubmissionsByBatch.mockRejectedValue(
        new NotFoundException('表单模板不存在'),
      );

      await expect(
        controller.getSubmissionsByBatch(formId, batchId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should support pagination parameters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 2,
        limit: 20,
      };

      mockService.getSubmissionsByBatch.mockResolvedValue(mockResult);

      await controller.getSubmissionsByBatch(
        formId,
        batchId,
        2,
        20,
        'approved',
      );

      expect(service.getSubmissionsByBatch).toHaveBeenCalledWith(
        formId,
        batchId,
        { page: 2, limit: 20, status: 'approved' },
      );
    });
  });
});
