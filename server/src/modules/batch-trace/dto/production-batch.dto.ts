import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsNumber,
  IsEnum,
  IsDateString,
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
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  recipeId: string;

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

export class ConfirmProductBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @IsNumber()
  @Min(0.000001)
  actualQuantity!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsDateString()
  productionDate!: string;

  @IsDateString()
  packagedAt!: string;

  @IsDateString()
  warehousedAt!: string;

  @IsString()
  @IsNotEmpty()
  packageMachine!: string;

  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsNotEmpty()
  shiftTypeId!: string;
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
