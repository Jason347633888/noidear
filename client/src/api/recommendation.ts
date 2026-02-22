import request from './request';

export interface RecommendedDocument {
  id: string;
  title: string;
  type: string;
  department: string;
  updatedAt: string;
  score: number;
  reason: string;
}

export default {
  getMyRecommendations(): Promise<RecommendedDocument[]> {
    return request.get('/recommendations/my');
  },

  trackView(documentId: string, duration: number): Promise<void> {
    return request.post('/recommendations/track', { documentId, duration });
  },
};
