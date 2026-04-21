import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface RecordTemplateField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  tolerance?: {
    type: 'range' | 'percentage';
    min: number;
    max: number;
  };
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  pattern?: string;
  patternMessage?: string;
}

export interface RecordTemplate {
  id: string;
  name: string;
  description?: string;
  deviationEnabled?: boolean;
  fieldsJson: {
    fields: RecordTemplateField[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecordTemplateListResponse {
  list: RecordTemplate[];
  total: number;
}

// =========================================================================
// API
// =========================================================================

export const recordTemplateApi = {
  getList(params?: { page?: number; limit?: number }) {
    return request.get<RecordTemplateListResponse>('/record-templates', { params });
  },

  getById(id: string) {
    return request.get<RecordTemplate>(`/record-templates/${id}`);
  },

  updateFields(id: string, fields: RecordTemplateField[]) {
    return request.put<RecordTemplate>(`/record-templates/${id}/fields`, { fields });
  },
};
