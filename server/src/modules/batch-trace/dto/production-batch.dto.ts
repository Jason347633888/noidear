import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

enum ProductionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateProductionBatchDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsString()
  @IsOptional()
  recipeId?: string;

  @IsString()
  @IsOptional()
  recipeName?: string;

  @IsNumber()
  @Min(0)
  plannedQuantity: number;

  @Type(() => Date)
  @IsDate()
  productionDate: Date;
}

export class UpdateProductionBatchDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  actualQuantity?: number;

  @IsEnum(ProductionStatus)
  @IsOptional()
  status?: ProductionStatus;
}

export class QueryProductionBatchDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Min(1)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
