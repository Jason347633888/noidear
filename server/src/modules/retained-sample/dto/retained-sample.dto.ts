export interface CreateRetainedSampleDto {
  company_id: string;
  sample_type: string;
  product_id?: string;
  material_batch_id?: string;
  production_batch_id?: string;
  sample_code: string;
  sample_qty: number;
  unit: string;
  retained_at: Date;
  retention_period?: string;
  expires_at?: Date;
  storage_condition?: string;
  storage_area_id?: string;
  appeared_in_source_forms?: string[];
  source_form_version?: string;
  source_form_field_group?: string;
}

export interface DisposeRetainedSampleDto {
  disposal_action: string;
  disposed_at: Date;
}

export interface ListRetainedSamplesDto {
  company_id: string;
  page?: number;
  limit?: number;
  sample_type?: string;
  status?: string;
  production_batch_id?: string;
  material_batch_id?: string;
}
