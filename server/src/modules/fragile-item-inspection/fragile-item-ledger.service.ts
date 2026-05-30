import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';
import {
  CreateFragileItemLedgerDto,
  CreateFragileItemUsageReturnDto,
} from './dto/create-fragile-item-ledger.dto';

const RESULT_MISSING = 'missing';
const RESULT_BROKEN = 'broken';

@Injectable()
export class FragileItemLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async createLedger(dto: CreateFragileItemLedgerDto, companyId: string) {
    return this.prisma.fragileItemLedger.create({
      data: {
        company_id: companyId,
        code: dto.code,
        name: dto.name,
        material_type: dto.material_type,
        area_point_id: dto.area_point_id,
        location_desc: dto.location_desc,
        risk_level: dto.risk_level,
        risk_assessment_id: dto.risk_assessment_id,
      },
    });
  }

  async findAllLedgers(companyId: string, areaPointId?: string) {
    return this.prisma.fragileItemLedger.findMany({
      where: {
        company_id: companyId,
        ...(areaPointId ? { area_point_id: areaPointId } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createUsageReturn(
    dto: CreateFragileItemUsageReturnDto,
    companyId: string,
    userId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.fragileItemLedger.findUnique({
        where: { id: dto.fragile_item_id },
        select: { id: true, company_id: true, status: true, name: true, code: true },
      });

      if (!ledger || ledger.company_id !== companyId) {
        throw new BadRequestException('易碎品台账记录不存在');
      }

      const usageReturn = await tx.fragileItemUsageReturn.create({
        data: {
          company_id: companyId,
          fragile_item_id: dto.fragile_item_id,
          used_by: dto.used_by,
          used_at: new Date(dto.used_at),
          returned_at: dto.returned_at ? new Date(dto.returned_at) : undefined,
          return_condition: dto.return_condition,
          result: dto.result,
          evidence_file_id: dto.evidence_file_id,
        },
      });

      if (dto.result === RESULT_MISSING) {
        await tx.fragileItemLedger.update({
          where: { id: dto.fragile_item_id },
          data: { status: 'inactive' },
        });
      }

      if (dto.result === RESULT_MISSING || dto.result === RESULT_BROKEN) {
        await this.createNonConformanceFromUsageReturn(
          { ledger, usageReturn, companyId, userId },
          tx,
        );
      }

      return usageReturn;
    });
  }

  private async createNonConformanceFromUsageReturn(
    input: {
      ledger: { id: string; name: string; code: string };
      usageReturn: { id: string; result: string };
      companyId: string;
      userId?: string;
    },
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ) {
    const nc_no = await this.numberSequence.generateNonConformanceNo(input.companyId);
    const resultLabel = input.usageReturn.result === RESULT_MISSING ? '丢失' : '破损';
    const description = `易碎品${resultLabel}：${input.ledger.name}（编号：${input.ledger.code}）`;

    return tx.nonConformance.create({
      data: {
        company_id: input.companyId,
        nc_no,
        source_type: 'fragile_item_usage_return',
        source_id: input.usageReturn.id,
        nc_type: `fragile_item_${input.usageReturn.result}`,
        description,
        discovered_by: input.userId ?? '',
        discoveredById: input.userId ?? '',
        discovered_at: new Date(),
      },
    });
  }

  async findAllUsageReturns(companyId: string, fragileItemId?: string) {
    return this.prisma.fragileItemUsageReturn.findMany({
      where: {
        company_id: companyId,
        ...(fragileItemId ? { fragile_item_id: fragileItemId } : {}),
      },
      orderBy: { used_at: 'desc' },
      take: 200,
    });
  }
}
