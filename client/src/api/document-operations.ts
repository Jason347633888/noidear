import request from './request';

export const documentOperationsApi = {
  getReadStatus(documentId: string) {
    return request.get(`/documents/${documentId}/read-status`);
  },
  createReadRequirement(documentId: string, payload: Record<string, unknown>) {
    return request.post(`/documents/${documentId}/read-requirements`, payload);
  },
  listTrainingNeeds(status?: string) {
    return request.get('/documents/control/training-needs', { params: { status } });
  },
  suggestTrainingNeed(documentId: string) {
    return request.post(`/documents/${documentId}/training-needs/suggest`);
  },
  acceptTrainingNeed(id: string) {
    return request.post(`/documents/control/training-needs/${id}/accept`);
  },
  dismissTrainingNeed(id: string, reason: string) {
    return request.post(`/documents/control/training-needs/${id}/dismiss`, { reason });
  },
  linkTrainingNeed(id: string, linkedTrainingProjectId: string) {
    return request.post(`/documents/control/training-needs/${id}/link`, { linkedTrainingProjectId });
  },
  getAuditCoverage(params: { periodStart: string; periodEnd: string }) {
    return request.get('/documents/control/audit-coverage', { params });
  },
  createImpactReview(payload: Record<string, unknown>) {
    return request.post('/documents/control/impact-reviews', payload);
  },
  updateImpactItem(id: string, payload: Record<string, unknown>) {
    return request.patch(`/documents/control/impact-items/${id}`, payload);
  },
  getHealth(days = 30) {
    return request.get('/documents/control/health', { params: { days } });
  },
  getAuditChain(params: { sourceType: string; sourceId: string; maxDepth?: number }) {
    return request.get('/documents/control/audit-chain', { params });
  },
};
