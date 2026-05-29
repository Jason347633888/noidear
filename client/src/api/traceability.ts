import request from './request';
import type {
  BalanceQueryRequest,
  BalanceQueryResult,
  ExportCreateRequest,
  LinkageCreateRequest,
  SnapshotCreateRequest,
  TraceActionResult,
  TraceExportResult,
  TraceQueryRequest,
  TraceQueryResult,
  TraceSnapshotResult,
} from '@/types/traceability';

export const traceabilityApi = {
  query(payload: TraceQueryRequest) {
    return request.post<TraceQueryResult>('/traceability/query', payload);
  },
  graph(payload: TraceQueryRequest) {
    return request.post<TraceQueryResult>('/traceability/query/graph', { ...payload, viewMode: 'graph' });
  },
  materialBalance(payload: BalanceQueryRequest) {
    return request.post<BalanceQueryResult>('/traceability/balance', payload);
  },
  createLinkage(payload: LinkageCreateRequest) {
    return request.post<TraceActionResult>('/traceability/actions', payload);
  },
  export(payload: ExportCreateRequest) {
    return request.post<TraceExportResult>('/traceability/export', payload);
  },
  createSnapshot(payload: SnapshotCreateRequest) {
    return request.post<TraceSnapshotResult>('/traceability/snapshots', payload);
  },
  getSnapshot(snapshotId: string) {
    return request.get<TraceSnapshotResult>(`/traceability/snapshots/${snapshotId}`);
  },
  getSnapshotResult(snapshotId: string) {
    return request.get(`/traceability/snapshots/${snapshotId}/result`);
  },

  // ── Task 9: bounded trace-context snapshot + evidence export ──────────────

  // Always creates a fresh trace-context snapshot (+ EvidenceExport when ready).
  createTraceSnapshot(payload: TraceContextSnapshotRequest) {
    return request.post<TraceContextSnapshotResult>('/traceability/trace-snapshots', payload);
  },
  // One-click: build snapshot and (when ready) an EvidenceExport for a batch.
  exportProductionBatchEvidence(productionBatchId: string, payload: TraceContextDepthOptions = {}) {
    return request.post<TraceContextSnapshotResult>(
      `/traceability/production-batches/${productionBatchId}/evidence-export`,
      payload,
    );
  },
  // Preview (never creates an EvidenceExport).
  previewProductionBatchTrace(productionBatchId: string, payload: TraceContextDepthOptions = {}) {
    return request.post<TraceContextSnapshotResult>(
      `/traceability/production-batches/${productionBatchId}/trace-preview`,
      payload,
    );
  },
  // Advanced page: create an EvidenceExport from an existing complete snapshot.
  exportTraceEvidence(snapshotId: string, payload: { templateVersion?: string } = {}) {
    return request.post(`/traceability/snapshots/${snapshotId}/export`, payload);
  },
  // Re-download an existing EvidenceExport without recomputing it.
  downloadEvidenceExport(exportId: string) {
    return request.get(`/traceability/evidence-exports/${exportId}/download`, {
      responseType: 'blob',
    });
  },
};

export interface TraceContextDepthOptions {
  maxDepth?: number;
}

export interface TraceContextSnapshotRequest extends TraceContextDepthOptions {
  rootObjectType: 'production_batch';
  rootObjectId: string;
}

export interface TraceContextSnapshotResult {
  id: string;
  rootObjectType: string;
  rootObjectId: string;
  readinessStatus: 'complete' | 'incomplete';
  snapshotPurpose: 'evidence_export' | 'preview';
  readinessReasons: string[];
  evidenceExportId: string | null;
  snapshotData: unknown;
}
