import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductValidationService } from './product-validation.service';

const COMPANY_ID = 'company-test';
const PRODUCT_ID = 'prod-001';
const RECIPE_ID = 'recipe-001';
const INSPECTION_RECORD_ID = 'insp-001';
const CHANGE_EVENT_ID = 'change-001';
const EVIDENCE_FILE_ID = 'file-001';
const APPROVAL_INSTANCE_ID = 'approval-001';
const USER_ID = 'user-001';
const RECORD_ID = 'val-001';

const makeRecord = (overrides: Record<string, unknown> = {}) => ({
  id: RECORD_ID,
  company_id: COMPANY_ID,
  product_id: PRODUCT_ID,
  recipe_id: null,
  validation_type: 'initial',
  inspection_record_id: null,
  change_event_id: null,
  conclusion: 'pending',
  conclusion_by: null,
  concluded_at: null,
  evidence_file_id: null,
  created_at: new Date(),
  ...overrides,
});

describe('ProductValidationService', () => {
  let service: ProductValidationService;

  const mockPrisma = {
    productValidationRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    inspectionRecord: {
      findUnique: jest.fn(),
    },
    inspectionRecordItem: {
      findMany: jest.fn(),
    },
    approvalInstance: {
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductValidationService(mockPrisma as any);
  });

  // ── createValidationRecord ────────────────────────────────────────────────

  describe('createValidationRecord', () => {
    it('creates a validation record linking product, recipe, inspection record, and evidence', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: COMPANY_ID,
      });
      mockPrisma.productValidationRecord.create.mockResolvedValue(
        makeRecord({
          recipe_id: RECIPE_ID,
          inspection_record_id: INSPECTION_RECORD_ID,
          evidence_file_id: EVIDENCE_FILE_ID,
        }),
      );

      const result = await service.createValidationRecord(COMPANY_ID, {
        product_id: PRODUCT_ID,
        recipe_id: RECIPE_ID,
        validation_type: 'initial',
        inspection_record_id: INSPECTION_RECORD_ID,
        evidence_file_id: EVIDENCE_FILE_ID,
      });

      expect(mockPrisma.productValidationRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            company_id: COMPANY_ID,
            product_id: PRODUCT_ID,
            recipe_id: RECIPE_ID,
            inspection_record_id: INSPECTION_RECORD_ID,
            evidence_file_id: EVIDENCE_FILE_ID,
            conclusion: 'pending',
          }),
        }),
      );
      expect(result.recipe_id).toBe(RECIPE_ID);
      expect(result.inspection_record_id).toBe(INSPECTION_RECORD_ID);
    });

    it('creates a validation record linking change event', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      mockPrisma.productValidationRecord.create.mockResolvedValue(
        makeRecord({ change_event_id: CHANGE_EVENT_ID }),
      );

      const result = await service.createValidationRecord(COMPANY_ID, {
        product_id: PRODUCT_ID,
        validation_type: 'change_verification',
        change_event_id: CHANGE_EVENT_ID,
      });

      expect(mockPrisma.productValidationRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ change_event_id: CHANGE_EVENT_ID }),
        }),
      );
      expect(result.change_event_id).toBe(CHANGE_EVENT_ID);
    });

    it('does not store raw inspection item values', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: COMPANY_ID,
      });
      const created = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.create.mockResolvedValue(created);

      const result = await service.createValidationRecord(COMPANY_ID, {
        product_id: PRODUCT_ID,
        validation_type: 'initial',
        inspection_record_id: INSPECTION_RECORD_ID,
      });

      // The result record should only reference the inspection record by ID, not embed item values
      expect(result).not.toHaveProperty('inspection_items');
      expect(result).not.toHaveProperty('raw_values');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.createValidationRecord(COMPANY_ID, {
          product_id: PRODUCT_ID,
          validation_type: 'initial',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when inspection_record_id is provided but does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.createValidationRecord(COMPANY_ID, {
          product_id: PRODUCT_ID,
          validation_type: 'initial',
          inspection_record_id: INSPECTION_RECORD_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when inspection_record_id belongs to a different company', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: 'other-company',
      });

      await expect(
        service.createValidationRecord(COMPANY_ID, {
          product_id: PRODUCT_ID,
          validation_type: 'initial',
          inspection_record_id: INSPECTION_RECORD_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── concludeValidation ────────────────────────────────────────────────────

  describe('concludeValidation', () => {
    it('allows pass conclusion when inspection record has no failed items', async () => {
      const record = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      // Inspection record exists and belongs to the same company
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: COMPANY_ID,
      });
      // Service queries only items with judgment='fail'; return empty when none are failing
      mockPrisma.inspectionRecordItem.findMany.mockResolvedValue([]);
      mockPrisma.productValidationRecord.update.mockResolvedValue({
        ...record,
        conclusion: 'pass',
        conclusion_by: USER_ID,
        concluded_at: new Date(),
      });

      const result = await service.concludeValidation(RECORD_ID, COMPANY_ID, {
        conclusion: 'pass',
        conclusion_by: USER_ID,
      });

      expect(result.conclusion).toBe('pass');
    });

    it('blocks pass conclusion when linked inspection record has failed items', async () => {
      const record = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      // Inspection record exists and belongs to the same company
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: COMPANY_ID,
      });
      // Service queries only items with judgment='fail'; mock returns the failing items
      mockPrisma.inspectionRecordItem.findMany.mockResolvedValue([
        { id: 'item-2', judgment: 'fail' },
      ]);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'pass',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows fail conclusion even when inspection record has failed items', async () => {
      const record = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      // For 'fail' conclusion the service does not query inspection items - no mock needed here
      mockPrisma.productValidationRecord.update.mockResolvedValue({
        ...record,
        conclusion: 'fail',
        conclusion_by: USER_ID,
        concluded_at: new Date(),
      });

      const result = await service.concludeValidation(RECORD_ID, COMPANY_ID, {
        conclusion: 'fail',
        conclusion_by: USER_ID,
      });

      expect(result.conclusion).toBe('fail');
    });

    it('requires approvalInstanceId when conclusion is conditional', async () => {
      const record = makeRecord({ inspection_record_id: null });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'conditional',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows conditional conclusion when approvalInstanceId is provided', async () => {
      const record = makeRecord({ inspection_record_id: null });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      mockPrisma.approvalInstance.findUnique.mockResolvedValue({ id: APPROVAL_INSTANCE_ID });
      mockPrisma.productValidationRecord.update.mockResolvedValue({
        ...record,
        conclusion: 'conditional',
        conclusion_by: USER_ID,
        concluded_at: new Date(),
      });

      const result = await service.concludeValidation(RECORD_ID, COMPANY_ID, {
        conclusion: 'conditional',
        conclusion_by: USER_ID,
        approvalInstanceId: APPROVAL_INSTANCE_ID,
      });

      expect(result.conclusion).toBe('conditional');
    });

    it('throws BadRequestException for invalid conclusion value', async () => {
      const record = makeRecord();
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'invalid_conclusion',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when validation record does not exist', async () => {
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'pass',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows pass conclusion when no inspection record is linked', async () => {
      const record = makeRecord({ inspection_record_id: null });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      mockPrisma.productValidationRecord.update.mockResolvedValue({
        ...record,
        conclusion: 'pass',
        conclusion_by: USER_ID,
        concluded_at: new Date(),
      });

      const result = await service.concludeValidation(RECORD_ID, COMPANY_ID, {
        conclusion: 'pass',
        conclusion_by: USER_ID,
      });

      expect(result.conclusion).toBe('pass');
      // Should not have queried inspection items since no inspection_record_id
      expect(mockPrisma.inspectionRecordItem.findMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when record is already concluded (re-conclusion guard)', async () => {
      const record = makeRecord({
        conclusion: 'pass',
        concluded_at: new Date(),
      });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'fail',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when inspection_record_id points to a non-existent record', async () => {
      const record = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      // The InspectionRecord does not exist
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'pass',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when inspection_record_id belongs to a different company', async () => {
      const record = makeRecord({ inspection_record_id: INSPECTION_RECORD_ID });
      mockPrisma.productValidationRecord.findUnique.mockResolvedValue(record);
      // InspectionRecord exists but belongs to a different company
      mockPrisma.inspectionRecord.findUnique.mockResolvedValue({
        id: INSPECTION_RECORD_ID,
        company_id: 'other-company',
      });

      await expect(
        service.concludeValidation(RECORD_ID, COMPANY_ID, {
          conclusion: 'pass',
          conclusion_by: USER_ID,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── listValidationRecords ─────────────────────────────────────────────────

  describe('listValidationRecords', () => {
    it('returns validation records for a product filtered by type', async () => {
      const records = [makeRecord({ validation_type: 'initial' })];
      mockPrisma.productValidationRecord.findMany.mockResolvedValue(records);

      const result = await service.listValidationRecords(COMPANY_ID, PRODUCT_ID, 'initial');

      expect(mockPrisma.productValidationRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: COMPANY_ID,
            product_id: PRODUCT_ID,
            validation_type: 'initial',
          }),
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('returns all validation records when no type filter', async () => {
      const records = [
        makeRecord({ validation_type: 'initial' }),
        makeRecord({ id: 'val-002', validation_type: 'change_verification' }),
      ];
      mockPrisma.productValidationRecord.findMany.mockResolvedValue(records);

      const result = await service.listValidationRecords(COMPANY_ID, PRODUCT_ID);

      expect(result).toHaveLength(2);
    });
  });
});
