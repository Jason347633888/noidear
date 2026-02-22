import request from './request';

export interface SearchQuery {
  keyword: string;
  type?: string;
  department?: string;
  tags?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date';
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  highlight: string;
  type: string;
  department: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  page: number;
  limit: number;
}

export default {
  query(params: SearchQuery): Promise<SearchResponse> {
    return request.get('/search/query', { params });
  },

  indexDocument(documentId: string): Promise<void> {
    return request.post(`/search/index/${documentId}`);
  },

  deleteIndex(documentId: string): Promise<void> {
    return request.delete(`/search/index/${documentId}`);
  },
};
