import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletionStatus(shiftInstanceId: string) {
    const [runs, mandatoryTemplates] = await Promise.all([
      this.prisma.productionRun.findMany({
        where: { shift_instance_id: shiftInstanceId },
        include: {
          product: true,
          records: { include: { template: true } },
        },
      }),
      this.prisma.recordTemplate.findMany({
        where: { status: 'active', isMandatory: true },
        select: { code: true, name: true },
      }),
    ]);

    return runs.map(run => {
      const filledCodes = new Set(run.records.map((r: any) => r.template.code));
      const missing = mandatoryTemplates.filter((t: any) => !filledCodes.has(t.code));
      const total = mandatoryTemplates.length;
      const filled = total - missing.length;

      return {
        run_id: run.id,
        product_name: run.product.name,
        production_line: run.production_line,
        status: run.status,
        total_mandatory: total,
        filled,
        missing_templates: missing,
        completion_rate: total > 0 ? ((filled / total) * 100).toFixed(1) : '100.0',
      };
    });
  }
}
