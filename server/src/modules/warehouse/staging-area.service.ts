import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StageMaterialToAreaDto, ConfirmStocktakeDto, ConfirmAreaStocktakeDto } from './dto/staging-area.dto';

export const WORKSHOP_ZONES = ['筛粉间', '称油间', '小料房'] as const;
export type WorkshopZone = typeof WORKSHOP_ZONES[number];

@Injectable()
export class StagingAreaService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentStock(query: any) {
    const { page = 1, limit = 10, location, areaId } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (location) where.location = location;
    if (areaId) where.area_id = areaId;

    const [data, total] = await Promise.all([
      this.prisma.stagingAreaStock.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          batch: {
            include: { material: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stagingAreaStock.count({ where }),
    ]);

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async stageToZone(dto: {
    batchId: string;
    quantity: number;
    zone: WorkshopZone;
    operatorId: string;
    note?: string;
  }) {
    if (!WORKSHOP_ZONES.includes(dto.zone)) {
      throw new BadRequestException(`无效区域，必须是：${WORKSHOP_ZONES.join('、')}`);
    }

    const batch = await this.prisma.materialBatch.findUnique({
      where: { id: dto.batchId },
      include: { material: true },
    });
    if (!batch) throw new NotFoundException('批次不存在');
    if (dto.quantity <= 0) throw new BadRequestException('数量必须大于 0');

    const existing = await this.prisma.stagingAreaStock.findFirst({
      where: { batchId: dto.batchId, location: dto.zone },
    });

    if (existing) {
      return this.prisma.stagingAreaStock.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
        include: { batch: { include: { material: true } } },
      });
    }

    return this.prisma.stagingAreaStock.create({
      data: {
        batchId: dto.batchId,
        quantity: dto.quantity,
        location: dto.zone,
      },
      include: { batch: { include: { material: true } } },
    });
  }

  async transferZone(dto: {
    stockId: string;
    toZone: WorkshopZone;
    quantity: number;
    operatorId: string;
    note?: string;
  }) {
    if (!WORKSHOP_ZONES.includes(dto.toZone)) {
      throw new BadRequestException(`无效目标区域，必须是：${WORKSHOP_ZONES.join('、')}`);
    }

    const stock = await this.prisma.stagingAreaStock.findUnique({
      where: { id: dto.stockId },
    });
    if (!stock) throw new NotFoundException('暂存记录不存在');
    if (stock.location === dto.toZone) throw new BadRequestException('来源区域与目标区域相同');
    if (dto.quantity <= 0 || dto.quantity > stock.quantity) {
      throw new BadRequestException(`迁移数量无效，当前库存：${stock.quantity}`);
    }

    const fromZone = stock.location!;

    return this.prisma.$transaction(async (tx) => {
      // 扣减来源
      await tx.stagingAreaStock.update({
        where: { id: dto.stockId },
        data: { quantity: stock.quantity - dto.quantity },
      });

      // 增加目标
      const target = await tx.stagingAreaStock.findFirst({
        where: { batchId: stock.batchId, location: dto.toZone },
      });
      if (target) {
        await tx.stagingAreaStock.update({
          where: { id: target.id },
          data: { quantity: target.quantity + dto.quantity },
        });
      } else {
        await tx.stagingAreaStock.create({
          data: { batchId: stock.batchId, quantity: dto.quantity, location: dto.toZone },
        });
      }

      // 写迁移日志
      return tx.stagingAreaTransfer.create({
        data: {
          stockId: dto.stockId,
          batchId: stock.batchId,
          fromZone,
          toZone: dto.toZone,
          quantity: dto.quantity,
          operatorId: dto.operatorId,
          note: dto.note,
        },
      });
    });
  }

  async dispenseFromZone(stockId: string, quantity: number, operatorId: string) {
    const stock = await this.prisma.stagingAreaStock.findUnique({
      where: { id: stockId },
    });
    if (!stock) throw new NotFoundException('暂存记录不存在');
    if (quantity <= 0 || quantity > stock.quantity) {
      throw new BadRequestException(`发放数量无效，当前库存：${stock.quantity}`);
    }

    return this.prisma.stagingAreaStock.update({
      where: { id: stockId },
      data: { quantity: stock.quantity - quantity },
      include: { batch: { include: { material: true } } },
    });
  }

  async getTransferLogs(batchId?: string) {
    const where: any = {};
    if (batchId) where.batchId = batchId;
    return this.prisma.stagingAreaTransfer.findMany({
      where,
      include: { operator: { select: { id: true, name: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async recordInventory(recordDto: any) {
    if (recordDto.recordType === 'opening') {
      return this.prisma.stagingAreaRecord.create({ data: recordDto });
    }

    const stock = await this.prisma.stagingAreaStock.findFirst({
      where: { batchId: recordDto.batchId },
    });

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.stagingAreaRecord.create({ data: recordDto });
      if (stock) {
        await tx.stagingAreaStock.update({
          where: { id: stock.id },
          data: { quantity: recordDto.quantity },
        });
      }
      return record;
    });
  }

  async getInventoryHistory(batchId: string) {
    return this.prisma.stagingAreaRecord.findMany({
      where: { batchId },
      include: { operator: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAvailableStocks(params: { areaId: string; materialId: string }) {
    return this.prisma.stagingAreaStock.findMany({
      where: {
        area_id: params.areaId,
        quantity: { gt: 0 },
        batch: { materialId: params.materialId },
      },
      include: { batch: true, area: true },
      orderBy: [
        { batch: { productionDate: 'asc' } },
        { createdAt: 'asc' },
      ],
    });
  }

  async stageToArea(dto: StageMaterialToAreaDto) {
    const area = await this.prisma.workshopArea.findFirst({
      where: { id: dto.areaId, status: 'active' },
    });
    if (!area) {
      throw new BadRequestException('配料区不存在或已停用');
    }

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.stagingAreaStock.upsert({
        where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
        create: {
          batchId: dto.batchId,
          area_id: dto.areaId,
          location: area.name,
          quantity: dto.quantity,
        },
        update: {
          quantity: { increment: dto.quantity },
          location: area.name,
        },
        include: { batch: true, area: true },
      });

      await tx.stagingAreaRecord.create({
        data: {
          batchId: dto.batchId,
          recordType: 'staging',
          quantity: dto.quantity,
          operatorId: dto.operatorId ?? 'system',
          shiftDate: new Date(),
        },
      });

      return stock;
    });
  }

  /**
   * Resolve the baseline (book_quantity) for a stocktake row.
   *
   * - kind === 'shift_start': compare against the latest *confirmed* shift_end
   *   for the same area + batch from a previous shift.  If none exists, fall
   *   back to the current StagingAreaStock quantity (or 0 when stock is also
   *   absent — first-ever shift).
   * - kind === 'shift_end' | 'handover': use the current StagingAreaStock
   *   quantity (existing behaviour).
   */
  private async resolveBookQuantity(
    dto: Pick<ConfirmStocktakeDto, 'areaId' | 'batchId' | 'kind'>,
  ): Promise<number> {
    if (dto.kind === 'shift_start') {
      const prevShiftEnd = await this.prisma.stagingAreaStocktake.findFirst({
        where: {
          area_id: dto.areaId,
          batchId: dto.batchId,
          kind: 'shift_end',
          status: { in: ['confirmed', 'exception'] },
        },
        orderBy: [{ work_date: 'desc' }, { createdAt: 'desc' }],
        select: { actual_quantity: true },
      });

      if (prevShiftEnd) {
        return prevShiftEnd.actual_quantity;
      }

      // Fall back to current stock quantity when no prior shift_end exists
      const stock = await this.prisma.stagingAreaStock.findUnique({
        where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
        select: { quantity: true },
      });
      return stock?.quantity ?? 0;
    }

    // shift_end and handover: use current stock quantity (original behaviour)
    const stock = await this.prisma.stagingAreaStock.findUnique({
      where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
    });
    if (!stock) {
      throw new BadRequestException('配料区没有该原辅料批次库存');
    }
    return stock.quantity;
  }

  async confirmStocktake(dto: ConfirmStocktakeDto) {
    const existing = await this.prisma.stagingAreaStocktake.findFirst({
      where: {
        area_id: dto.areaId,
        batchId: dto.batchId,
        kind: dto.kind,
        work_date: new Date(dto.workDate),
        shift_type_id: dto.shiftTypeId,
      },
    });
    if (existing) {
      throw new BadRequestException('该班次该物料批次已完成盘点，请勿重复提交');
    }

    const bookQuantity = await this.resolveBookQuantity(dto);
    const difference = dto.actualQuantity - bookQuantity;

    return this.prisma.stagingAreaStocktake.create({
      data: {
        area_id: dto.areaId,
        batchId: dto.batchId,
        kind: dto.kind,
        status: Math.abs(difference) < 0.0001 ? 'confirmed' : 'exception',
        book_quantity: bookQuantity,
        actual_quantity: dto.actualQuantity,
        difference,
        work_date: new Date(dto.workDate),
        shift_type_id: dto.shiftTypeId,
        team_id: dto.teamId,
        operatorId: dto.operatorId,
        confirmed_at: new Date(),
        note: dto.note,
      },
    });
  }

  /**
   * Area-level batch stocktake: submit many stocktake rows in one call.
   * Each item (batchId + actualQuantity + optional note) becomes one
   * StagingAreaStocktake row, reusing the per-batch baseline logic.
   * All rows are created inside a single transaction for atomicity.
   */
  async confirmAreaStocktake(dto: ConfirmAreaStocktakeDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('盘点明细不能为空');
    }

    const workDateObj = new Date(dto.workDate);
    const confirmedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      for (const item of dto.items) {
        // Dedup check within transaction
        const existing = await tx.stagingAreaStocktake.findFirst({
          where: {
            area_id: dto.areaId,
            batchId: item.batchId,
            kind: dto.kind,
            work_date: workDateObj,
            shift_type_id: dto.shiftTypeId,
          },
        });
        if (existing) {
          throw new BadRequestException(
            `批次 ${item.batchId} 在该班次已完成盘点，请勿重复提交`,
          );
        }

        // Resolve baseline using same logic as single confirmStocktake
        const bookQuantity = await this.resolveBookQuantityTx(tx, {
          areaId: dto.areaId,
          batchId: item.batchId,
          kind: dto.kind,
        });

        const difference = item.actualQuantity - bookQuantity;

        const row = await tx.stagingAreaStocktake.create({
          data: {
            area_id: dto.areaId,
            batchId: item.batchId,
            kind: dto.kind,
            status: Math.abs(difference) < 0.0001 ? 'confirmed' : 'exception',
            book_quantity: bookQuantity,
            actual_quantity: item.actualQuantity,
            difference,
            work_date: workDateObj,
            shift_type_id: dto.shiftTypeId,
            team_id: dto.teamId,
            operatorId: dto.operatorId,
            confirmed_at: confirmedAt,
            note: item.note,
          },
        });
        results.push(row);
      }

      return results;
    });
  }

  /**
   * Prisma-transaction-aware version of resolveBookQuantity.
   * Accepts a tx client so it participates in the caller's transaction.
   */
  private async resolveBookQuantityTx(
    tx: any,
    dto: Pick<ConfirmStocktakeDto, 'areaId' | 'batchId' | 'kind'>,
  ): Promise<number> {
    if (dto.kind === 'shift_start') {
      const prevShiftEnd = await tx.stagingAreaStocktake.findFirst({
        where: {
          area_id: dto.areaId,
          batchId: dto.batchId,
          kind: 'shift_end',
          status: { in: ['confirmed', 'exception'] },
        },
        orderBy: [{ work_date: 'desc' }, { createdAt: 'desc' }],
        select: { actual_quantity: true },
      });

      if (prevShiftEnd) {
        return prevShiftEnd.actual_quantity;
      }

      const stock = await tx.stagingAreaStock.findUnique({
        where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
        select: { quantity: true },
      });
      return stock?.quantity ?? 0;
    }

    const stock = await tx.stagingAreaStock.findUnique({
      where: { batchId_area_id: { batchId: dto.batchId, area_id: dto.areaId } },
    });
    if (!stock) {
      throw new BadRequestException('配料区没有该原辅料批次库存');
    }
    return stock.quantity;
  }
}
