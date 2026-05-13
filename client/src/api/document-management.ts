import request from './request';

export interface DocumentRevisionItem {
  id: string;
  number: string;
  title: string;
  versionNo: number;
  versionLabel: string;
  status: string;
  revisionStatus?: string | null;
  revisionOfId?: string | null;
  superseded_by_id?: string | null;
  isCurrentVersion?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentVersionItem {
  id: string;
  version: number | string;
  documentVersionNo?: number;
  documentVersionLabel?: string;
  snapshotVersionLabel?: string;
  fileName: string;
  fileSize: string | number;
  createdAt: string;
  creator: { name: string } | null;
}

export interface VersionCompareResult {
  documentId: string;
  documentTitle: string;
  version1: Record<string, unknown>;
  version2: Record<string, unknown>;
  differences: Record<string, unknown>;
}

export const documentManagementApi = {
  getVersions(id: string) {
    return request.get<{ revisions: DocumentRevisionItem[]; versions: DocumentVersionItem[] }>(`/documents/${id}/versions`);
  },
  versionDownloadUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/download`;
  },
  versionPreviewUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/preview`;
  },
};
