import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export const RETAINED_SAMPLE_TYPES = ['product', 'material', 'packaging'] as const;
export type RetainedSampleType = (typeof RETAINED_SAMPLE_TYPES)[number];

export const RETAINED_SAMPLE_STATUSES = ['retained', 'disposed'] as const;

export class CreateRetainedSampleDto {
  @IsString()
  @IsNotEmpty()
  company_id!: string;

  @IsIn(RETAINED_SAMPLE_TYPES)
  sample_type!: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  material_batch_id?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsString()
  @IsNotEmpty()
  sample_code!: string;

  @IsNumber()
  sample_qty!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @Type(() => Date)
  retained_at!: Date;

  @IsOptional()
  @IsString()
  @Matches(/^\d+(d|w|m|y)$/, {
    message: 'retention_period must match format <number><d|w|m|y> e.g. "90d", "6m"',
  })
  retention_period?: string;

  @IsOptional()
  @Type(() => Date)
  expires_at?: Date;

  @IsOptional()
  @IsString()
  storage_condition?: string;

  @IsOptional()
  @IsString()
  storage_area_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appeared_in_source_forms?: string[];

  @IsOptional()
  @IsString()
  source_form_version?: string;

  @IsOptional()
  @IsString()
  source_form_field_group?: string;
}

export class DisposeRetainedSampleDto {
  @IsString()
  @IsNotEmpty()
  disposal_action!: string;

  @Type(() => Date)
  disposed_at!: Date;
}

export class ListRetainedSamplesDto {
  @IsOptional()
  @IsString()
  company_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsIn(RETAINED_SAMPLE_TYPES)
  sample_type?: string;

  @IsOptional()
  @IsIn(RETAINED_SAMPLE_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsString()
  material_batch_id?: string;
}
