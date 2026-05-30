import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RetainedSampleService } from './retained-sample.service';

const COMPANY_ID = 'company-1';
const SAMPLE_ID = 'rs-1';
const INSPECTION_RECORD_ID = 'ir-1';
const SAMPLE_INSPECTION_ID = 'rsi-1';

const mockRetainedSample = {
  id: SAMPLE_ID,
  company_id: COMPANY_ID,
  sample_type: 'product',
  product_id: 'prod-1',
  material_batch_id: null,
  production_batch_id: null,
  sample_code: 'RS-20260530-001',
  sample_qty: '0.5',
  unit: 'kg',
  retained_at: new Date('2026-05-30T08:00:00Z'),
  retention_period: '90d',
  expires_at: new Date('2026-08-28T08:00:00Z'),
  storage_condition: 'refrigerated',
  storage_area_id: null,
  status: 'retained',
  disposal_action: null,
  disposed_at: null,
  appeared_in_source_forms: [],
  source_form_version: null,
  source_form_field_group: null,
  created_at: new Date('2026-05-30T08:00:00Z'),
  updated_at: new Date('2026-05-30T08:00:00Z'),
  inspections: [],
};

const mockInspectionRecord = {
  id: INSPECTION_RECORD_ID,
  company_id: COMPANY_ID,
  object_type: 'retained_sample',
  object_id: SAMPLE_ID,
  overall_result: 'pass',
  status: 'submitted',
  items: [],
};

const mockSampleInspection = {
  id: SAMPLE_INSPECTION_ID,
  retained_sample_id: SAMPLE_ID,
  inspection_type: 'visual',
  inspection_record_id: INSPECTION_RECORD_ID,
  processed_disposition: null,
  processed_at: null,
  processed_by: null,
  created_at: new Date('2026-05-30T10:00:00Z'),
};

describe('RetainedSampleService - createInspectionForSample', () => {
  let service: RetainedSampleService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      retainedSample: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      retainedSampleInspection: {
        create: jest.fn(),
        update: jest.fn(),
      },
      inspectionRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetainedSampleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RetainedSampleService>(RetainedSampleService);
  });

  describe('createInspectionForSample', () => {
    it('should create an InspectionRecord with object_type=retained_sample and a RetainedSampleInspection', async () => {
      prisma.retainedSample.findFirst.mockResolvedValue(mockRetainedSample);
      prisma.inspectionRecord.create.mockResolvedValue(mockInspectionRecord);
      prisma.retainedSampleInspection.create.mockResolvedValue(mockSampleInspection);
      prisma.retainedSample.update.mockResolvedValue({
        ...mockRetainedSample,
        status: 'inspecting',
        inspections: [mockSampleInspection],
      });

      const result = await service.createInspectionForSample(
        SAMPLE_ID,
        {
          inspection_type: 'visual',
          inspection_record_id: INSPECTION_RECORD_ID,
        },
        COMPANY_ID,
      );

      expect(prisma.inspectionRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            object_type: 'retained_sample',
            object_id: SAMPLE_ID,
          }),
        }),
      );
      expect(prisma.retainedSampleInspection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            retained_sample_id: SAMPLE_ID,
            inspection_type: 'visual',
            inspection_record_id: INSPECTION_RECORD_ID,
          }),
        }),
      );
      expect(prisma.retainedSample.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SAMPLE_ID },
          data: expect.objectContaining({ status: 'inspecting' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when sample is disposed', async () => {
      prisma.retainedSample.findFirst.mockResolvedValue({
        ...mockRetainedSample,
        status: 'disposed',
      });

      await expect(
        service.createInspectionForSample(
          SAMPLE_ID,
          {
            inspection_type: 'visual',
            inspection_record_id: INSPECTION_RECORD_ID,
          },
          COMPANY_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when sample does not exist', async () => {
      prisma.retainedSample.findFirst.mockResolvedValue(null);

      await expect(
        service.createInspectionForSample(
          'nonexistent',
          {
            inspection_type: 'visual',
            inspection_record_id: INSPECTION_RECORD_ID,
          },
          COMPANY_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeInspectionForSample', () => {
    it('should set processed_disposition and restore sample status to retained', async () => {
      const existingInspection = {
        ...mockSampleInspection,
        retained_sample: mockRetainedSample,
      };
      prisma.retainedSampleInspection.update.mockResolvedValue({
        ...existingInspection,
        processed_disposition: 'continue_storage',
        processed_at: new Date(),
        processed_by: 'user-1',
      });
      prisma.retainedSample.update.mockResolvedValue({
        ...mockRetainedSample,
        status: 'retained',
      });

      const result = await service.completeInspectionForSample(
        SAMPLE_INSPECTION_ID,
        {
          processed_disposition: 'continue_storage',
          processed_by: 'user-1',
        },
        SAMPLE_ID,
        COMPANY_ID,
      );

      expect(prisma.retainedSampleInspection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SAMPLE_INSPECTION_ID },
          data: expect.objectContaining({
            processed_disposition: 'continue_storage',
            processed_by: 'user-1',
          }),
        }),
      );
      expect(prisma.retainedSample.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SAMPLE_ID },
          data: expect.objectContaining({ status: 'retained' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when processed_disposition is missing', async () => {
      await expect(
        service.completeInspectionForSample(
          SAMPLE_INSPECTION_ID,
          {
            processed_disposition: '',
            processed_by: 'user-1',
          },
          SAMPLE_ID,
          COMPANY_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
