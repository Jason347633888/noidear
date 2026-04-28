import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Snowflake } from '../../../common/utils';
import { UpsertNumberRuleDto } from '../dto/document-control.dto';

export interface GenerateNumberInput {
  scope: 'document' | 'record_template';
  level: number;
  departmentId: string;
  sourceFolder?: string | null;
  fallbackCategoryCode?: string | null;
}

@Injectable()
export class NumberRuleService {
  private readonly snowflake = new Snowflake(1, 1);

  constructor(private readonly prisma: PrismaService) {}

  async generate(input: GenerateNumberInput): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const pending = await tx.pendingNumber.findFirst({
        where: {
          scope: input.scope,
          level: input.level,
          departmentId: input.departmentId,
          sourceFolder: input.sourceFolder ?? null,
        },
        orderBy: { deletedAt: 'asc' },
      });

      if (pending) {
        await tx.pendingNumber.delete({ where: { id: pending.id } });
        return pending.number;
      }

      const department = await tx.department.findUnique({ where: { id: input.departmentId } });
      if (!department) throw new NotFoundException('部门不存在');

      const rows = await tx.$queryRaw<Array<{
        id: string;
        sequence: number;
        prefix?: string | null;
        category_code?: string | null;
        format?: string | null;
        sequence_padding?: number | null;
        separator?: string | null;
      }>>`
        SELECT id, sequence, prefix, category_code, format, sequence_padding, separator
        FROM number_rules
        WHERE scope = ${input.scope}
          AND level = ${input.level}
          AND department_id = ${input.departmentId}
          AND (source_folder IS NOT DISTINCT FROM ${input.sourceFolder ?? null})
          AND is_active = true
        FOR UPDATE
      `;

      let rule = rows[0];
      if (!rule) {
        const created = await tx.numberRule.create({
          data: {
            id: this.snowflake.nextId(),
            scope: input.scope,
            level: input.level,
            departmentId: input.departmentId,
            sourceFolder: input.sourceFolder ?? null,
            sequence: 0,
            categoryCode: input.fallbackCategoryCode ?? null,
          },
        });
        rule = {
          id: created.id,
          sequence: created.sequence,
          prefix: (created as any).prefix,
          category_code: (created as any).categoryCode,
          format: (created as any).format,
          sequence_padding: (created as any).sequencePadding,
          separator: (created as any).separator,
        };
      }

      const nextSequence = rule.sequence + 1;
      await tx.numberRule.update({
        where: { id: rule.id },
        data: { sequence: nextSequence, usedCount: { increment: 1 } },
      });

      return this.formatNumber({
        level: input.level,
        departmentCode: department.code,
        sequence: nextSequence,
        prefix: rule.prefix ?? '',
        categoryCode: rule.category_code ?? input.fallbackCategoryCode ?? '',
        format: rule.format ?? '{level}-{departmentCode}-{sequence}',
        sequencePadding: rule.sequence_padding ?? 3,
        separator: rule.separator ?? '-',
      });
    });
  }

  formatNumber(input: {
    level: number;
    departmentCode: string;
    sequence: number;
    prefix: string;
    categoryCode: string;
    format: string;
    sequencePadding: number;
    separator: string;
  }) {
    if (input.sequencePadding < 1 || input.sequencePadding > 8) {
      throw new BadRequestException('序号位数必须在 1 到 8 之间');
    }
    const sequence = String(input.sequence).padStart(input.sequencePadding, '0');
    const escapedSep = input.separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let result = input.format
      .replaceAll('{prefix}', input.prefix)
      .replaceAll('{level}', String(input.level))
      .replaceAll('{departmentCode}', input.departmentCode)
      .replaceAll('{categoryCode}', input.categoryCode)
      .replaceAll('{sequence}', sequence);
    result = result.replace(new RegExp(`(${escapedSep}){2,}`, 'g'), input.separator);
    result = result.replace(new RegExp(`^${escapedSep}`), '');
    result = result.replace(new RegExp(`${escapedSep}$`), '');
    return result;
  }

  async list() {
    return this.prisma.numberRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async upsert(dto: UpsertNumberRuleDto) {
    const id = this.snowflake.nextId();
    return this.prisma.numberRule.upsert({
      where: {
        scope_level_departmentId_sourceFolder: {
          scope: dto.scope,
          level: dto.level,
          departmentId: dto.departmentId,
          sourceFolder: (dto.sourceFolder ?? null) as string,
        },
      },
      update: {
        prefix: dto.prefix,
        categoryCode: dto.categoryCode,
        format: dto.format,
        sequencePadding: dto.sequencePadding,
        separator: dto.separator,
        resetPolicy: dto.resetPolicy,
        isActive: true,
      },
      create: {
        id,
        scope: dto.scope,
        level: dto.level,
        departmentId: dto.departmentId,
        sourceFolder: dto.sourceFolder ?? null,
        prefix: dto.prefix,
        categoryCode: dto.categoryCode,
        format: dto.format,
        sequencePadding: dto.sequencePadding ?? 3,
        separator: dto.separator ?? '-',
        resetPolicy: dto.resetPolicy ?? 'none',
        sequence: 0,
      },
    });
  }

  async deactivate(id: string) {
    return this.prisma.numberRule.update({ where: { id }, data: { isActive: false } });
  }
}
