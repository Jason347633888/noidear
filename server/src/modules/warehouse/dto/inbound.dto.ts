import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsDate,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInboundItemDto {
  @IsString()
  @IsNotEmpty()
  materialId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  supplierBatchNo?: string;

  @Type(() => Date)
  @IsDate()
  productionDate: Date;

  @Type(() => Date)
  @IsDate()
  expiryDate: Date;
}

export class CreateInboundDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInboundItemDto)
  items: CreateInboundItemDto[];

  @IsString()
  @IsOptional()
  remark?: string;
}

export class QueryInboundDto {
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
  supplierId?: string;
}
