import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductionPlanItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsString()
  recipeId?: string;

  @IsNumber()
  plannedQty!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}

export class CreateProductionPlanDto {
  @IsString()
  @IsNotEmpty()
  planNo!: string;

  @IsDateString()
  planDate!: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductionPlanItemDto)
  items!: CreateProductionPlanItemDto[];
}
