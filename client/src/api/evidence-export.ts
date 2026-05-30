import request from './request';

export type EvidenceExportStatus = 'queued' | 'building' | 'ready' | 'failed' | 'expired';

export interface EvidenceExport {
  id: string;
  company_id: string;
  snapshot_id: string;
  batch_id: string | null;
  status: EvidenceExportStatus;
  template_version: string | null;
  export_file_path: string | null;
  readiness_status: 'complete' | 'incomplete';
  readiness_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface ExportFromSnapshotPayload {
  templateVersion?: string;
}

export interface ExportBatchPayload {
  maxDepth?: number;
}

export const evidenceExportApi = {
  getList(params?: { status?: EvidenceExportStatus; batch_id?: string }) {
    return request.get<EvidenceExport[]>('/traceability/evidence-exports', { params });
  },

  exportFromSnapshot(snapshotId: string, payload: ExportFromSnapshotPayload = {}) {
    return request.post<EvidenceExport>(`/traceability/snapshots/${snapshotId}/export`, payload);
  },

  exportBatch(batchId: string, payload: ExportBatchPayload = {}) {
    return request.post<EvidenceExport>(
      `/traceability/production-batches/${batchId}/evidence-export`,
      payload,
    );
  },

  previewBatch(batchId: string, payload: ExportBatchPayload = {}) {
    return request.post<EvidenceExport>(
      `/traceability/production-batches/${batchId}/trace-preview`,
      payload,
    );
  },

  download(exportId: string) {
    return request.get(`/traceability/evidence-exports/${exportId}/download`, {
      responseType: 'blob',
    });
  },
};
