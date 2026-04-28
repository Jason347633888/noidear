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

  @IsString()
  @IsNotEmpty()
  area_id: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * NOTE: `is_allergen` is not yet present in the Prisma schema (`recipe_lines` table).
   * The field is accepted here for forward-compatibility with the spec, but it is
   * intentionally excluded before the Prisma create call in RecipeService.create().
   */
  @IsOptional()
  @IsBoolean()
  is_allergen?: boolean;
}

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  /**
   * NOTE: `name` is not yet present in the Prisma schema (`recipes` table).
   * The field is accepted here for forward-compatibility with the spec, but it is
   * intentionally excluded before the Prisma create call in RecipeService.create().
   */
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  version_note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  lines: RecipeLineDto[];
}
