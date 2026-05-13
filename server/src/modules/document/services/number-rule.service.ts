import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_DOCUMENT_NUMBER_RULE } from '../constants/document-control.constants';

export interface GenerateNumberInput {
  scope: 'document' | 'record_template';
  level: number;
  departmentId: string;
  sourceFolder?: string;
  fallbackCategoryCode?: string | null;
}

@Injectable()
export class NumberRuleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 默认编号生成（API contract cleanup 后内部唯一入口）。
   * 序号事实源：`DocumentNumberCounter`；格式来自常量 `DEFAULT_DOCUMENT_NUMBER_RULE`，
   * 不再读取或维护用户侧 `NumberRule` 表。
   */
  async generate(input: GenerateNumberInput): Promise<string> {
    return this.prisma.$transaction(async (tx: any) => {
      const pending = await tx.pendingNumber.findFirst({
        where: {
          scope: input.scope,
          level: input.level,
          departmentId: input.departmentId,
          sourceFolder: input.sourceFolder ?? '',
        },
        orderBy: { deletedAt: 'asc' },
      });

      if (pending) {
        await tx.pendingNumber.delete({ where: { id: pending.id } });
        return pending.number;
      }

      const department = await tx.department.findUnique({ where: { id: input.departmentId } });
      if (!department) throw new NotFoundException('部门不存在');

      const counter = await tx.documentNumberCounter.upsert({
        where: {
          doc_num_counter_uniq: {
            scope: input.scope,
            level: input.level,
            departmentId: input.departmentId,
            sourceFolder: input.sourceFolder ?? '',
            categoryCode: input.fallbackCategoryCode ?? '',
          },
        },
        create: {
          scope: input.scope,
          level: input.level,
          departmentId: input.departmentId,
          sourceFolder: input.sourceFolder ?? '',
          categoryCode: input.fallbackCategoryCode ?? '',
          sequence: 1,
        },
        update: {
          sequence: { increment: 1 },
        },
      });

      const sequence = String(counter.sequence).padStart(
        DEFAULT_DOCUMENT_NUMBER_RULE.sequencePadding,
        '0',
      );
      return DEFAULT_DOCUMENT_NUMBER_RULE.format
        .replaceAll('{level}', String(input.level))
        .replaceAll('{departmentCode}', department.code)
        .replaceAll('{categoryCode}', input.fallbackCategoryCode ?? '')
        .replaceAll('{sequence}', sequence)
        .replaceAll('--', '-')
        .replace(/^-|-$/g, '');
    });
  }
}
