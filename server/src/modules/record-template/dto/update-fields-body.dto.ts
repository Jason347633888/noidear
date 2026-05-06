import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType, FieldType } from '../types/fields-json.types';

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'number',
  'date', 'time', 'datetime', 'daterange', 'timerange',
  'email', 'phone', 'url', 'password',
  'boolean', 'switch',
  'enum', 'multi-enum', 'select', 'radio', 'checkbox', 'multiselect',
  'cascader', 'slider', 'rate', 'color',
  'file', 'image', 'photo',
  'inspection-table',
  'table-input',
  'checklist',
  'signature',
  'entity-link',
  'richtext',
  'range-select',
  'constrained-number',
  'checkbox-text',
  'auto-username',
  'auto-date',
  'auto-display',
  'section-header',
  'static-content',
  'template-content',
  'approval-step',
  'location',
  'qrcode',
  'barcode',
  'tree',
];

export class FieldOptionDto {
  @IsString()
  label: string;

  @IsString()
  value: string;
}

export class FieldDefDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsString()
  @IsIn(VALID_FIELD_TYPES)
  type: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Allow()
  defaultValue?: unknown;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  patternMessage?: string;

  @IsOptional()
  @IsBoolean()
  autoFill?: boolean;

  @IsOptional()
  @IsString()
  entity?: EntityType;

  @IsOptional()
  @IsArray()
  inspectionRows?: Array<{ item: string; standard: string }>;

  @IsOptional()
  @IsArray()
  checklistItems?: string[];

  /** tolerance is an object - validated loosely to avoid over-constraint on designer metadata */
  @IsOptional()
  @IsObject()
  tolerance?: { type: 'range' | 'percentage'; min: number; max: number };
}

export class UpdateFieldsBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefDto)
  fields: FieldDefDto[];
}
