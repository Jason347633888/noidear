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

@Injectable()
export class EvidenceAttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async attachEvidenceFile(input: AttachEvidenceFileInput): Promise<{ id: string }> {
    if (!(ALLOWED_EVIDENCE_RESOURCE_TYPES as readonly string[]).includes(input.resourceType)) {
      throw new BadRequestException(
        `Invalid resourceType "${input.resourceType}". Allowed: ${ALLOWED_EVIDENCE_RESOURCE_TYPES.join(', ')}`,
      );
    }

    const file = await this.prisma.evidenceFile.findUnique({ where: { id: input.fileId } });
    if (!file) {
      throw new BadRequestException(`EvidenceFile "${input.fileId}" not found`);
    }

    return this.applyAttachment(input);
  }

  private async applyAttachment(input: AttachEvidenceFileInput): Promise<{ id: string }> {
    const { companyId, resourceType, resourceId, fileId } = input;

    switch (resourceType as EvidenceResourceType) {
      case 'measuring_equipment': {
        const row = await this.prisma.measuringEquipment.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`MeasuringEquipment "${resourceId}" not found in company`);
        return this.prisma.measuringEquipment.update({
          where: { id: resourceId },
          data: { external_certificate_file_id: fileId },
          select: { id: true },
        });
      }

      case 'calibration_point_reading': {
        const row = await this.prisma.calibrationPointReading.findFirst({
          where: { id: resourceId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`CalibrationPointReading "${resourceId}" not found`);
        return this.prisma.calibrationPointReading.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'maintenance_record_item': {
        const row = await this.prisma.maintenanceRecordItem.findFirst({
          where: { id: resourceId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`MaintenanceRecordItem "${resourceId}" not found`);
        return this.prisma.maintenanceRecordItem.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'fragile_item': {
        const row = await this.prisma.fragileItemLedger.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`FragileItemLedger "${resourceId}" not found in company`);
        return this.prisma.fragileItemLedger.update({
          where: { id: resourceId },
          data: { risk_assessment_id: fileId },
          select: { id: true },
        });
      }

      case 'fragile_item_usage_return': {
        const row = await this.prisma.fragileItemUsageReturn.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`FragileItemUsageReturn "${resourceId}" not found in company`);
        return this.prisma.fragileItemUsageReturn.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'metal_detection_log': {
        const row = await this.prisma.metalDetectionLog.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`MetalDetectionLog "${resourceId}" not found in company`);
        return this.prisma.metalDetectionLog.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'equipment': {
        // Equipment model has no company_id; lookup by id only (code is globally unique)
        const row = await this.prisma.equipment.findUnique({
          where: { id: resourceId },
          select: { id: true, deletedAt: true },
        });
        if (!row || row.deletedAt) throw new BadRequestException(`Equipment "${resourceId}" not found`);
        return this.prisma.equipment.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'calibration_record': {
        const row = await this.prisma.calibrationRecord.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`CalibrationRecord "${resourceId}" not found in company`);
        return this.prisma.calibrationRecord.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      case 'maintenance_record': {
        const row = await this.prisma.maintenanceRecord.findFirst({
          where: { id: resourceId, company_id: companyId },
          select: { id: true },
        });
        if (!row) throw new BadRequestException(`MaintenanceRecord "${resourceId}" not found in company`);
        return this.prisma.maintenanceRecord.update({
          where: { id: resourceId },
          data: { evidence_file_id: fileId },
          select: { id: true },
        });
      }

      default: {
        throw new BadRequestException(`Unhandled resourceType "${resourceType}"`);
      }
    }
  }
}
