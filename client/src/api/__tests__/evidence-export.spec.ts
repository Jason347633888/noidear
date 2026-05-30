import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import request from '@/api/request';
import { evidenceExportApi } from '@/api/evidence-export';

describe('evidenceExportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as any).mockResolvedValue({ data: [] });
    (request.post as any).mockResolvedValue({ data: {} });
  });

  it('calls GET /traceability/evidence-exports for list', async () => {
    await evidenceExportApi.getList();
    expect(request.get).toHaveBeenCalledWith('/traceability/evidence-exports', { params: undefined });
  });

  it('calls POST /traceability/snapshots/:id/export to create from snapshot', async () => {
    await evidenceExportApi.exportFromSnapshot('snap-1', { templateVersion: 'v1' });
    expect(request.post).toHaveBeenCalledWith(
      '/traceability/snapshots/snap-1/export',
      { templateVersion: 'v1' },
    );
  });

  it('calls POST /traceability/production-batches/:id/evidence-export for formal export', async () => {
    await evidenceExportApi.exportBatch('batch-1', { maxDepth: 3 });
    expect(request.post).toHaveBeenCalledWith(
      '/traceability/production-batches/batch-1/evidence-export',
      { maxDepth: 3 },
    );
  });

  it('calls GET /traceability/evidence-exports/:id/download to download', async () => {
    await evidenceExportApi.download('export-1');
    expect(request.get).toHaveBeenCalledWith(
      '/traceability/evidence-exports/export-1/download',
      { responseType: 'blob' },
    );
  });
});
