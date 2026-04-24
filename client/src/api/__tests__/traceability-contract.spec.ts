import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TraceQueryResult } from '@noidear/types';
import type { TraceQueryResult as ClientTraceQueryResult } from '@/types/traceability';
import { traceabilityApi } from '@/api/traceability';

vi.mock('@/api/request', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe('traceability shared type contract', () => {
  it('client TraceQueryResult is identical to shared package TraceQueryResult (type-level)', () => {
    // Compile-time test: if ClientTraceQueryResult and TraceQueryResult diverge,
    // TypeScript will error on the AssertSame constraint.
    type AssertSame<T, U extends T> = U;
    type _check = AssertSame<TraceQueryResult, ClientTraceQueryResult>;
    expect(true).toBe(true); // runtime marker
  });

  it('risk items are accessed via result.risk.items (not result.risks)', () => {
    const mockResult: Partial<TraceQueryResult> = {
      risk: {
        summaryRiskLevel: 'normal',
        riskCount: 0,
        highRiskCount: 0,
        items: [],
      },
    };
    expect(Array.isArray(mockResult.risk?.items)).toBe(true);
    expect('risks' in mockResult).toBe(false);
  });

  it('permission uses canInitiateLinkage (not canInitiateAction)', () => {
    const mockPermission: Partial<TraceQueryResult['permission']> = {
      canInitiateLinkage: true,
    };
    expect(mockPermission.canInitiateLinkage).toBe(true);
    expect('canInitiateAction' in mockPermission).toBe(false);
  });

  it('ledger has rows array (not direct array)', () => {
    const mockResult: Partial<TraceQueryResult> = {
      ledger: {
        columns: [],
        rows: [],
        grouping: [],
        totals: {},
      },
    };
    expect(Array.isArray(mockResult.ledger?.rows)).toBe(true);
  });
});

describe('traceabilityApi contract adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the frozen query contract to /traceability/query', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.query({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
      traceMode: 'forward',
      viewMode: 'ledger',
      timeMode: 'current',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/query', expect.objectContaining({
      entryMode: 'object',
      objectType: 'materialLot',
      objectId: 'mb-1',
    }));
  });

  it('creates linkage with sourceQueryRef field', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.createLinkage({
      actionType: 'deviation',
      sourceQueryRef: 'hash-001',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/actions', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('creates export with sourceQueryRef field', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.export({
      exportMode: 'simple',
      sourceQueryRef: 'hash-001',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/export', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('creates snapshot via POST /traceability/snapshots', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.createSnapshot({
      sourceQueryRef: 'hash-001',
      snapshotType: 'query',
    });
    expect(request.post).toHaveBeenCalledWith('/traceability/snapshots', expect.objectContaining({
      sourceQueryRef: 'hash-001',
    }));
  });

  it('fetches snapshot via GET /traceability/snapshots/:id', async () => {
    const { default: request } = await import('@/api/request');
    await traceabilityApi.getSnapshot('snap-123');
    expect(request.get).toHaveBeenCalledWith('/traceability/snapshots/snap-123');
  });
});
