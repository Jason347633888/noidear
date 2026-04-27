import request from './request';

export interface DocumentVersionItem {
  id: string;
  version: number;
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
    return request.get<{ versions: DocumentVersionItem[] }>(`/documents/${id}/versions`);
  },
  compareVersions(id: string, v1: number | string, v2: number | string) {
    return request.get<VersionCompareResult>(`/documents/${id}/versions/${v1}/compare/${v2}`);
  },
  rollbackVersion(id: string, version: number | string, reason: string) {
    return request.post(`/documents/${id}/versions/${version}/rollback`, { reason });
  },
  versionDownloadUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/download`;
  },
  versionPreviewUrl(id: string, version: number | string) {
    return `/api/v1/documents/${id}/versions/${version}/preview`;
  },
};
