import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CapaTriggerType, CreateCapaDto } from './dto/create-capa.dto';
import { QualityNumberSequenceService } from '../quality-number-sequence/quality-number-sequence.service';

export interface CorrectiveActionListFilters {
  status?: string;
  triggerType?: CapaTriggerType;
  triggerId?: string;
}

@Injectable()
export class CorrectiveActionService {
  constructor(
    private prisma: PrismaService,
    private readonly numberSequence: QualityNumberSequenceService,
  ) {}

  async create(
    dto: CreateCapaDto,
    userId: string,
    companyId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await this.validateTriggerSource(dto, companyId, client);

    const capa_no = await this.numberSequence.generateCorrectiveActionNo(
      companyId,
      new Date(),
      tx,
    );
    return client.correctiveAction.create({
      data: { ...dto, company_id: companyId, capa_no },
    });
  }

  async findAll(companyId: string, filters: CorrectiveActionListFilters = {}) {
    const { status, triggerType, triggerId } = filters;
    if ((triggerType && !triggerId) || (!triggerType && triggerId)) {
      throw new BadRequestException('trigger_type 和 trigger_id 必须同时提供');
    }

    return this.prisma.correctiveAction.findMany({
      where: {
        company_id: companyId,
        ...(status ? { status } : {}),
        ...(triggerType && triggerId
          ? { trigger_type: triggerType, trigger_id: triggerId }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  private async validateTriggerSource(
    dto: CreateCapaDto,
    companyId: string,
    client: PrismaService | Prisma.TransactionClient,
  ) {
    if (dto.trigger_type === 'other') {
      return;
    }

    if (!dto.trigger_id) {
      throw new BadRequestException('CAPA触发来源不能为空');
    }

    if (dto.trigger_type === 'non_conformance') {
      const source = await client.nonConformance.findFirst({
        where: { id: dto.trigger_id, company_id: companyId },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('不合格记录不存在或不属于当前公司');
      }
      return;
    }

    if (dto.trigger_type === 'customer_complaint') {
      const source = await client.customerComplaint.findFirst({
        where: { id: dto.trigger_id, company_id: companyId },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('顾客投诉不存在或不属于当前公司');
      }
      return;
    }

    if (dto.trigger_type === 'internal_audit') {
      const source = await client.auditFinding.findUnique({
        where: { id: dto.trigger_id },
        select: { id: true },
      });
      if (!source) {
        throw new BadRequestException('内审发现项不存在');
      }
      return;
    }

    throw new BadRequestException('CAPA触发类型不支持');
  }

  async findById(id: string, companyId: string) {
    const capa = await this.prisma.correctiveAction.findFirst({ where: { id, company_id: companyId } });
    if (!capa) throw new NotFoundException('纠正措施不存在');
    return capa;
  }

  async updateStatus(id: string, status: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: { status },
    });
  }

  async close(id: string, verifiedBy: string, companyId: string) {
    await this.findById(id, companyId);
    return this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: 'closed',
        verified_by: verifiedBy,
        verified_at: new Date(),
        closed_at: new Date(),
      },
    });
  }
}
