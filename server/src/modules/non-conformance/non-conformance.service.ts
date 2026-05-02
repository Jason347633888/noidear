import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNcDto, DisposeNcDto } from './dto/create-nc.dto';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

type CcpDeviationInput = {
  companyId: string;
  userId: string;
  ccpRecord: {
    id: string;
    production_batch_id: string;
    ccp_point_id: string;
    measured_value?: unknown;
    measured_text?: string | null;
    unit?: string | null;
    deviation_action?: string | null;
    ccp_point?: { ccp_no?: string | null } | null;
  };
};

@Injectable()
export class NonConformanceService {
  constructor(
    private prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async create(dto: CreateNcDto, userId: string, companyId: string) {
    const nc_no = await this.numberSequence.generateNonConformanceNo(companyId);
    return this.prisma.nonConformance.create({
      data: {
        ...dto,
        company_id: companyId,
        nc_no,
        discovered_by: userId,
        discovered_at: new Date(),
      },
    });
  }

  async createFromCcpDeviation(input: CcpDeviationInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const nc_no = await this.numberSequence.generateNonConformanceNo(input.companyId, new Date(), tx);

    return db.nonConformance.create({
      data: {
        company_id: input.companyId,
        nc_no,
        source_type: 'production_batch',
        source_id: input.ccpRecord.production_batch_id,
        nc_type: 'ccp_deviation',
        description: this.buildCcpDeviationDescription(input.ccpRecord),
        discovered_by: input.userId,
        discovered_at: new Date(),
      },
    });
  }

  private buildCcpDeviationDescription(record: CcpDeviationInput['ccpRecord']) {
    const ccpNo = record.ccp_point?.ccp_no ?? record.ccp_point_id;
    const measured =
      record.measured_value != null
        ? `${record.measured_value}${record.unit ? ` ${record.unit}` : ''}`
        : record.measured_text ?? '未填写';
    const action = record.deviation_action ? `；偏差处置：${record.deviation_action}` : '；偏差处置：未填写';

    return `CCP偏差：${ccpNo} 超出临界限；实测：${measured}${action}；CCP记录ID：${record.id}`;
  }

  async findAll(companyId: string, status?: string) {
    return this.prisma.nonConformance.findMany({
      where: { company_id: companyId, ...(status ? { status } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async dispose(id: string, dto: DisposeNcDto, userId: string, companyId: string) {
    const record = await this.prisma.nonConformance.findFirst({
      where: { id, company_id: companyId },
    });
    if (!record) throw new NotFoundException('不合格记录不存在');

    return this.prisma.nonConformance.update({
      where: { id },
      data: {
        disposition: dto.disposition,
        disposition_by: userId,
        disposition_at: new Date(),
        status: 'dispositioned',
      },
    });
  }
}
