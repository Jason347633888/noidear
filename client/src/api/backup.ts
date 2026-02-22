import request from './request';

export interface BackupRecord {
  id: string;
  backupType: 'postgres' | 'minio';
  filePath: string;
  fileSize: number;
  status: 'running' | 'success' | 'failed';
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface QueryBackupParams {
  page?: number;
  limit?: number;
  backupType?: 'postgres' | 'minio';
  status?: 'running' | 'success' | 'failed';
  startTime?: string;
  endTime?: string;
}

// 手动触发 PostgreSQL 备份
export const triggerPostgresBackup = () => {
  return request.post<{ backupId: string }>('/backup/postgres/trigger');
};

// 手动触发 MinIO 备份
export const triggerMinIOBackup = () => {
  return request.post<{ backupId: string }>('/backup/minio/trigger');
};

// 查询备份历史
export const queryBackupHistory = (params: QueryBackupParams) => {
  return request.get<{ items: BackupRecord[]; total: number }>('/backup/history', { params });
};

// 查询可用备份（用于恢复）
export const getAvailableBackups = () => {
  return request.get<BackupRecord[]>('/backup/available');
};

// 删除备份
export const deleteBackup = (id: string) => {
  return request.delete(`/backup/${id}`);
};

// 获取备份状态
export const getBackupStatus = (id: string) => {
  return request.get<BackupRecord>(`/backup/${id}/status`);
};
