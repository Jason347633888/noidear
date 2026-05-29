import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class InspectionResultDto {
  @IsString()
  item_name: string;

  @IsOptional()
  @IsString()
  actual_value?: string;

  @IsBoolean()
  is_pass: boolean;
}

export class CreateInspectionDto {
  @IsString()
  @IsNotEmpty()
  material_inbound_item_id: string;

  @IsString()
  overall_result: string; // 'pass'|'fail'|'conditional_pass'

  @IsOptional()
  @IsBoolean()
  is_final?: boolean;

  @IsOptional()
  @IsNumber()
  sample_qty?: number;

  @IsOptional()
  @IsString()
  sample_unit?: string;

  @IsOptional()
  @IsString()
  disposition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionResultDto)
  results: InspectionResultDto[];
}
