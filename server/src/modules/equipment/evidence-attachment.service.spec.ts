import { BadRequestException } from '@nestjs/common';
import { EvidenceAttachmentService, ALLOWED_EVIDENCE_RESOURCE_TYPES } from './evidence-attachment.service';

const makePrisma = () => ({
  evidenceFile: {
    findUnique: jest.fn(),
  },
  measuringEquipment: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  calibrationPointReading: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  maintenanceRecordItem: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  fragileItemLedger: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  metalDetectionLog: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  equipment: {
    update: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  calibrationRecord: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  maintenanceRecord: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  fragileItemUsageReturn: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
});

describe('EvidenceAttachmentService', () => {
  let service: EvidenceAttachmentService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new EvidenceAttachmentService(prisma as any);
  });

  describe('ALLOWED_EVIDENCE_RESOURCE_TYPES', () => {
    it('includes all required resource types', () => {
      const required = [
        'equipment',
        'measuring_equipment',
        'calibration_record',
        'calibration_point_reading',
        'maintenance_record',
        'maintenance_record_item',
        'fragile_item',
        'fragile_item_usage_return',
        'metal_detection_log',
      ];
      for (const type of required) {
        expect(ALLOWED_EVIDENCE_RESOURCE_TYPES).toContain(type);
      }
    });
  });

  describe('attachEvidenceFile', () => {
    it('throws BadRequestException for unknown resourceType', async () => {
      await expect(
        service.attachEvidenceFile({
          companyId: 'c-1',
          resourceType: 'unknown_type',
          resourceId: 'r-1',
          fileId: 'f-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when EvidenceFile not found', async () => {
      prisma.evidenceFile.findUnique.mockResolvedValue(null);

      await expect(
        service.attachEvidenceFile({
          companyId: 'c-1',
          resourceType: 'measuring_equipment',
          resourceId: 'me-1',
          fileId: 'file-missing',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets external_certificate_file_id on MeasuringEquipment for resourceType=measuring_equipment', async () => {
      const mockFile = { id: 'f-1', company_id: 'c-1', resourceType: 'measuring_equipment', resourceId: 'me-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.measuringEquipment.findFirst.mockResolvedValue({ id: 'me-1', company_id: 'c-1' });
      prisma.measuringEquipment.update.mockResolvedValue({ id: 'me-1', external_certificate_file_id: 'f-1' });

      const result = await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'measuring_equipment',
        resourceId: 'me-1',
        fileId: 'f-1',
      });

      expect(prisma.measuringEquipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'me-1' },
          data: { external_certificate_file_id: 'f-1' },
        }),
      );
      expect(result).toBeDefined();
    });

    it('sets evidence_file_id on CalibrationPointReading for resourceType=calibration_point_reading', async () => {
      const mockFile = { id: 'f-2', company_id: 'c-1', resourceType: 'calibration_point_reading', resourceId: 'cpr-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.calibrationPointReading.findFirst.mockResolvedValue({ id: 'cpr-1' });
      prisma.calibrationPointReading.update.mockResolvedValue({ id: 'cpr-1', evidence_file_id: 'f-2' });

      await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'calibration_point_reading',
        resourceId: 'cpr-1',
        fileId: 'f-2',
      });

      expect(prisma.calibrationPointReading.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cpr-1' },
          data: { evidence_file_id: 'f-2' },
        }),
      );
    });

    it('sets evidence_file_id on MaintenanceRecordItem for resourceType=maintenance_record_item', async () => {
      const mockFile = { id: 'f-3', company_id: 'c-1', resourceType: 'maintenance_record_item', resourceId: 'mri-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.maintenanceRecordItem.findFirst.mockResolvedValue({ id: 'mri-1' });
      prisma.maintenanceRecordItem.update.mockResolvedValue({ id: 'mri-1', evidence_file_id: 'f-3' });

      await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'maintenance_record_item',
        resourceId: 'mri-1',
        fileId: 'f-3',
      });

      expect(prisma.maintenanceRecordItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mri-1' },
          data: { evidence_file_id: 'f-3' },
        }),
      );
    });

    it('sets risk_assessment_id on FragileItemLedger for resourceType=fragile_item', async () => {
      const mockFile = { id: 'f-4', company_id: 'c-1', resourceType: 'fragile_item', resourceId: 'fi-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.fragileItemLedger.findFirst.mockResolvedValue({ id: 'fi-1', company_id: 'c-1' });
      prisma.fragileItemLedger.update.mockResolvedValue({ id: 'fi-1', risk_assessment_id: 'f-4' });

      await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'fragile_item',
        resourceId: 'fi-1',
        fileId: 'f-4',
      });

      expect(prisma.fragileItemLedger.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fi-1' },
          data: { risk_assessment_id: 'f-4' },
        }),
      );
    });

    it('sets evidence_file_id on MetalDetectionLog for resourceType=metal_detection_log', async () => {
      const mockFile = { id: 'f-5', company_id: 'c-1', resourceType: 'metal_detection_log', resourceId: 'mdl-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.metalDetectionLog.findFirst.mockResolvedValue({ id: 'mdl-1', company_id: 'c-1' });
      prisma.metalDetectionLog.update.mockResolvedValue({ id: 'mdl-1', evidence_file_id: 'f-5' });

      await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'metal_detection_log',
        resourceId: 'mdl-1',
        fileId: 'f-5',
      });

      expect(prisma.metalDetectionLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mdl-1' },
          data: { evidence_file_id: 'f-5' },
        }),
      );
    });

    it('sets evidence_file_id on FragileItemUsageReturn for resourceType=fragile_item_usage_return', async () => {
      const mockFile = { id: 'f-6', company_id: 'c-1', resourceType: 'fragile_item_usage_return', resourceId: 'fur-1' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.fragileItemUsageReturn.findFirst.mockResolvedValue({ id: 'fur-1', company_id: 'c-1' });
      prisma.fragileItemUsageReturn.update.mockResolvedValue({ id: 'fur-1', evidence_file_id: 'f-6' });

      await service.attachEvidenceFile({
        companyId: 'c-1',
        resourceType: 'fragile_item_usage_return',
        resourceId: 'fur-1',
        fileId: 'f-6',
      });

      expect(prisma.fragileItemUsageReturn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fur-1' },
          data: { evidence_file_id: 'f-6' },
        }),
      );
    });

    it('throws BadRequestException when target row not found (company isolation enforced)', async () => {
      const mockFile = { id: 'f-7', company_id: 'c-1', resourceType: 'measuring_equipment', resourceId: 'me-x' };
      prisma.evidenceFile.findUnique.mockResolvedValue(mockFile);
      prisma.measuringEquipment.findFirst.mockResolvedValue(null);

      await expect(
        service.attachEvidenceFile({
          companyId: 'c-1',
          resourceType: 'measuring_equipment',
          resourceId: 'me-x',
          fileId: 'f-7',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.measuringEquipment.update).not.toHaveBeenCalled();
    });
  });
});
