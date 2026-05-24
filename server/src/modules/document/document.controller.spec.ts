import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { FilePreviewService } from './services';
import { DocumentReferenceService } from './services/document-reference.service';
import { RecordFormLandingService } from './services/record-form-landing.service';
import { DocumentReferenceHealthService } from './services/document-reference-health.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { BatchConfirmRecordFormLandingDto, ConfirmRecordFormLandingDto, UpdateRecordFormLandingEntryDto } from './dto/document-control.dto';

describe('DocumentController — record-form-index admin-only write guards', () => {
  let controller: DocumentController;
  let recordFormLandingService: jest.Mocked<Partial<RecordFormLandingService>>;

  const adminOwnership: OwnershipContext = {
    userId: 'u_admin',
    roleCode: 'admin',
    departmentId: null,
    managedDepartmentIds: undefined,
  };

  const userOwnership: OwnershipContext = {
    userId: 'u_user',
    roleCode: 'user',
    departmentId: 'd_001',
    managedDepartmentIds: [],
  };

  const leaderOwnership: OwnershipContext = {
    userId: 'u_leader',
    roleCode: 'leader',
    departmentId: 'd_001',
    managedDepartmentIds: ['d_001'],
  };

  const mockReq = { user: { id: 'u_admin' } };

  beforeEach(async () => {
    recordFormLandingService = {
      list: jest.fn().mockResolvedValue([]),
      get: jest.fn().mockResolvedValue({}),
      batchConfirmSuggested: jest.fn().mockResolvedValue({ confirmed: 1 }),
      confirm: jest.fn().mockResolvedValue({ code: 'F001', confirmationStatus: 'confirmed' }),
      upsertTarget: jest.fn().mockResolvedValue({ code: 'F001' }),
      suggest: jest.fn().mockResolvedValue({}),
      getFieldCoverage: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: DocumentService, useValue: {} },
        { provide: DocumentLifecycleService, useValue: {} },
        { provide: FilePreviewService, useValue: {} },
        { provide: DocumentReferenceService, useValue: {} },
        { provide: RecordFormLandingService, useValue: recordFormLandingService },
        { provide: DocumentReferenceHealthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  // ─── POST /documents/record-form-index/batch-confirm-suggested ───────────────

  describe('batchConfirmRecordFormLanding (POST /documents/record-form-index/batch-confirm-suggested)', () => {
    const dto: BatchConfirmRecordFormLandingDto = { codes: ['F001', 'F002'] };

    it('admin calling batch-confirm-suggested → calls service.batchConfirmSuggested', async () => {
      const result = await controller.batchConfirmRecordFormLanding(dto, mockReq, adminOwnership);
      expect(recordFormLandingService.batchConfirmSuggested).toHaveBeenCalledWith(dto.codes, mockReq.user.id);
      expect(result).toEqual({ confirmed: 1 });
    });

    it('user calling batch-confirm-suggested → throws ForbiddenException', () => {
      expect(() => controller.batchConfirmRecordFormLanding(dto, mockReq, userOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.batchConfirmSuggested).not.toHaveBeenCalled();
    });

    it('leader calling batch-confirm-suggested → throws ForbiddenException', () => {
      expect(() => controller.batchConfirmRecordFormLanding(dto, mockReq, leaderOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.batchConfirmSuggested).not.toHaveBeenCalled();
    });
  });

  // ─── POST /documents/record-form-index/:code/confirm ────────────────────────

  describe('confirmRecordFormLanding (POST /documents/record-form-index/:code/confirm)', () => {
    const dto: ConfirmRecordFormLandingDto = { landingStatus: 'business_module' } as ConfirmRecordFormLandingDto;

    it('admin calling confirm → calls service.confirm', async () => {
      const result = await controller.confirmRecordFormLanding('F001', dto, mockReq, adminOwnership);
      expect(recordFormLandingService.confirm).toHaveBeenCalledWith('F001', dto, mockReq.user.id);
      expect(result).toEqual({ code: 'F001', confirmationStatus: 'confirmed' });
    });

    it('user calling confirm → throws ForbiddenException', () => {
      expect(() => controller.confirmRecordFormLanding('F001', dto, mockReq, userOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.confirm).not.toHaveBeenCalled();
    });

    it('leader calling confirm → throws ForbiddenException', () => {
      expect(() => controller.confirmRecordFormLanding('F001', dto, mockReq, leaderOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.confirm).not.toHaveBeenCalled();
    });
  });

  // ─── PATCH /documents/record-form-index/:code ───────────────────────────────

  describe('updateRecordFormIndexEntry (PATCH /documents/record-form-index/:code)', () => {
    const dto: UpdateRecordFormLandingEntryDto = { targetTemplateId: 'tpl_001' } as UpdateRecordFormLandingEntryDto;

    it('admin calling updateRecordFormIndexEntry → calls service.upsertTarget', async () => {
      const result = await controller.updateRecordFormIndexEntry('F001', dto, adminOwnership);
      expect(recordFormLandingService.upsertTarget).toHaveBeenCalledWith('F001', dto);
      expect(result).toEqual({ code: 'F001' });
    });

    it('user calling updateRecordFormIndexEntry → throws ForbiddenException', () => {
      expect(() => controller.updateRecordFormIndexEntry('F001', dto, userOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.upsertTarget).not.toHaveBeenCalled();
    });

    it('leader calling updateRecordFormIndexEntry → throws ForbiddenException', () => {
      expect(() => controller.updateRecordFormIndexEntry('F001', dto, leaderOwnership)).toThrow(ForbiddenException);
      expect(recordFormLandingService.upsertTarget).not.toHaveBeenCalled();
    });
  });
});
