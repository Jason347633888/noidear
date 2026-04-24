import request from './request';
import type { TraceQueryPayload, TraceQueryResult } from '@/types/traceability';

export const traceabilityApi = {
  query(payload: TraceQueryPayload) {
    return request.post<TraceQueryResult>('/traceability/query', payload);
  },
  graph(payload: TraceQueryPayload) {
    return request.post<TraceQueryResult>('/traceability/query/graph', { ...payload, viewMode: 'graph' });
  },
  materialBalance(payload: { materialLotId?: string; productionBatchId?: string; from?: string; to?: string }) {
    return request.post('/traceability/balance', payload);
  },
  createLinkage(payload: { actionType: string; sourceQueryHash: string; note?: string }) {
    return request.post('/traceability/actions', payload);
  },
  export(payload: { exportMode: 'simple' | 'fullPackage'; sourceQueryHash: string }) {
    return request.post('/traceability/export', payload);
  },
};
