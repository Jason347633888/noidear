import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum StagingStocktakeKind {
  shift_start = 'shift_start',
  shift_end = 'shift_end',
  handover = 'handover',
}

export class StageMaterialToAreaDto {
  @IsString() @IsNotEmpty() batchId!: string;
  @IsString() @IsNotEmpty() areaId!: string;
  @IsNumber() @Min(0.000001) quantity!: number;
  @IsOptional() @IsString() operatorId?: string;
}

export class ConfirmStocktakeDto {
  @IsString() @IsNotEmpty() areaId!: string;
  @IsString() @IsNotEmpty() batchId!: string;
  @IsEnum(StagingStocktakeKind) kind!: StagingStocktakeKind;
  @IsDateString() workDate!: string;
  @IsString() @IsNotEmpty() shiftTypeId!: string;
  @IsNumber() @Min(0) actualQuantity!: number;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional()
  @IsString()
  operatorId?: string;
}

export class ListStockDto {
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() materialId?: string;
}

export class AreaStocktakeItemDto {
  @IsString() @IsNotEmpty() batchId!: string;
  @IsNumber() @Min(0) actualQuantity!: number;
  @IsOptional() @IsString() note?: string;
}

export class ConfirmAreaStocktakeDto {
  @IsString() @IsNotEmpty() areaId!: string;
  @IsDateString() workDate!: string;
  @IsString() @IsNotEmpty() shiftTypeId!: string;
  @IsEnum(StagingStocktakeKind) kind!: StagingStocktakeKind;
  @IsOptional() @IsString() teamId?: string;
  @IsOptional() @IsString() operatorId?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaStocktakeItemDto)
  items!: AreaStocktakeItemDto[];
}
