import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MaterialBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  }

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

    const received = stockRecords
      .filter((r) => r.recordType === 'in')
      .reduce((sum: number, r) => sum + this.toNumber(r.quantity), 0);

    const returnedToWarehouse = stockRecords
      .filter((r) => r.recordType === 'return')
      .reduce((sum: number, r) => sum + this.toNumber(r.quantity), 0);

    const issuedToProduction = stockRecords
      .filter((r) => r.recordType === 'out')
      .reduce((sum: number, r) => sum + this.toNumber(r.quantity), 0);

    const scrapped = stockRecords
      .filter((r) => r.recordType === 'scrap')
      .reduce((sum: number, r) => sum + this.toNumber(r.quantity), 0);

    const totalIn = received + returnedToWarehouse;
    const totalOut = issuedToProduction + scrapped;
    const usedInProduction = usages.reduce((sum: number, u) => sum + this.toNumber(u.quantity), 0);

    const currentStock = this.toNumber(batches[0]?.quantity ?? 0);
    const calculated = totalIn - totalOut - usedInProduction;
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
      received,
      returnedToWarehouse,
      issuedToProduction,
      scrapped,
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
