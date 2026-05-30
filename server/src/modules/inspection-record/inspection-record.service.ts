import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';
import { CreateInspectionRecordDto } from './dto/create-inspection-record.dto';
import {
  INSPECTION_OBJECT_COMPATIBILITY,
  PRODUCT_PRESET_OBJECT_TYPE,
  ProductInspectionPresetCode,
} from './inspection-record.constants';

/**
 * Maps each specialty preset code to the InspectionStandard.applies_to value
 * that is expected for the corresponding standard. This allows callers to
 * supply a human-readable preset code (e.g. "WATER_QUALITY") instead of
 * looking up the standard_id themselves.
 */
const PRESET_CODE_APPLIES_TO: Record<string, string> = {
  WATER_QUALITY:      'water',
  ENV_MICROBIOLOGY:   'area_point',
  PEST_CONTROL:       'area_point',
  HYGIENE_INSPECTION: 'area_point',
  VEHICLE_SANITATION: 'vehicle',
  ALLERGEN_TEST:      'area_point',
};

type InspectionRecordWithItems = Prisma.InspectionRecordGetPayload<{
  include: { items: true };
}>;

type TxClient = Prisma.TransactionClient;

@Injectable()
export class InspectionRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async create(dto: CreateInspectionRecordDto) {
    return this.prisma.$transaction(async (tx) => {
      return this.createInTransaction(tx, dto);
    });
  }

  /**
   * Resolves an active InspectionStandard by company_id + preset code, validates
   * object-type compatibility, then delegates to the standard create() path.
   *
   * @param companyId    Tenant identifier
   * @param presetCode   One of the PRESET_CODE_APPLIES_TO keys (e.g. "WATER_QUALITY")
   * @param objectType   The object_type for the InspectionRecord
   * @param objectId     The target object identifier
   * @param input        Remaining CreateInspectionRecordDto fields (items, dates, etc.)
   */
  async createFromPreset(
    companyId: string,
    presetCode: string,
    objectType: string,
    objectId: string,
    input: CreateInspectionRecordDto,
  ): Promise<InspectionRecordWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const standard = await tx.inspectionStandard.findFirst({
        where: { company_id: companyId, code: presetCode, status: 'active' },
        select: { id: true, applies_to: true },
      });

      if (!standard) {
        throw new BadRequestException(
          `No active InspectionStandard found for preset code "${presetCode}" in company "${companyId}"`,
        );
      }

      const allowed = INSPECTION_OBJECT_COMPATIBILITY[standard.applies_to];
      if (allowed && !allowed.includes(objectType)) {
        throw new BadRequestException(
          `object_type "${objectType}" is not compatible with preset "${presetCode}" ` +
            `(standard applies_to "${standard.applies_to}"). Allowed: ${allowed.join(', ')}`,
        );
      }

      const dto: CreateInspectionRecordDto = {
        ...input,
        company_id: companyId,
        inspectionStandardId: standard.id,
        objectType,
        objectId,
      };

      return this.createInTransaction(tx, dto);
    });
  }

  /**
   * Creates a product inspection record for the given production batch.
   * The standardCode must be one of the PRODUCT_INSPECTION_PRESET_CODES values
   * (e.g. "PRODUCT_INSPECTION", "PRE_RELEASE_INSPECTION").
   * The record is always created with object_type derived from PRODUCT_PRESET_OBJECT_TYPE.
   */
  async createProductInspectionRecord(
    productionBatchId: string,
    standardCode: ProductInspectionPresetCode,
    input: CreateInspectionRecordDto,
  ): Promise<InspectionRecordWithItems> {
    const objectType = PRODUCT_PRESET_OBJECT_TYPE[standardCode];
    return this.createFromPreset(
      input.company_id,
      standardCode,
      objectType,
      productionBatchId,
      input,
    );
  }

  /**
   * Creates a semifinished product inspection record for the given production batch.
   * Delegates to createFromPreset using object_type derived from PRODUCT_PRESET_OBJECT_TYPE.
   */
  async createSemifinishedInspectionRecord(
    productionBatchId: string,
    standardCode: ProductInspectionPresetCode,
    input: CreateInspectionRecordDto,
  ): Promise<InspectionRecordWithItems> {
    const objectType = PRODUCT_PRESET_OBJECT_TYPE[standardCode];
    return this.createFromPreset(
      input.company_id,
      standardCode,
      objectType,
      productionBatchId,
      input,
    );
  }

  private async createInTransaction(tx: TxClient, dto: CreateInspectionRecordDto) {
    if (dto.inspectionStandardId) {
      await this.validateObjectTypeCompatibility(tx, dto.inspectionStandardId, dto.objectType);
    }

    const overallResult = dto.items.some((i) => i.judgment === 'fail') ? 'fail' : 'pass';

    const record = await tx.inspectionRecord.create({
      data: {
        company_id: dto.company_id,
        standard_id: dto.inspectionStandardId ?? null,
        object_type: dto.objectType,
        object_id: dto.objectId,
        inspected_at: new Date(dto.inspectedAt),
        inspector_id: dto.inspectorId ?? null,
        overall_result: overallResult,
        status: 'submitted',
        source_task_id: dto.sourceTaskId ?? null,
        items: {
          create: dto.items.map((item) => ({
            inspection_item_id: item.inspectionItemId ?? null,
            item_name: item.itemName,
            actual_value: item.actualValue ?? null,
            unit: item.unit ?? null,
            text_result: item.textResult ?? null,
            judgment: item.judgment,
            standard_snapshot:
              item.standardSnapshot != null
                ? (item.standardSnapshot as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            remark: item.remark ?? null,
            evidence_file_id: item.evidenceFileId ?? null,
          })),
        },
      },
      include: { items: true },
    }) as InspectionRecordWithItems;

    // For each failed item, create a NonConformance with precise source_item_id
    for (const createdItem of record.items) {
      if (createdItem.judgment !== 'fail') continue;

      const nc_no = await this.numberSequence.generateNonConformanceNo(
        dto.company_id,
        new Date(),
        tx,
      );

      await tx.nonConformance.create({
        data: {
          company_id: dto.company_id,
          nc_no,
          source_type: 'inspection_record',
          source_id: record.id,
          source_item_id: createdItem.id,
          description: `检验项「${createdItem.item_name}」判定不合格`,
          discovered_at: new Date(),
          status: 'open',
        },
      });
    }

    return record;
  }

  private async validateObjectTypeCompatibility(
    tx: TxClient,
    standardId: string,
    objectType: string,
  ): Promise<void> {
    const standard = await tx.inspectionStandard.findUnique({
      where: { id: standardId },
      select: { applies_to: true },
    });

    if (!standard) {
      return;
    }

    const allowed = INSPECTION_OBJECT_COMPATIBILITY[standard.applies_to];
    if (!allowed) {
      return;
    }

    if (!allowed.includes(objectType)) {
      throw new BadRequestException(
        `object_type "${objectType}" is not compatible with standard applies_to "${standard.applies_to}". ` +
          `Allowed: ${allowed.join(', ')}`,
      );
    }
  }
}
