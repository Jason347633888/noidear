import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletionStatus(shiftInstanceId: string) {
    const runs = await this.prisma.productionRun.findMany({
      where: { shift_instance_id: shiftInstanceId },
      include: {
        product: true,
      },
    });

    return runs.map(run => ({
      run_id: run.id,
      product_name: run.product.name,
      production_line: run.production_line,
      status: run.status,
      total_mandatory: 0,
      filled: 0,
      missing_templates: [],
      completion_rate: '100.0',
    }));
  }
}
