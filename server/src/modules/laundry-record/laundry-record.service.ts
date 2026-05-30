import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLaundryWorkRecordInput } from './dto/create-laundry-record.dto';

@Injectable()
export class LaundryRecordService {
  constructor(private prisma: PrismaService) {}

  async createLaundryWorkRecord(input: CreateLaundryWorkRecordInput) {
    return this.prisma.$transaction(async (tx) => {
      return tx.laundryWorkRecord.create({
        data: {
          company_id: input.company_id,
          work_date: new Date(input.work_date),
          shift_type_id: input.shift_type_id ?? null,
          batch_no: input.batch_no ?? null,
          washing_method: input.washing_method ?? null,
          disinfection_method: input.disinfection_method ?? null,
          disinfectant: input.disinfectant ?? null,
          temperature: input.temperature ?? null,
          duration_min: input.duration_min ?? null,
          operator_id: input.operator_id,
          notes: input.notes ?? null,
          status: 'draft',
          items: {
            create: input.items.map((item) => ({
              garment_type: item.garment_type,
              garment_inventory_id: item.garment_inventory_id ?? null,
              area_id: item.area_id ?? null,
              quantity: item.quantity,
              action: item.action,
              result: item.result,
              notes: item.notes ?? null,
              evidence_file_id: item.evidence_file_id ?? null,
            })),
          },
        },
        include: { items: true },
      });
    });
  }

  async submitLaundryWorkRecord(recordId: string) {
    const record = await this.prisma.laundryWorkRecord.findUnique({
      where: { id: recordId },
      include: { items: true },
    });
    if (!record) {
      throw new NotFoundException(`洗涤工作记录不存在: ${recordId}`);
    }
    if (record.status !== 'draft') {
      throw new BadRequestException('只能提交草稿状态的洗涤工作记录');
    }

    return this.prisma.laundryWorkRecord.update({
      where: { id: recordId },
      data: { status: 'submitted' },
      include: { items: true },
    });
  }

  async verifyLaundryWorkRecord(recordId: string, verifierId: string, pass: boolean) {
    const record = await this.prisma.laundryWorkRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`洗涤工作记录不存在: ${recordId}`);
    }
    if (record.status !== 'submitted') {
      throw new BadRequestException('只能验证已提交状态的洗涤工作记录');
    }

    return this.prisma.laundryWorkRecord.update({
      where: { id: recordId },
      data: {
        verifier_id: verifierId,
        status: pass ? 'verified' : 'rejected',
      },
      include: { items: true },
    });
  }

  async createNonConformanceFromLaundryItem(
    recordId: string,
    itemId: string,
    userId: string,
    ncNo: string,
  ) {
    const record = await this.prisma.laundryWorkRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException(`洗涤工作记录不存在: ${recordId}`);
    }

    const item = await this.prisma.laundryWorkRecordItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.laundry_work_record_id !== recordId) {
      throw new NotFoundException(`洗涤记录项目不存在或不属于该记录: ${itemId}`);
    }

    return this.prisma.nonConformance.create({
      data: {
        company_id: record.company_id,
        nc_no: ncNo,
        source_type: 'laundry_work_record',
        source_id: recordId,
        source_item_id: itemId,
        description: `洗涤项目不合格：${item.garment_type}（${item.action}）`,
        discovered_by: userId,
        discoveredById: userId,
        discovered_at: new Date(),
      },
    });
  }

  async findAll(companyId: string, status?: string) {
    return this.prisma.laundryWorkRecord.findMany({
      where: {
        company_id: companyId,
        ...(status ? { status } : {}),
      },
      include: { items: true },
      orderBy: { work_date: 'desc' },
      take: 100,
    });
  }

  async findOne(recordId: string) {
    const record = await this.prisma.laundryWorkRecord.findUnique({
      where: { id: recordId },
      include: { items: true },
    });
    if (!record) {
      throw new NotFoundException(`洗涤工作记录不存在: ${recordId}`);
    }
    return record;
  }
}
