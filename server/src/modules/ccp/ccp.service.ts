import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCcpRecordDto } from './dto/create-ccp-record.dto';

@Injectable()
export class CcpService {
  constructor(private prisma: PrismaService) {}

  async createRecord(dto: CreateCcpRecordDto, operatorId: string) {
    return this.prisma.cCPRecord.create({
      data: {
        company_id: '1',
        production_batch_id: dto.production_batch_id,
        ccp_point_id: dto.ccp_point_id,
        measured_value: dto.measured_value,
        measured_text: dto.measured_text,
        unit: dto.unit,
        is_within_cl: dto.is_within_cl,
        deviation_action: dto.deviation_action,
        operator_id: operatorId,
        monitored_at: new Date(),
      },
    });
  }

  async findByBatch(productionBatchId: string) {
    return this.prisma.cCPRecord.findMany({
      where: { production_batch_id: productionBatchId },
      include: { ccp_point: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findMissingCCPs(productionBatchId: string) {
    const batch = await this.prisma.productionBatch.findUnique({
      where: { id: productionBatchId },
    });
    if (!batch) return [];

    const records = await this.prisma.cCPRecord.findMany({
      where: { production_batch_id: productionBatchId },
      select: { ccp_point_id: true },
    });
    const filledIds = new Set(records.map((r) => r.ccp_point_id));

    const allCCPs = await this.prisma.cCPPoint.findMany({
      where: { company_id: '1' },
    });

    return allCCPs.filter((c) => !filledIds.has(c.id));
  }
}
