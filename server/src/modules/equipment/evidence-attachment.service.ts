import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const ALLOWED_EVIDENCE_RESOURCE_TYPES = [
  'equipment',
  'measuring_equipment',
  'calibration_record',
  'calibration_point_reading',
  'maintenance_record',
  'maintenance_record_item',
  'fragile_item',
  'fragile_item_usage_return',
  'metal_detection_log',
] as const;

export type EvidenceResourceType = typeof ALLOWED_EVIDENCE_RESOURCE_TYPES[number];

export interface AttachEvidenceFileInput {
  companyId: string;
  resourceType: string;
  resourceId: string;
  resourceItemId?: string;
  fileId: string;
}

type AttachResult = { id: string };

@Injectable()
export class EvidenceAttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async attachEvidenceFile(input: AttachEvidenceFileInput): Promise<AttachResult> {
    if (!(ALLOWED_EVIDENCE_RESOURCE_TYPES as readonly string[]).includes(input.resourceType)) {
      throw new BadRequestException(
        `Invalid resourceType "${input.resourceType}". Allowed: ${ALLOWED_EVIDENCE_RESOURCE_TYPES.join(', ')}`,
      );
    }

    const file = await this.prisma.evidenceFile.findUnique({ where: { id: input.fileId } });
    if (!file) {
      throw new BadRequestException(`EvidenceFile "${input.fileId}" not found`);
    }

    const dispatch: Record<EvidenceResourceType, () => Promise<AttachResult>> = {
      equipment: () => this.attachToEquipment(input),
      measuring_equipment: () => this.attachToMeasuringEquipment(input),
      calibration_record: () => this.attachToCalibrationRecord(input),
      calibration_point_reading: () => this.attachToCalibrationPointReading(input),
      maintenance_record: () => this.attachToMaintenanceRecord(input),
      maintenance_record_item: () => this.attachToMaintenanceRecordItem(input),
      fragile_item: () => this.attachToFragileItem(input),
      fragile_item_usage_return: () => this.attachToFragileItemUsageReturn(input),
      metal_detection_log: () => this.attachToMetalDetectionLog(input),
    };

    return dispatch[input.resourceType as EvidenceResourceType]();
  }

  private async attachToEquipment(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { resourceId, fileId } = input;
    const row = await this.prisma.equipment.findUnique({
      where: { id: resourceId },
      select: { id: true, deletedAt: true },
    });
    if (!row || row.deletedAt) {
      throw new BadRequestException(`Equipment "${resourceId}" not found`);
    }
    return this.prisma.equipment.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToMeasuringEquipment(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.measuringEquipment.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`MeasuringEquipment "${resourceId}" not found in company`);
    }
    return this.prisma.measuringEquipment.update({
      where: { id: resourceId },
      data: { external_certificate_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToCalibrationRecord(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.calibrationRecord.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`CalibrationRecord "${resourceId}" not found in company`);
    }
    return this.prisma.calibrationRecord.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToCalibrationPointReading(
    input: AttachEvidenceFileInput,
  ): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    // CalibrationPointReading has no company_id; scope via parent CalibrationRecord
    const row = await this.prisma.calibrationPointReading.findFirst({
      where: {
        id: resourceId,
        calibration_record: { company_id: companyId },
      },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`CalibrationPointReading "${resourceId}" not found in company`);
    }
    return this.prisma.calibrationPointReading.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToMaintenanceRecord(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.maintenanceRecord.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`MaintenanceRecord "${resourceId}" not found in company`);
    }
    return this.prisma.maintenanceRecord.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToMaintenanceRecordItem(
    input: AttachEvidenceFileInput,
  ): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    // MaintenanceRecordItem has no company_id; scope via parent MaintenanceRecord
    const row = await this.prisma.maintenanceRecordItem.findFirst({
      where: {
        id: resourceId,
        maintenanceRecord: { company_id: companyId },
      },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`MaintenanceRecordItem "${resourceId}" not found in company`);
    }
    return this.prisma.maintenanceRecordItem.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToFragileItem(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.fragileItemLedger.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`FragileItemLedger "${resourceId}" not found in company`);
    }
    return this.prisma.fragileItemLedger.update({
      where: { id: resourceId },
      data: { risk_assessment_id: fileId },
      select: { id: true },
    });
  }

  private async attachToFragileItemUsageReturn(
    input: AttachEvidenceFileInput,
  ): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.fragileItemUsageReturn.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`FragileItemUsageReturn "${resourceId}" not found in company`);
    }
    return this.prisma.fragileItemUsageReturn.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }

  private async attachToMetalDetectionLog(input: AttachEvidenceFileInput): Promise<AttachResult> {
    const { companyId, resourceId, fileId } = input;
    const row = await this.prisma.metalDetectionLog.findFirst({
      where: { id: resourceId, company_id: companyId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException(`MetalDetectionLog "${resourceId}" not found in company`);
    }
    return this.prisma.metalDetectionLog.update({
      where: { id: resourceId },
      data: { evidence_file_id: fileId },
      select: { id: true },
    });
  }
}
