import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NonConformanceService } from '../non-conformance/non-conformance.service';
import { CreateCcpRecordDto } from './dto/create-ccp-record.dto';

@Injectable()
export class CcpService {
  constructor(
    private prisma: PrismaService,
    private nonConformanceService: NonConformanceService,
  ) {}

  async createRecord(dto: CreateCcpRecordDto, operatorId: string, companyId: string) {
    const createData = {
      company_id: companyId,
      production_batch_id: dto.production_batch_id,
      ccp_point_id: dto.ccp_point_id,
      measured_value: dto.measured_value,
      measured_text: dto.measured_text,
      unit: dto.unit,
      is_within_cl: dto.is_within_cl,
      deviation_action: dto.deviation_action,
      operator_id: operatorId,
      monitored_at: new Date(),
    };

    if (dto.is_within_cl) {
      return this.prisma.cCPRecord.create({
        data: createData,
        include: { ccp_point: true },
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ccpRecord = await tx.cCPRecord.create({
        data: createData,
        include: { ccp_point: true },
      });

      await this.nonConformanceService.createFromCcpDeviation(
        {
          companyId,
          userId: operatorId,
          ccpRecord,
        },
        tx,
      );

      return ccpRecord;
    });
  }

  async findByBatch(productionBatchId: string, companyId: string) {
    return this.prisma.cCPRecord.findMany({
      where: { production_batch_id: productionBatchId, company_id: companyId },
      include: { ccp_point: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findMissingCCPs(productionBatchId: string, companyId: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
      select: { id: true, productId: true, recipeId: true },
    });
    if (!batch) return [];

    const records = await this.prisma.cCPRecord.findMany({
      where: { production_batch_id: productionBatchId, company_id: companyId },
      select: { ccp_point_id: true },
    });
    const filledIds = new Set(records.map((r: { ccp_point_id: string }) => r.ccp_point_id));

    const expectedCCPs = await this.prisma.cCPPoint.findMany({
      where: {
        company_id: companyId,
        deleted_at: null,
        process_step: {
          company_id: companyId,
          deleted_at: null,
          OR: [{ product_id: batch.productId }, { recipe_id: batch.recipeId }],
        },
      },
      orderBy: [{ ccp_no: 'asc' }, { created_at: 'asc' }],
    });

    return expectedCCPs.filter((ccp: { id: string }) => !filledIds.has(ccp.id));
  }
}
