import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface ReleaseBlocker {
  type: string;
  message: string;
}

export interface ReleaseReadiness {
  ready: boolean;
  blockers: ReleaseBlocker[];
}

export interface ReleasedBatch {
  id: string;
  batchNumber: string;
  released_at: string;
  released_by_id: string | null;
}

// =========================================================================
// API
// =========================================================================

export const batchReleaseApi = {
  getReleaseReadiness(batchId: string) {
    return request.post<ReleaseReadiness>(
      `/batch-trace/production-batches/${batchId}/release-readiness`,
    );
  },

  releaseBatch(batchId: string) {
    return request.post<ReleasedBatch>(
      `/batch-trace/production-batches/${batchId}/release`,
    );
  },
};

export default batchReleaseApi;
