import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NonConformance, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNcDto, DisposeNcDto, NcSourceType } from './dto/create-nc.dto';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';
import { OwnershipContext } from '../module-access/ownership-context';
import { userIdsInDepts } from '../module-access/ownership-helpers';

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

  /**
   * Ownership-scoped list using discoveredById FK (Task 46).
   * admin → all; user → discoveredById = userId;
   * leader → discoveredById IN members(managedDepartmentIds).
   */
  async listForOwnership(ownership: OwnershipContext) {
    if (ownership.roleCode === 'admin') {
      return this.prisma.nonConformance.findMany({ orderBy: { created_at: 'desc' } });
    }
    if (ownership.roleCode === 'user') {
      return this.prisma.nonConformance.findMany({
        where: { discoveredById: ownership.userId },
        orderBy: { created_at: 'desc' },
      });
    }
    // leader
    const depts = ownership.managedDepartmentIds ?? [];
    if (depts.length === 0) return [];
    const memberIds = await userIdsInDepts(this.prisma, depts);
    if (memberIds.length === 0) return [];
    return this.prisma.nonConformance.findMany({
      where: { discoveredById: { in: memberIds } },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(dto: CreateNcDto, userId: string, companyId: string) {
    await this.validateSourceExists(dto.source_type, dto.source_id, companyId);

    const nc_no = await this.numberSequence.generateNonConformanceNo(companyId);
    return this.prisma.nonConformance.create({
      data: {
        ...dto,
        source_id: dto.source_id.trim(),
        company_id: companyId,
        nc_no,
        discovered_by: userId,
        discoveredById: userId,
        discovered_at: new Date(),
      },
    });
  }

  async createFromCcpDeviation(input: CcpDeviationInput, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    await this.validateSourceExists('production_batch', input.ccpRecord.production_batch_id, input.companyId, db);

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
        discoveredById: input.userId,
        discovered_at: new Date(),
      },
    });
  }

  private async validateSourceExists(
    sourceType: NcSourceType,
    sourceId: string,
    companyId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const trimmedSourceId = sourceId?.trim();
    if (!trimmedSourceId) {
      throw new BadRequestException('不合格来源不能为空');
    }

    if (sourceType === 'material_batch') {
      const materialBatch = await db.materialBatch.findUnique({
        where: { id: trimmedSourceId },
        select: { id: true, deletedAt: true },
      });
      if (!materialBatch || materialBatch.deletedAt != null) {
        throw new BadRequestException('物料批次来源不存在');
      }
      return;
    }

    if (sourceType === 'production_batch') {
      const productionBatch = await db.productionBatch.findUnique({
        where: { id: trimmedSourceId },
        select: { id: true, productId: true, deletedAt: true },
      });
      if (!productionBatch?.productId || productionBatch.deletedAt != null) {
        throw new BadRequestException('生产批次来源不存在');
      }

      const product = await db.product.findFirst({
        where: { id: productionBatch.productId, company_id: companyId, deleted_at: null },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException('生产批次来源不存在');
      }
      return;
    }

    if (sourceType === 'product') {
      const product = await db.product.findFirst({
        where: { id: trimmedSourceId, company_id: companyId, deleted_at: null },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException('产品来源不存在');
      }
      return;
    }

    throw new BadRequestException('不支持的不合格来源类型');
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
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.nonConformance.findFirst({
        where: { id, company_id: companyId },
      });
      if (!record) throw new NotFoundException('不合格记录不存在');

      if (dto.disposition === 'rework') {
        await this.ensureReworkRecordForDisposition(record, userId, companyId, tx);
      }

      return tx.nonConformance.update({
        where: { id },
        data: {
          disposition: dto.disposition,
          disposition_by: userId,
          disposition_at: new Date(),
          status: 'dispositioned',
        },
      });
    });
  }

  private async ensureReworkRecordForDisposition(
    record: NonConformance,
    userId: string,
    companyId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (record.source_type !== 'production_batch') {
      throw new BadRequestException('返工处置仅支持来源为生产批次的不合格记录');
    }

    if (record.qty == null || !record.unit?.trim()) {
      throw new BadRequestException('返工处置需要不合格数量和单位');
    }

    const productionBatch = await tx.productionBatch.findFirst({
      where: { id: record.source_id, product: { company_id: companyId } },
      select: { id: true },
    });
    if (!productionBatch) {
      throw new BadRequestException('返工处置的生产批次不存在或不属于当前公司');
    }

    const existingReworkRecord = await tx.reworkRecord.findFirst({
      where: { company_id: companyId, nc_id: record.id },
      select: { id: true },
    });
    if (existingReworkRecord) return;

    await tx.reworkRecord.create({
      data: {
        company_id: companyId,
        production_batch_id: record.source_id,
        nc_id: record.id,
        rework_reason: record.description,
        rework_qty: record.qty,
        unit: record.unit.trim(),
        rework_date: new Date(),
        operator_id: userId,
        quality_verdict: 'pending',
      },
    });
  }
}
