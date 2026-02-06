import request from './request';

export default {
  findAll(type: string, page: number, limit: number, keyword?: string) {
    return request.get(`/recycle-bin/${type}`, {
      params: { page, limit, keyword },
    });
  },

  restore(type: string, id: string) {
    return request.post(`/recycle-bin/${type}/${id}/restore`);
  },

  permanentDelete(type: string, id: string) {
    return request.delete(`/recycle-bin/${type}/${id}`);
  },

  batchRestore(type: string, ids: string[]) {
    return request.post(`/recycle-bin/${type}/batch-restore`, { ids });
  },

  batchPermanentDelete(type: string, ids: string[]) {
    return request.delete(`/recycle-bin/${type}/batch-delete`, { data: { ids } });
  },
};
