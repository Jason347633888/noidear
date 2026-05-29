import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';
import { CreateInspectionRecordDto } from './dto/create-inspection-record.dto';

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

  private async createInTransaction(tx: TxClient, dto: CreateInspectionRecordDto) {
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
}
