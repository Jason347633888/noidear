/**
 * BatchMaterialUsageService — ownership access is delegated to ProductionBatchService.
 * This service no longer has a listForOwnership method; ownership filtering is applied
 * upstream via production batch queries in the batch-trace module.
 * These tests verify the service no longer exposes the removed dead code.
 */
import { BatchMaterialUsageService } from './batch-material-usage.service';

describe('BatchMaterialUsageService — listForOwnership removed (dead code)', () => {
  it('does not expose a listForOwnership method', () => {
    const prisma: any = {
      productionBatch: { findMany: jest.fn() },
      batchMaterialUsage: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      recipeLine: { findFirst: jest.fn() },
      materialBatch: { findUnique: jest.fn() },
    };
    const svc = new BatchMaterialUsageService(prisma);
    expect((svc as any).listForOwnership).toBeUndefined();
  });
});
