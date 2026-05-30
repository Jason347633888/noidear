import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RetainedSampleService } from './retained-sample.service';

const COMPANY_ID = 'company-1';

const mockProductSample = {
  id: 'rs-1',
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

const mockMaterialSample = {
  ...mockProductSample,
  id: 'rs-2',
  sample_type: 'material',
  product_id: null,
  material_batch_id: 'mb-1',
  production_batch_id: null,
  sample_code: 'RS-20260530-002',
};

describe('RetainedSampleService', () => {
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
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetainedSampleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RetainedSampleService>(RetainedSampleService);
  });

  describe('createRetainedSample', () => {
    it('should create a product-type sample with product_id', async () => {
      prisma.retainedSample.create.mockResolvedValue(mockProductSample);

      const result = await service.createRetainedSample({
        company_id: COMPANY_ID,
        sample_type: 'product',
        product_id: 'prod-1',
        sample_code: 'RS-20260530-001',
        sample_qty: 0.5,
        unit: 'kg',
        retained_at: new Date('2026-05-30T08:00:00Z'),
        retention_period: '90d',
        storage_condition: 'refrigerated',
      });

      expect(result).toEqual(mockProductSample);
      expect(prisma.retainedSample.create).toHaveBeenCalled();
    });

    it('should create a product-type sample with production_batch_id instead of product_id', async () => {
      const sampleWithBatch = {
        ...mockProductSample,
        product_id: null,
        production_batch_id: 'pb-1',
      };
      prisma.retainedSample.create.mockResolvedValue(sampleWithBatch);

      const result = await service.createRetainedSample({
        company_id: COMPANY_ID,
        sample_type: 'product',
        production_batch_id: 'pb-1',
        sample_code: 'RS-20260530-001',
        sample_qty: 0.5,
        unit: 'kg',
        retained_at: new Date('2026-05-30T08:00:00Z'),
      });

      expect(result.production_batch_id).toBe('pb-1');
    });

    it('should throw BadRequestException when product-type sample has no product_id or production_batch_id', async () => {
      await expect(
        service.createRetainedSample({
          company_id: COMPANY_ID,
          sample_type: 'product',
          sample_code: 'RS-BAD',
          sample_qty: 0.5,
          unit: 'kg',
          retained_at: new Date('2026-05-30T08:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a material-type sample with material_batch_id', async () => {
      prisma.retainedSample.create.mockResolvedValue(mockMaterialSample);

      const result = await service.createRetainedSample({
        company_id: COMPANY_ID,
        sample_type: 'material',
        material_batch_id: 'mb-1',
        sample_code: 'RS-20260530-002',
        sample_qty: 0.2,
        unit: 'kg',
        retained_at: new Date('2026-05-30T08:00:00Z'),
      });

      expect(result).toEqual(mockMaterialSample);
    });

    it('should throw BadRequestException when material-type sample has no material_batch_id', async () => {
      await expect(
        service.createRetainedSample({
          company_id: COMPANY_ID,
          sample_type: 'material',
          sample_code: 'RS-BAD',
          sample_qty: 0.2,
          unit: 'kg',
          retained_at: new Date('2026-05-30T08:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when packaging-type sample has no material_batch_id', async () => {
      await expect(
        service.createRetainedSample({
          company_id: COMPANY_ID,
          sample_type: 'packaging',
          sample_code: 'RS-BAD',
          sample_qty: 0.1,
          unit: 'piece',
          retained_at: new Date('2026-05-30T08:00:00Z'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should derive expires_at from retained_at and retention_period in days', async () => {
      let capturedData: any;
      prisma.retainedSample.create.mockImplementation((args: any) => {
        capturedData = args.data;
        return Promise.resolve({ ...mockProductSample, expires_at: capturedData.expires_at });
      });

      await service.createRetainedSample({
        company_id: COMPANY_ID,
        sample_type: 'product',
        product_id: 'prod-1',
        sample_code: 'RS-20260530-001',
        sample_qty: 0.5,
        unit: 'kg',
        retained_at: new Date('2026-05-30T00:00:00Z'),
        retention_period: '90d',
      });

      // expires_at should be retained_at + 90 days
      const expectedExpiry = new Date('2026-05-30T00:00:00Z');
      expectedExpiry.setDate(expectedExpiry.getDate() + 90);
      expect(capturedData.expires_at.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should use explicit expires_at when provided', async () => {
      const explicitExpiry = new Date('2026-12-31T00:00:00Z');
      let capturedData: any;
      prisma.retainedSample.create.mockImplementation((args: any) => {
        capturedData = args.data;
        return Promise.resolve({ ...mockProductSample, expires_at: capturedData.expires_at });
      });

      await service.createRetainedSample({
        company_id: COMPANY_ID,
        sample_type: 'product',
        product_id: 'prod-1',
        sample_code: 'RS-20260530-001',
        sample_qty: 0.5,
        unit: 'kg',
        retained_at: new Date('2026-05-30T00:00:00Z'),
        retention_period: '90d',
        expires_at: explicitExpiry,
      });

      expect(capturedData.expires_at.getTime()).toBe(explicitExpiry.getTime());
    });
  });

  describe('disposeRetainedSample', () => {
    it('should dispose a retained sample', async () => {
      const disposedSample = {
        ...mockProductSample,
        status: 'disposed',
        disposal_action: 'destroyed',
        disposed_at: new Date('2026-08-29T00:00:00Z'),
      };
      prisma.retainedSample.findFirst.mockResolvedValue(mockProductSample);
      prisma.retainedSample.update.mockResolvedValue(disposedSample);

      const result = await service.disposeRetainedSample(
        'rs-1',
        COMPANY_ID,
        'destroyed',
        new Date('2026-08-29T00:00:00Z'),
      );

      expect(result.status).toBe('disposed');
      expect(result.disposal_action).toBe('destroyed');
      expect(prisma.retainedSample.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rs-1' },
          data: expect.objectContaining({
            status: 'disposed',
            disposal_action: 'destroyed',
          }),
        }),
      );
    });

    it('should throw NotFoundException when sample does not exist', async () => {
      prisma.retainedSample.findFirst.mockResolvedValue(null);

      await expect(
        service.disposeRetainedSample('nonexistent', COMPANY_ID, 'destroyed', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to dispose an already disposed sample', async () => {
      prisma.retainedSample.findFirst.mockResolvedValue({
        ...mockProductSample,
        status: 'disposed',
      });

      await expect(
        service.disposeRetainedSample('rs-1', COMPANY_ID, 'destroyed', new Date()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listRetainedSamples', () => {
    it('should return paginated list of retained samples', async () => {
      prisma.retainedSample.findMany.mockResolvedValue([mockProductSample]);
      prisma.retainedSample.count.mockResolvedValue(1);

      const result = await service.listRetainedSamples({
        company_id: COMPANY_ID,
        page: 1,
        limit: 20,
      });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter by sample_type', async () => {
      prisma.retainedSample.findMany.mockResolvedValue([mockProductSample]);
      prisma.retainedSample.count.mockResolvedValue(1);

      await service.listRetainedSamples({
        company_id: COMPANY_ID,
        sample_type: 'product',
      });

      expect(prisma.retainedSample.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sample_type: 'product' }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.retainedSample.findMany.mockResolvedValue([mockProductSample]);
      prisma.retainedSample.count.mockResolvedValue(1);

      await service.listRetainedSamples({
        company_id: COMPANY_ID,
        status: 'retained',
      });

      expect(prisma.retainedSample.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'retained' }),
        }),
      );
    });
  });
});
