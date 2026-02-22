import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaterialBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkBalance(batchId: string) {
    const [stockRecords, usages, batches] = await Promise.all([
      this.prisma.stockRecord.findMany({
        where: { batchId },
      }),
      this.prisma.batchMaterialUsage.findMany({
        where: { materialBatchId: batchId },
      }),
      this.prisma.materialBatch.findMany({
        where: { id: batchId },
      }),
    ]);

    const totalIn = stockRecords
      .filter((r) => r.recordType === 'in')
      .reduce((sum, r) => sum + r.quantity, 0);

    const totalOut = stockRecords
      .filter((r) => r.recordType === 'out')
      .reduce((sum, r) => sum + r.quantity, 0);

    const usedInProduction = usages.reduce((sum, u) => sum + u.quantity, 0);

    const calculated = totalIn - totalOut - usedInProduction;
    const currentStock = batches[0]?.quantity || 0;
    const difference = Math.abs(calculated - currentStock);
    const isBalanced = difference < 0.01;

    return {
      batchId,
      totalIn,
      totalOut,
      usedInProduction,
      calculated,
      currentStock,
      difference,
      isBalanced,
    };
  }

  async checkAllBatches() {
    const batches = await this.prisma.materialBatch.findMany({
      where: { deletedAt: null },
    });

    const results = await Promise.all(
      batches.map((batch) => this.checkBalance(batch.id)),
    );

    return {
      total: results.length,
      balanced: results.filter((r) => r.isBalanced).length,
      imbalanced: results.filter((r) => !r.isBalanced).length,
      batches: results,
    };
  }
}
