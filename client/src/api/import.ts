import request from './request';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export const importApi = {
  importDocuments(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/import/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  importUsers(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return request.post('/import/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
