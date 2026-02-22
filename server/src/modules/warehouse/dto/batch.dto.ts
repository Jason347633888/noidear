import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsString()
  @IsNotEmpty()
  materialId: string;

  @IsString()
  @IsOptional()
  supplierBatchNo?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @Type(() => Date)
  @IsDate()
  productionDate: Date;

  @Type(() => Date)
  @IsDate()
  expiryDate: Date;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  warehouseLocation?: string;
}

export class UpdateBatchDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  quantity?: number;

  @IsString()
  @IsOptional()
  warehouseLocation?: string;

  @IsString()
  @IsOptional()
  barcode?: string;
}

export class QueryBatchDto {
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
  materialId?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
