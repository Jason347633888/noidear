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
};
