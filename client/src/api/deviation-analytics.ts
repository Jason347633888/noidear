import request from './request';

export interface TrendData {
  date: string;
  count: number;
  rate: number;
}

export interface FieldDistribution {
  fieldName: string;
  count: number;
  percentage: number;
}

export interface WordCloudData {
  text: string;
  value: number;
}

export default {
  getTrend(params: {
    startDate: string;
    endDate: string;
    granularity: 'day' | 'week' | 'month';
  }): Promise<{ success: boolean; data: TrendData[] }> {
    return request.get('/deviation-analytics/trend', { params });
  },

  getFieldDistribution(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: FieldDistribution[] }> {
    return request.get('/deviation-analytics/field-distribution', { params });
  },

  getReasonWordCloud(): Promise<{
    success: boolean;
    data: WordCloudData[];
  }> {
    return request.get('/deviation-analytics/reason-wordcloud');
  },
};
