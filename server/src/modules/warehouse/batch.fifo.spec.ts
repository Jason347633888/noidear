/**
 * FIFO 批次自动关联逻辑单元测试
 *
 * 覆盖业务规则：
 *   BR-307: 领料出库时，按 FIFO（先入先出）原则选择最早入库的批次
 *   BR-308: 同一领料单不得关联同一批次超过一次
 *
 * 实现说明：
 *   - FIFO 排序由 BatchService.getFIFO() 负责（expiryDate asc → createdAt asc）
 *   - 跨批次数量分配逻辑由 allocateByFIFO 工具函数模拟（调用方职责）
 *   - BR-308 在 MaterialRequisitionItem 层通过唯一索引保证，此处用 hasDuplicateBatch 验证
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchService } from './batch.service';

// ---------------------------------------------------------------------------
// 辅助类型
// ---------------------------------------------------------------------------

interface BatchStock {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  createdAt: Date;
}

interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// 工具函数：按 FIFO 顺序（已排好序）分配所需数量
// ---------------------------------------------------------------------------

function allocateByFIFO(
  sortedBatches: BatchStock[],
  requiredQty: number,
): BatchAllocation[] {
  if (requiredQty <= 0) {
    throw new Error('requiredQty must be greater than 0');
  }

  const allocations: BatchAllocation[] = [];
  let remaining = requiredQty;

  for (const batch of sortedBatches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(`库存不足：还需 ${remaining} 个单位`);
  }

  return allocations;
}

// ---------------------------------------------------------------------------
// 工具函数：检测分配结果中是否存在重复批次（BR-308 校验辅助）
// ---------------------------------------------------------------------------

function hasDuplicateBatch(allocations: BatchAllocation[]): boolean {
  const seen = new Set<string>();
  for (const a of allocations) {
    if (seen.has(a.batchId)) return true;
    seen.add(a.batchId);
  }
  return false;
}

// ---------------------------------------------------------------------------
// 测试套件
// ---------------------------------------------------------------------------

describe('MaterialBatch FIFO 自动关联逻辑 (BR-307/308)', () => {
  let service: BatchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchService,
        {
          provide: PrismaService,
          useValue: {
            materialBatch: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BatchService>(BatchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // BR-307: FIFO 先入先出原则
  // =========================================================================

  describe('BR-307: FIFO 先入先出原则', () => {
    describe('BatchService.getFIFO() — 数据库层排序', () => {
      it('应按 expiryDate 升序返回，最早到期的批次排在最前', async () => {
        const materialId = 'material-001';
        const mockBatches = [
          {
            id: 'batch-001',
            batchNumber: 'BATCH-A',
            expiryDate: new Date('2026-03-01'),
            createdAt: new Date('2026-01-01'),
            quantity: 50,
            status: 'normal',
          },
          {
            id: 'batch-002',
            batchNumber: 'BATCH-B',
            expiryDate: new Date('2026-04-01'),
            createdAt: new Date('2026-01-03'),
            quantity: 100,
            status: 'normal',
          },
        ];

        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);

        const result = await service.getFIFO(materialId);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('batch-001');
        expect(result[1].id).toBe('batch-002');
        expect(prisma.materialBatch.findMany).toHaveBeenCalledWith({
          where: { materialId, status: 'normal', quantity: { gt: 0 }, deletedAt: null },
          orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
        });
      });

      it('到期日相同时，应按 createdAt 升序（最早入库批次优先）', async () => {
        const materialId = 'material-001';
        const sameExpiryDate = new Date('2026-06-01');
        const mockBatches = [
          {
            id: 'batch-early',
            batchNumber: 'BATCH-A',
            expiryDate: sameExpiryDate,
            createdAt: new Date('2026-01-01'),
            quantity: 30,
            status: 'normal',
          },
          {
            id: 'batch-late',
            batchNumber: 'BATCH-B',
            expiryDate: sameExpiryDate,
            createdAt: new Date('2026-01-05'),
            quantity: 30,
            status: 'normal',
          },
        ];

        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);

        const result = await service.getFIFO(materialId);

        expect(result[0].id).toBe('batch-early');
        expect(result[1].id).toBe('batch-late');
      });

      it('应排除 expired 批次（where.status = normal）', async () => {
        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

        await service.getFIFO('material-001');

        const callArg = (prisma.materialBatch.findMany as jest.Mock).mock.calls[0][0];
        expect(callArg.where.status).toBe('normal');
      });

      it('应排除库存数量为 0 的批次（where.quantity > 0）', async () => {
        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

        await service.getFIFO('material-001');

        const callArg = (prisma.materialBatch.findMany as jest.Mock).mock.calls[0][0];
        expect(callArg.where.quantity).toEqual({ gt: 0 });
      });

      it('无可用批次时应返回空数组', async () => {
        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

        const result = await service.getFIFO('material-empty');

        expect(result).toEqual([]);
      });

      it('应仅返回指定 materialId 的批次', async () => {
        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue([]);

        await service.getFIFO('material-XYZ');

        const callArg = (prisma.materialBatch.findMany as jest.Mock).mock.calls[0][0];
        expect(callArg.where.materialId).toBe('material-XYZ');
      });
    });

    describe('allocateByFIFO() — 数量分配算法', () => {
      it('库存充足时，从最早到期的单一批次分配所需数量', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 100, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
          { id: 'b2', batchNumber: 'B2', quantity: 100, expiryDate: new Date('2024-06-01'), createdAt: new Date('2024-01-10') },
        ];

        const result = allocateByFIFO(batches, 30);

        expect(result).toHaveLength(1);
        expect(result[0].batchId).toBe('b1');
        expect(result[0].quantity).toBe(30);
      });

      it('单批次库存不足时，从下一批次补足（批次1有5个，批次2有10个，需领8个）', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 5, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
          { id: 'b2', batchNumber: 'B2', quantity: 10, expiryDate: new Date('2024-06-01'), createdAt: new Date('2024-01-10') },
        ];

        const result = allocateByFIFO(batches, 8);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ batchId: 'b1', quantity: 5 });
        expect(result[1]).toMatchObject({ batchId: 'b2', quantity: 3 });
      });

      it('三批次连续分配：严格按 FIFO 顺序耗尽各批次库存', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 10, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
          { id: 'b2', batchNumber: 'B2', quantity: 10, expiryDate: new Date('2024-04-01'), createdAt: new Date('2024-02-01') },
          { id: 'b3', batchNumber: 'B3', quantity: 10, expiryDate: new Date('2024-05-01'), createdAt: new Date('2024-03-01') },
        ];

        const result = allocateByFIFO(batches, 25);

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({ batchId: 'b1', quantity: 10 });
        expect(result[1]).toMatchObject({ batchId: 'b2', quantity: 10 });
        expect(result[2]).toMatchObject({ batchId: 'b3', quantity: 5 });
      });

      it('需求量恰好等于所有批次总库存时，应分配全部库存', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 20, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
          { id: 'b2', batchNumber: 'B2', quantity: 30, expiryDate: new Date('2024-04-01'), createdAt: new Date('2024-01-15') },
        ];

        const result = allocateByFIFO(batches, 50);

        expect(result).toHaveLength(2);
        expect(result[0].quantity).toBe(20);
        expect(result[1].quantity).toBe(30);
      });

      it('总库存不足时应抛出"库存不足"错误', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 5, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
        ];

        expect(() => allocateByFIFO(batches, 10)).toThrow('库存不足');
      });

      it('无可用批次时应抛出"库存不足"错误', () => {
        expect(() => allocateByFIFO([], 5)).toThrow('库存不足');
      });

      it('requiredQty 为 0 时应抛出参数错误', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 10, expiryDate: new Date(), createdAt: new Date() },
        ];

        expect(() => allocateByFIFO(batches, 0)).toThrow('requiredQty must be greater than 0');
      });

      it('requiredQty 为负数时应抛出参数错误', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 10, expiryDate: new Date(), createdAt: new Date() },
        ];

        expect(() => allocateByFIFO(batches, -1)).toThrow('requiredQty must be greater than 0');
      });
    });
  });

  // =========================================================================
  // BR-308: 同一领料单不重复关联同一批次
  // =========================================================================

  describe('BR-308: 同一领料单不重复关联同一批次', () => {
    describe('allocateByFIFO() — 单次分配结果唯一性', () => {
      it('单次 FIFO 分配结果中，每个批次 ID 只出现一次', () => {
        const batches: BatchStock[] = [
          { id: 'b1', batchNumber: 'B1', quantity: 5, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
          { id: 'b2', batchNumber: 'B2', quantity: 8, expiryDate: new Date('2024-04-01'), createdAt: new Date('2024-01-10') },
          { id: 'b3', batchNumber: 'B3', quantity: 10, expiryDate: new Date('2024-05-01'), createdAt: new Date('2024-02-01') },
        ];

        const result = allocateByFIFO(batches, 20);

        expect(hasDuplicateBatch(result)).toBe(false);
      });

      it('跨 5 个批次分配 35 个单位，不产生重复批次行', () => {
        const batches: BatchStock[] = Array.from({ length: 5 }, (_, i) => ({
          id: `batch-${i + 1}`,
          batchNumber: `BATCH-0${i + 1}`,
          quantity: 10,
          expiryDate: new Date(2024, i, 1),
          createdAt: new Date(2024, i, 1),
        }));

        const result = allocateByFIFO(batches, 35);

        expect(hasDuplicateBatch(result)).toBe(false);
        const totalAllocated = result.reduce((sum, a) => sum + a.quantity, 0);
        expect(totalAllocated).toBe(35);
      });
    });

    describe('hasDuplicateBatch() — 重复检测工具', () => {
      it('无重复时应返回 false', () => {
        const allocations: BatchAllocation[] = [
          { batchId: 'b1', batchNumber: 'B1', quantity: 10 },
          { batchId: 'b2', batchNumber: 'B2', quantity: 5 },
        ];

        expect(hasDuplicateBatch(allocations)).toBe(false);
      });

      it('存在重复 batchId 时应返回 true（BR-308 违规场景）', () => {
        const allocations: BatchAllocation[] = [
          { batchId: 'b1', batchNumber: 'B1', quantity: 10 },
          { batchId: 'b1', batchNumber: 'B1', quantity: 5 },
        ];

        expect(hasDuplicateBatch(allocations)).toBe(true);
      });

      it('空数组时应返回 false', () => {
        expect(hasDuplicateBatch([])).toBe(false);
      });

      it('单条记录时应返回 false', () => {
        const allocations: BatchAllocation[] = [
          { batchId: 'b1', batchNumber: 'B1', quantity: 10 },
        ];

        expect(hasDuplicateBatch(allocations)).toBe(false);
      });
    });

    describe('不同领料单可以关联同一批次', () => {
      it('同一批次对两次不同的 getFIFO 查询均可见（跨领料单无限制）', async () => {
        const materialId = 'material-001';
        const mockBatches = [
          {
            id: 'shared-batch',
            batchNumber: 'SHARED-001',
            quantity: 100,
            expiryDate: new Date('2026-06-01'),
            createdAt: new Date('2026-01-01'),
            status: 'normal',
          },
        ];

        jest.spyOn(prisma.materialBatch, 'findMany').mockResolvedValue(mockBatches as any);

        const resultReq1 = await service.getFIFO(materialId);
        const resultReq2 = await service.getFIFO(materialId);

        expect(resultReq1[0].id).toBe('shared-batch');
        expect(resultReq2[0].id).toBe('shared-batch');
        expect(prisma.materialBatch.findMany).toHaveBeenCalledTimes(2);
      });
    });
  });

  // =========================================================================
  // 边界情况
  // =========================================================================

  describe('边界情况', () => {
    it('仅一个批次且库存恰好满足需求，分配全部库存', () => {
      const batches: BatchStock[] = [
        { id: 'b1', batchNumber: 'B1', quantity: 42, expiryDate: new Date(), createdAt: new Date() },
      ];

      const result = allocateByFIFO(batches, 42);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(42);
    });

    it('需求数量为 1 时，仅从第一批次取 1 个单位', () => {
      const batches: BatchStock[] = [
        { id: 'b1', batchNumber: 'B1', quantity: 1000, expiryDate: new Date('2024-03-01'), createdAt: new Date('2024-01-01') },
        { id: 'b2', batchNumber: 'B2', quantity: 1000, expiryDate: new Date('2024-06-01'), createdAt: new Date('2024-02-01') },
      ];

      const result = allocateByFIFO(batches, 1);

      expect(result).toHaveLength(1);
      expect(result[0].batchId).toBe('b1');
      expect(result[0].quantity).toBe(1);
    });
  });
});
