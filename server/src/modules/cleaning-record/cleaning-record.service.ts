import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCleaningRecordDto } from './dto/create-cleaning-record.dto';

export interface CompleteItemPayload {
  result: 'pass' | 'fail';
  remark?: string;
  actual_concentration?: number;
  sanitizer_check_id?: string;
  evidence_file_id?: string;
}

@Injectable()
export class CleaningRecordService {
  constructor(private prisma: PrismaService) {}

  // ── Simple create (legacy) ─────────────────────────────────────────────────

  async create(dto: CreateCleaningRecordDto, userId: string) {
    return this.prisma.cleaningRecord.create({
      data: {
        target_type: dto.target_type,
        target_name: dto.target_name,
        is_pass: dto.is_pass,
        notes: dto.notes ?? null,
        company_id: '1',
        operator_id: userId,
        cleaning_date: new Date(),
        status: 'draft',
      },
    });
  }

  async findAll(targetType?: string) {
    return this.prisma.cleaningRecord.findMany({
      where: targetType ? { target_type: targetType } : {},
      include: { items: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  // ── Itemized execution ─────────────────────────────────────────────────────

  async createFromActivePlan(
    areaPointId: string,
    cleaningDate: Date,
    operatorId: string,
    companyId: string,
  ) {
    const area = await this.prisma.workshopArea.findUnique({
      where: { id: areaPointId },
    });
    if (!area) {
      throw new NotFoundException(`区域点位不存在: ${areaPointId}`);
    }

    const plan = await this.prisma.cleaningPlan.findFirst({
      where: {
        area_point_id: areaPointId,
        company_id: companyId,
        status: 'active',
      },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    if (!plan) {
      throw new NotFoundException(`该区域暂无激活清洁计划: ${areaPointId}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.cleaningRecord.create({
        data: {
          company_id: companyId,
          target_type: plan.items[0]?.target_type ?? 'area',
          target_name: area.name,
          area_point_id: areaPointId,
          cleaning_plan_id: plan.id,
          cleaning_date: cleaningDate,
          operator_id: operatorId,
          is_pass: false,
          status: 'draft',
        },
      });

      if (plan.items.length > 0) {
        await tx.cleaningRecordItem.createMany({
          data: plan.items.map((item) => ({
            record_id: record.id,
            plan_item_id: item.id,
            target_name: item.target_name,
            target_type: item.target_type,
            method_snapshot: item.method ?? null,
            requires_disinfection: item.requires_disinfection,
            completed: false,
            result: 'pending',
          })),
        });
      }

      return tx.cleaningRecord.findUnique({
        where: { id: record.id },
        include: { items: { orderBy: { created_at: 'asc' } } },
      });
    });
  }

  async completeItem(recordId: string, itemId: string, payload: CompleteItemPayload) {
    const item = await this.prisma.cleaningRecordItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException(`清洁记录项目不存在: ${itemId}`);
    }
    if (item.record_id !== recordId) {
      throw new BadRequestException('该项目不属于指定的清洁记录');
    }

    return this.prisma.cleaningRecordItem.update({
      where: { id: itemId },
      data: {
        completed: true,
        completed_at: new Date(),
        result: payload.result,
        remark: payload.remark ?? null,
        actual_concentration: payload.actual_concentration != null
          ? payload.actual_concentration
          : undefined,
        sanitizer_check_id: payload.sanitizer_check_id ?? null,
        evidence_file_id: payload.evidence_file_id ?? null,
      },
    });
  }

  async submitRecord(recordId: string) {
    const record = await this.prisma.cleaningRecord.findUnique({
      where: { id: recordId },
      include: { items: true },
    });
    if (!record) {
      throw new NotFoundException(`清洁记录不存在: ${recordId}`);
    }

    // Validate all items
    const items = record.items;
    const mandatoryPending = items.filter((i) => !i.completed && i.result === 'pending');
    if (mandatoryPending.length > 0) {
      throw new BadRequestException(`还有 ${mandatoryPending.length} 个清洁项目未完成`);
    }

    const failedWithoutRemark = items.filter((i) => i.result === 'fail' && !i.remark);
    if (failedWithoutRemark.length > 0) {
      throw new BadRequestException('不合格项目必须填写备注');
    }

    const allItemsHaveResult = items.every((i) => i.result === 'pass' || i.result === 'fail');
    if (!allItemsHaveResult) {
      throw new BadRequestException('所有清洁项目必须记录结果（pass 或 fail）');
    }

    const isPass = items.length > 0 && items.every((i) => i.result === 'pass');

    return this.prisma.cleaningRecord.update({
      where: { id: recordId },
      data: {
        status: 'submitted',
        is_pass: isPass,
      },
      include: { items: true },
    });
  }

  async verifyRecord(recordId: string, verifierId: string, pass: boolean) {
    const record = await this.prisma.cleaningRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`清洁记录不存在: ${recordId}`);
    }
    if (record.status !== 'submitted') {
      throw new BadRequestException('只能验证已提交状态的清洁记录');
    }

    return this.prisma.cleaningRecord.update({
      where: { id: recordId },
      data: {
        verifier_id: verifierId,
        is_pass: pass,
        status: pass ? 'verified' : 'rejected',
      },
      include: { items: true },
    });
  }

  async createNonConformanceFromItem(
    recordId: string,
    itemId: string,
    userId: string,
    ncNo: string,
  ) {
    const record = await this.prisma.cleaningRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`清洁记录不存在: ${recordId}`);
    }

    const item = await this.prisma.cleaningRecordItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.record_id !== recordId) {
      throw new NotFoundException(`清洁记录项目不存在或不属于该记录: ${itemId}`);
    }

    return this.prisma.nonConformance.create({
      data: {
        company_id: record.company_id,
        nc_no: ncNo,
        source_type: 'cleaning_record',
        source_id: recordId,
        source_item_id: itemId,
        description: `清洁项目不合格：${item.target_name}`,
        discovered_by: userId,
        discoveredById: userId,
        discovered_at: new Date(),
      },
    });
  }
}
