import request from './request';

// =========================================================================
// Types
// =========================================================================

export type RecordTemplateFieldType =
  | 'text' | 'textarea' | 'number'
  | 'date' | 'time' | 'datetime' | 'daterange' | 'timerange'
  | 'email' | 'phone' | 'url' | 'password'
  | 'boolean' | 'switch'
  | 'enum' | 'multi-enum' | 'select' | 'radio' | 'checkbox' | 'multiselect'
  | 'cascader' | 'slider' | 'rate' | 'color'
  | 'file' | 'image' | 'photo'
  | 'inspection-table'
  | 'table-input'
  | 'checklist'
  | 'signature'
  | 'entity-link'
  | 'richtext'
  | 'range-select'
  | 'constrained-number'
  | 'checkbox-text'
  | 'auto-username'
  | 'auto-date'
  | 'auto-display'
  | 'section-header'
  | 'static-content'
  | 'template-content'
  | 'location'
  | 'qrcode'
  | 'barcode'
  | 'tree';

export interface RecordTemplateField {
  name: string;
  label: string;
  type: RecordTemplateFieldType;
  required?: boolean;
  disabled?: boolean;
  unit?: string;
  defaultValue?: unknown;
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
  entity?: string;
  autoFill?: boolean;
  inspectionRows?: Array<{ item: string; standard: string }>;
  checklistItems?: string[];
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

  createRevision(id: string, payload: Partial<RecordTemplate>) {
    return request.post<RecordTemplate>(`/record-templates/${id}/revisions`, payload);
  },

  activateRevision(id: string) {
    return request.post<RecordTemplate>(`/record-templates/${id}/activate`);
  },
};

export interface TemplateTolerancePayload {
  rules: Array<{
    fieldKey: string;
    valueType: 'number' | 'date' | 'time';
    operator: 'between' | 'min' | 'max' | 'equals';
    min?: number;
    max?: number;
    unit?: string;
  }>;
  notes?: string;
}

export function getTemplateTolerance(templateId: string) {
  return request.get(`/record-templates/${templateId}/tolerance`);
}

export function updateTemplateTolerance(templateId: string, payload: TemplateTolerancePayload) {
  return request.put(`/record-templates/${templateId}/tolerance`, payload);
}
