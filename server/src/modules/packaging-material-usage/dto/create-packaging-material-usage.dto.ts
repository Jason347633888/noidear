import { IsString, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePackagingMaterialUsageDto {
  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsOptional()
  @IsString()
  material_name?: string;

  @IsOptional()
  @IsString()
  material_code?: string;

  @IsOptional()
  @IsString()
  production_batch_id?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  used_weight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  waste_weight?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  usage_date?: string;

  @IsOptional()
  @IsString()
  operator_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
