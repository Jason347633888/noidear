import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateLineChangeCheckRecordDto {
  @IsOptional()
  @IsDateString()
  check_date?: string;

  @IsOptional()
  @IsString()
  production_line?: string;

  @IsOptional()
  @IsString()
  product_from?: string;

  @IsOptional()
  @IsString()
  product_to?: string;

  @IsOptional()
  @IsBoolean()
  allergen_cleared?: boolean;

  @IsOptional()
  @IsBoolean()
  equipment_cleaned?: boolean;

  @IsOptional()
  @IsBoolean()
  utensils_replaced?: boolean;

  @IsOptional()
  @IsBoolean()
  labels_updated?: boolean;

  @IsOptional()
  @IsBoolean()
  packaging_cleared?: boolean;

  @IsOptional()
  @IsBoolean()
  raw_materials_cleared?: boolean;

  @IsOptional()
  @IsString()
  inspector_id?: string;

  @IsOptional()
  @IsBoolean()
  supervisor_ok?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
