import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NonConformanceService } from '../non-conformance/non-conformance.service';
import { CreateSanitizerConcentrationCheckDto, JUDGMENT_VALUES } from './dto/sanitizer-concentration.dto';

@Injectable()
export class SanitizerConcentrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nonConformanceService: NonConformanceService,
  ) {}

  async create(dto: CreateSanitizerConcentrationCheckDto, userId: string, companyId: string) {
    if (!dto.area_point_id?.trim()) {
      throw new BadRequestException('area_point_id 不能为空');
    }

    if (!JUDGMENT_VALUES.includes(dto.judgment as (typeof JUDGMENT_VALUES)[number])) {
      throw new BadRequestException(`judgment 必须是 pass 或 fail，实际值: ${dto.judgment}`);
    }

    const areaPoint = await this.prisma.workshopArea.findFirst({
      where: { id: dto.area_point_id, company_id: companyId, status: 'active', deleted_at: null },
      select: { id: true },
    });

    if (!areaPoint) {
      throw new BadRequestException('消毒检测点位不存在或已停用');
    }

    return this.prisma.sanitizerConcentrationCheck.create({
      data: {
        company_id: companyId,
        area_point_id: dto.area_point_id,
        disinfectant_type: dto.disinfectant_type,
        target_concentration: dto.target_concentration ?? null,
        actual_concentration: dto.actual_concentration,
        unit: dto.unit,
        judgment: dto.judgment,
        checked_at: new Date(dto.checked_at),
        operator_id: dto.operator_id ?? userId,
        verifier_id: dto.verifier_id ?? null,
        notes: dto.notes ?? null,
        appeared_in_source_forms: dto.appeared_in_source_forms ?? [],
        source_form_version: dto.source_form_version ?? null,
        source_form_field_group: dto.source_form_field_group ?? null,
      },
    });
  }

  async findAll(companyId: string, areaPointId?: string, from?: string, to?: string) {
    return this.prisma.sanitizerConcentrationCheck.findMany({
      where: {
        company_id: companyId,
        ...(areaPointId ? { area_point_id: areaPointId } : {}),
        ...(from || to
          ? {
              checked_at: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { checked_at: 'desc' },
      take: 200,
    });
  }

  async findById(id: string, companyId: string) {
    const check = await this.prisma.sanitizerConcentrationCheck.findUnique({
      where: { id },
    });

    if (!check || check.company_id !== companyId) {
      throw new NotFoundException('消毒液浓度检查记录不存在');
    }

    return check;
  }

  async createNonConformance(checkId: string, userId: string, companyId: string) {
    const check = await this.prisma.sanitizerConcentrationCheck.findUnique({
      where: { id: checkId },
    });

    if (!check || check.company_id !== companyId) {
      throw new NotFoundException('消毒液浓度检查记录不存在');
    }

    if (check.judgment !== 'fail') {
      throw new BadRequestException('只有判定结果为 fail 的记录才能创建不合格单');
    }

    return this.nonConformanceService.create(
      {
        source_type: 'sanitizer_concentration_check',
        source_id: check.id,
        source_item_id: null,
        description: `消毒液浓度不合格：${check.actual_concentration}${check.unit}`,
      } as any,
      userId,
      companyId,
    );
  }
}
