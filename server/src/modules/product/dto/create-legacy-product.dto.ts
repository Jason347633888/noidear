import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class LegacyProductRecipeLineDto {
  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsNumber()
  @IsPositive()
  qty_per_batch: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsBoolean()
  @IsOptional()
  is_critical?: boolean;

  @IsString()
  @IsNotEmpty()
  area_id: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateLegacyProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegacyProductRecipeLineDto)
  lines: LegacyProductRecipeLineDto[];
}
