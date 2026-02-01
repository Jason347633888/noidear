// 模板相关类型

export type TemplateFieldType =
  | 'text'       // 文本
  | 'textarea'   // 长文本
  | 'number'     // 数值
  | 'date'       // 日期
  | 'select'     // 下拉选择
  | 'boolean';   // 是/否

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string | number }[]; // 用于 select
  sort: number;
}

export interface Template {
  id: string;
  level: number;
  number: string;
  title: string;
  fieldsJson: TemplateField[];
  version: number;
  status: 'active' | 'inactive';
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateTemplateDTO {
  level: number;
  title: string;
  fields: TemplateField[];
}

export interface UpdateTemplateDTO {
  title?: string;
  fields?: TemplateField[];
}

export interface TemplateListParams {
  page: number;
  limit: number;
  keyword?: string;
  status?: string;
}

export interface TemplateListResponse {
  list: Template[];
  total: number;
  page: number;
  limit: number;
}

export interface ParseExcelDTO {
  file: File;
}

export interface CopyTemplateDTO {
  templateId: string;
}
