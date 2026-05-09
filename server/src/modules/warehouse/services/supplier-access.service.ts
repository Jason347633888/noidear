import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

type SupplierLike = {
  id: string;
  name?: string | null;
  status?: string | null;
  evaluationStatus?: string | null;
  deletedAt?: Date | null;
};

@Injectable()
export class SupplierAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertSupplierUsable(supplierId: string, actionLabel: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        status: true,
        evaluationStatus: true,
        deletedAt: true,
      },
    });

    this.assertUsableSupplier(supplier, actionLabel);
  }

  async assertBatchSupplierUsable(batchId: string, actionLabel: string): Promise<void> {
    const batch = await this.prisma.materialBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        deletedAt: true,
        supplierId: true,
        supplier: {
          select: {
            id: true,
            name: true,
            status: true,
            evaluationStatus: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!batch || batch.deletedAt) {
      throw new NotFoundException(`物料批次不存在：${batchId}`);
    }

    if (!batch.supplierId) {
      return;
    }

    this.assertUsableSupplier(batch.supplier, actionLabel);
  }

  private assertUsableSupplier(supplier: SupplierLike | null, actionLabel: string): void {
    if (!supplier || supplier.deletedAt) {
      throw new NotFoundException('供应商不存在');
    }

    const displayName = supplier.name || supplier.id;

    if (supplier.status === 'disabled') {
      throw new BadRequestException(`供应商 ${displayName} 已停用，不能${actionLabel}`);
    }

    if (supplier.evaluationStatus === 'eliminated') {
      throw new BadRequestException(`供应商 ${displayName} 已淘汰，不能${actionLabel}`);
    }
  }
}
