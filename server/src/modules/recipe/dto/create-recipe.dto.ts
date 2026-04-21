import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeLineDto {
  @IsString()
  @IsNotEmpty()
  material_id: string;

  @IsNumber()
  @IsPositive()
  qty_per_batch: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsBoolean()
  is_critical?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsOptional()
  @IsString()
  version_note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  lines: RecipeLineDto[];
}
